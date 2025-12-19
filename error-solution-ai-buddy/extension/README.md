# Error Buddy VS Code Extension

🤖 **AI-powered error explanations directly in your VS Code terminal!**

This extension automatically detects errors when you run commands in the terminal and provides instant, beginner-friendly explanations using local AI.

## Features

- **🔍 Auto-Detect Errors**: Automatically detects errors when commands fail
- **🤖 AI Explanations**: Uses local Ollama for private, offline-capable explanations
- **⚡ Instant**: No context switching - explanations appear right in VS Code
- **🔒 Private**: All AI processing happens locally on your machine
- **🎯 Multi-Language**: Supports JavaScript, Java, and C#

## Requirements

- **VS Code 1.93+** (for Shell Integration API)
- **Ollama** installed locally (https://ollama.com)
- An AI model pulled in Ollama (e.g., `qwen2.5:0.5b`)

### Install Ollama

1. Download from https://ollama.com/download
2. Install and run Ollama
3. Pull a model:
   ```bash
   ollama pull qwen2.5:0.5b
   ```

## Usage

### Automatic Mode (Default)

1. Run any command in the VS Code terminal
2. If an error occurs, Error Buddy automatically explains it
3. The explanation appears in a side panel

### Manual Mode

- **Ctrl+Shift+E** / **Cmd+Shift+E**: Explain selected text
- **Ctrl+Shift+L** / **Cmd+Shift+L**: Explain last error

### Commands

| Command | Description |
|---------|-------------|
| `Error Buddy: Explain Error` | Explain selected text |
| `Error Buddy: Explain Last Error` | Re-explain the last detected error |
| `Error Buddy: Toggle Auto-Explain` | Enable/disable automatic detection |
| `Error Buddy: Open Terminal` | Open Error Buddy enhanced terminal |
| `Error Buddy: Show History` | View past errors and explanations |

## Extension Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `errorBuddy.ollamaUrl` | Ollama API URL | `http://localhost:11434` |
| `errorBuddy.model` | AI model to use | `qwen2.5:0.5b` |
| `errorBuddy.autoExplain` | Auto-explain on errors | `true` |
| `errorBuddy.showNotification` | Show notification popup | `false` |
| `errorBuddy.showInPanel` | Show explanation in panel | `true` |

## How It Works

1. **Terminal Monitoring**: Uses VS Code's Shell Integration API to monitor terminal commands
2. **Error Detection**: When a command exits with non-zero status, analyzes the output
3. **Language Detection**: Identifies the programming language from error patterns
4. **AI Explanation**: Sends error to local Ollama for natural language explanation
5. **Display**: Shows structured explanation (What, Why, Fix, Example) in side panel

## Supported Languages

- **JavaScript/Node.js**: TypeError, ReferenceError, SyntaxError, etc.
- **Java**: NullPointerException, ArrayIndexOutOfBoundsException, etc.
- **C#/.NET**: NullReferenceException, CS errors, etc.

## Troubleshooting

### "Ollama not connected"

1. Make sure Ollama is running: `ollama serve`
2. Check the URL in settings matches your setup

### Low on RAM

Use a smaller model:
```bash
ollama pull qwen2.5:0.5b
```

Then update settings:
```json
{
  "errorBuddy.model": "qwen2.5:0.5b"
}
```

### Errors not being detected

1. Make sure you're using the integrated terminal (not external)
2. Enable Shell Integration in VS Code settings
3. Check that auto-explain is enabled (status bar shows active)

## Privacy

- **100% Local**: All AI processing happens on your machine
- **No Telemetry**: No data is sent to external servers
- **Path Sanitization**: File paths are sanitized before AI processing

## Release Notes

### 1.0.0

- Initial release
- Terminal error detection
- Ollama AI integration
- JavaScript, Java, C# support
- Webview explanation panel

---

**Enjoy Error Buddy!** 🤖✨
