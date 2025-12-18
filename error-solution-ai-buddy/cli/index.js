#!/usr/bin/env node

/**
 * Error Solution AI Buddy - CLI Entry Point
 * 
 * This is the main entry point for the CLI tool.
 * It wraps commands (node, npm, java, dotnet) and intercepts errors.
 * 
 * Usage: errbuddy <command> [args]
 * Example: errbuddy node app.js
 *          errbuddy npm start
 *          errbuddy java MyApp
 *          errbuddy dotnet run
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import { ErrorListener } from './error-listener.js';
import { Formatter } from './formatter.js';
import { AIService } from '../backend/src/ai/ollama-service.js';
import chalk from 'chalk';

const program = new Command();

// Configuration
const CONFIG = {
  aiEnabled: true,
  ollamaModel: 'llama3.2',  // Good balance of speed and quality
  ollamaUrl: 'http://localhost:11434',
  showSpinner: true,
  maxErrorLength: 2000,  // Truncate very long errors
};

program
  .name('errbuddy')
  .description('AI-powered error explanations directly in your terminal')
  .version('1.0.0')
  .argument('<command>', 'Command to run (node, npm, java, dotnet, etc.)')
  .argument('[args...]', 'Arguments to pass to the command')
  .option('--no-ai', 'Disable AI explanations (show errors only)')
  .option('--model <model>', 'Ollama model to use', 'llama3.2')
  .option('--offline', 'Force offline mode (pattern matching only)')
  .action(async (command, args, options) => {
    await runCommand(command, args, options);
  });

// Help command with examples
program
  .command('examples')
  .description('Show usage examples')
  .action(() => {
    console.log(chalk.cyan('\n📚 Error Buddy Examples:\n'));
    console.log('  ' + chalk.green('errbuddy node app.js'));
    console.log('  ' + chalk.gray('→ Run Node.js app and explain any errors\n'));
    console.log('  ' + chalk.green('errbuddy npm start'));
    console.log('  ' + chalk.gray('→ Run npm script with error explanations\n'));
    console.log('  ' + chalk.green('errbuddy java MyClass'));
    console.log('  ' + chalk.gray('→ Run Java program with error explanations\n'));
    console.log('  ' + chalk.green('errbuddy dotnet run'));
    console.log('  ' + chalk.gray('→ Run .NET project with error explanations\n'));
    console.log('  ' + chalk.green('errbuddy --no-ai node app.js'));
    console.log('  ' + chalk.gray('→ Run without AI (pattern matching only)\n'));
  });

// Config command
program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    console.log(chalk.cyan('\n⚙️  Current Configuration:\n'));
    console.log(`  AI Enabled:    ${CONFIG.aiEnabled ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`  Ollama Model:  ${chalk.yellow(CONFIG.ollamaModel)}`);
    console.log(`  Ollama URL:    ${chalk.gray(CONFIG.ollamaUrl)}`);
    console.log('');
  });

/**
 * Main function that runs the wrapped command
 * 
 * WHY we use spawn() instead of exec():
 * - spawn() streams output in real-time (better UX)
 * - exec() buffers everything (user waits too long)
 */
async function runCommand(command, args, options) {
  const formatter = new Formatter();
  const errorListener = new ErrorListener();
  const aiService = new AIService(CONFIG.ollamaUrl, options.model || CONFIG.ollamaModel);

  // Check if Ollama is available (non-blocking)
  let ollamaAvailable = false;
  if (!options.offline && options.ai !== false) {
    ollamaAvailable = await aiService.checkConnection();
    if (!ollamaAvailable) {
      console.log(chalk.yellow('⚠️  Ollama not detected. Using pattern matching only.'));
      console.log(chalk.gray('   Run "ollama serve" to enable AI explanations.\n'));
    }
  }

  // Spawn the child process
  // stdio: ['inherit', 'pipe', 'pipe'] means:
  // - stdin: inherited (user can type input)
  // - stdout: piped (we capture and forward it)
  // - stderr: piped (we capture, analyze, then forward it)
  const child = spawn(command, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,  // Required for Windows compatibility
    env: { ...process.env, FORCE_COLOR: '1' }  // Preserve colors
  });

  let stderrBuffer = '';
  let errorDetected = false;

  // Forward stdout immediately (no delay)
  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  // Capture and analyze stderr
  child.stderr.on('data', (data) => {
    const text = data.toString();
    
    // Always show the original error first
    process.stderr.write(data);
    
    // Buffer stderr for analysis
    stderrBuffer += text;
    
    // Check if this looks like an error
    if (errorListener.detectError(text)) {
      errorDetected = true;
    }
  });

  // When process ends, analyze collected errors
  child.on('close', async (exitCode) => {
    if (errorDetected && stderrBuffer.trim()) {
      // Analyze the error
      const analysis = errorListener.analyzeError(stderrBuffer);
      
      if (analysis.isError) {
        console.log(''); // Blank line for readability
        
        // Try AI explanation if available
        if (ollamaAvailable && options.ai !== false) {
          await explainWithAI(stderrBuffer, analysis, aiService, formatter);
        } else {
          // Fall back to pattern-based explanation
          formatter.printPatternExplanation(analysis);
        }
      }
    }
    
    // Exit with the same code as the child process
    process.exit(exitCode);
  });

  // Handle spawn errors (command not found, etc.)
  child.on('error', (err) => {
    console.error(chalk.red(`\n❌ Failed to run command: ${command}`));
    console.error(chalk.gray(`   ${err.message}`));
    
    if (err.code === 'ENOENT') {
      console.error(chalk.yellow(`\n💡 Tip: Make sure "${command}" is installed and in your PATH.`));
    }
    
    process.exit(1);
  });
}

/**
 * Get AI explanation for an error
 */
async function explainWithAI(errorText, analysis, aiService, formatter) {
  const ora = (await import('ora')).default;
  const spinner = ora({
    text: 'Getting AI explanation...',
    color: 'cyan'
  }).start();

  try {
    // Sanitize the error before sending to AI
    const sanitizedError = sanitizeError(errorText);
    
    const explanation = await aiService.explainError(sanitizedError, analysis.language);
    spinner.stop();
    
    formatter.printAIExplanation(explanation);
  } catch (err) {
    spinner.stop();
    console.log(chalk.yellow('⚠️  AI explanation failed. Showing pattern-based help:'));
    formatter.printPatternExplanation(analysis);
  }
}

/**
 * Sanitize error text before sending to AI
 * 
 * WHY: Privacy protection - we don't want to leak:
 * - File paths (might contain project names, usernames)
 * - Environment variables
 * - API keys that might appear in errors
 */
function sanitizeError(errorText) {
  let sanitized = errorText;
  
  // Remove Windows-style absolute paths (C:\Users\...)
  sanitized = sanitized.replace(/[A-Za-z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*/g, '[path]\\');
  
  // Remove Unix-style absolute paths (/home/user/...)
  sanitized = sanitized.replace(/\/(?:home|Users|var|usr|opt)\/[^\s:]+/g, '[path]');
  
  // Remove common secret patterns
  sanitized = sanitized.replace(/(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi, '[REDACTED]');
  
  // Truncate if too long
  if (sanitized.length > CONFIG.maxErrorLength) {
    sanitized = sanitized.substring(0, CONFIG.maxErrorLength) + '\n... (truncated)';
  }
  
  return sanitized;
}

// Run the CLI
program.parse();
