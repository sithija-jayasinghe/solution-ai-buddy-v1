# Error → Solution AI Buddy 🤖

> AI-powered error explanations directly in your terminal. No context switching!

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Ollama](https://img.shields.io/badge/AI-Ollama-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## The Problem

You're coding. An error appears. You:
1. Copy the error
2. Open browser
3. Paste into Google/ChatGPT
4. Read through results
5. Go back to terminal
6. Forget what you were doing

**That's 5+ context switches. We fix that.**

## The Solution

```bash
$ errbuddy node app.js

TypeError: Cannot read properties of undefined (reading 'map')
    at app.js:12:5

╭─ 🤖 Error Buddy Explanation: ─────────────────────────────────────╮
│                                                                    │
│  📘 What is this?                                                 │
│  You tried to use `.map()` on a variable that is undefined.       │
│                                                                    │
│  ❓ Why it happens?                                                │
│  The data you expected (probably from an API) wasn't available.   │
│                                                                    │
│  ✅ How to fix it:                                                 │
│  Check if the variable exists before calling `.map()`.            │
│                                                                    │
│  💡 Example:                                                       │
│    if (data) {                                                     │
│      data.map(...)                                                 │
│    }                                                               │
│                                                                    │
╰────────────────────────────────────────────────────────────────────╯
```

## Quick Start

### One-Command Setup (Recommended)

```bash
# Windows PowerShell (run as Administrator)
.\setup.ps1

# macOS/Linux
chmod +x setup.sh && ./setup.sh
This will:
1. ✅ Install dependencies
2. ✅ Make `errbuddy` available globally
### Manual Setup

#### Step 1: Install Ollama (Optional - for AI features)

```bash
# Windows: Download from https://ollama.ai

# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Start Ollama & Download Model

```bash
ollama serve   # Start the server (keep this running)
ollama pull llama3.2   # Download the model (~2GB)
```
### 3. Install Error Buddy

```bash
# From this directory
npm install
npm link   # Makes 'errbuddy' available globally
```

### 4. Use It!

```bash
# Instead of: node app.js
errbuddy node app.js

# Instead of: npm start
errbuddy npm start

# Instead of: java MyApp
errbuddy java MyApp

# Instead of: dotnet run
errbuddy dotnet run
```

## Supported Languages

| Language | Status | Error Types |
|----------|--------|-------------|
| JavaScript/Node.js | ✅ Full | TypeError, ReferenceError, SyntaxError, Module errors |
| Java | ✅ Full | NullPointer, ArrayIndex, ClassNotFound, Compile errors |
| C#/.NET | ✅ Full | NullReference, Index, CS errors, Runtime exceptions |

## CLI Options

```bash
# Disable AI (use pattern matching only)
errbuddy --no-ai node app.js

# Use a different Ollama model
errbuddy --model codellama node app.js

# Force offline mode
errbuddy --offline node app.js

# Show examples
errbuddy examples

# Show configuration
errbuddy config
```

## How It Works

```
┌─────────────────────────────────────────┐
│  You run: errbuddy node app.js          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  CLI spawns: node app.js                │
│  • stdout → displayed normally          │
│  • stderr → captured for analysis       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Error Detector                         │
│  • Detects language (JS/Java/C#)        │
│  • Extracts error type, file, line      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Ollama AI (local)                      │
│  • Receives sanitized error             │
│  • Returns structured explanation       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Pretty Terminal Output                 │
│  • WHAT / WHY / FIX / EXAMPLE           │
└─────────────────────────────────────────┘
```

## Privacy & Security

Your code **never leaves your machine**:

- ✅ Ollama runs 100% locally
- ✅ File paths are stripped before AI processing
- ✅ No telemetry or analytics
- ✅ No API keys required
- ✅ Works completely offline

## Project Structure

```
error-solution-ai-buddy/
├── cli/
│   ├── index.js           # CLI entry point
│   ├── error-listener.js  # Error detection & patterns
│   └── formatter.js       # Terminal output formatting
├── backend/
│   └── src/
│       ├── ai/
│       │   └── ollama-service.js  # Ollama integration
│       └── services/
│           └── history-service.js # Error history (SQLite)
├── docs/
│   ├── architecture.md    # System design
│   ├── decisions.md       # Why we made these choices
│   └── terminal-integration.md
├── tests/
│   └── *.test.js
├── package.json
└── README.md
```

## Configuration

Configuration is stored in `~/.errbuddy/config.json`:

```json
{
  "ollamaUrl": "http://localhost:11434",
  "model": "llama3.2",
  "showSpinner": true,
  "saveHistory": true
}
```

## Troubleshooting

### "Ollama not detected"

1. Make sure Ollama is running: `ollama serve`
2. Check it's accessible: `curl http://localhost:11434/api/tags`
3. Pull a model: `ollama pull llama3.2`

### "AI explanation timed out"

- Try a smaller model: `errbuddy --model llama3.2:1b node app.js`
- Check system resources (Ollama needs ~4GB RAM)

### Command not found after `npm link`

- On Windows: Restart your terminal
- On macOS/Linux: Check your PATH includes npm global bin

## Contributing

1. Fork the repo
2. Create a feature branch
3. Submit a PR

## License

MIT © 2024
