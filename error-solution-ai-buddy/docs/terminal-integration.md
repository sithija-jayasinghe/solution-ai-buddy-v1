# Terminal Integration Guide

This document explains how Error Buddy integrates with different terminals and shells.

## How Terminal Output Works

### Understanding stdout vs stderr

Every program has three standard streams:

```
┌─────────────────────────────────────────────────────────────┐
│                         Program                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   stdin (0)  ← User input (keyboard)                        │
│   stdout (1) → Normal output (console.log, System.out)      │
│   stderr (2) → Error output (exceptions, warnings)          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

Error Buddy captures **stderr** because that's where errors go.

## Process Spawning

### How We Run Your Command

```javascript
const child = spawn(command, args, {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env, FORCE_COLOR: '1' }
});
```

Breaking this down:

| Option | Value | Meaning |
|--------|-------|---------|
| `stdio[0]` | `'inherit'` | You can type input normally |
| `stdio[1]` | `'pipe'` | We capture stdout, then forward it |
| `stdio[2]` | `'pipe'` | We capture stderr for analysis |
| `shell` | `true` | Commands work like in your shell |
| `FORCE_COLOR` | `'1'` | Preserve colored output |

### Why `shell: true`?

Without it, commands like `npm start` fail on Windows because `npm` is actually `npm.cmd`.

With `shell: true`:
- Windows: Uses `cmd.exe`
- macOS/Linux: Uses `/bin/sh`

## Terminal Compatibility

### Tested Terminals

| Terminal | Platform | Status | Notes |
|----------|----------|--------|-------|
| Windows Terminal | Windows | ✅ | Full emoji support |
| PowerShell | Windows | ✅ | Works great |
| CMD | Windows | ⚠️ | Limited emoji |
| iTerm2 | macOS | ✅ | Full support |
| Terminal.app | macOS | ✅ | Full support |
| GNOME Terminal | Linux | ✅ | Full support |
| VS Code Terminal | All | ✅ | Native support |

### Color Support

We use [chalk](https://github.com/chalk/chalk) for colors, which auto-detects:
- If terminal supports colors
- 256 color vs 16 color
- True color (16 million colors)

```javascript
// chalk automatically handles this:
chalk.cyan('text')  // → Works in all color terminals
```

## Shell-Specific Tips

### PowerShell (Windows)

```powershell
# Create an alias for faster typing
function eb { errbuddy $args }

# Add to your $PROFILE for persistence
notepad $PROFILE
# Add: function eb { errbuddy $args }
```

### Bash (macOS/Linux)

```bash
# Create an alias
alias eb='errbuddy'

# Add to ~/.bashrc or ~/.zshrc for persistence
echo "alias eb='errbuddy'" >> ~/.bashrc
source ~/.bashrc
```

### Zsh (macOS default)

```zsh
# Add to ~/.zshrc
alias eb='errbuddy'

# Or create a function that wraps common commands
node() { errbuddy node "$@" }
npm() { errbuddy npm "$@" }
```

## Exit Codes

Error Buddy preserves exit codes from your command:

```bash
$ errbuddy node working-app.js
# Output here
$ echo $?
0

$ errbuddy node broken-app.js
# Error + explanation here
$ echo $?
1
```

This means:
- CI/CD pipelines still work
- Scripts can check for failure
- Your existing workflow isn't broken

## Environment Variables

### Passed Through

All your environment variables are passed to the child process:
- `PATH` - So commands work
- `HOME` - So configs load
- `NODE_ENV` - So your app runs correctly
- Everything else - Your .env files work

### Added by Error Buddy

| Variable | Value | Purpose |
|----------|-------|---------|
| `FORCE_COLOR` | `'1'` | Keep colored output |

## Signal Handling

Error Buddy forwards signals to the child process:

```javascript
// When you press Ctrl+C
process.on('SIGINT', () => {
  child.kill('SIGINT');
});
```

This means:
- `Ctrl+C` stops both Error Buddy and your program
- `Ctrl+Z` suspends correctly (Unix)
- Your program can handle signals normally

## Performance Impact

### Overhead Measurements

| Metric | Without Error Buddy | With Error Buddy | Overhead |
|--------|---------------------|------------------|----------|
| Startup | 0ms | ~100ms | 100ms |
| stdout latency | 0ms | <1ms | Negligible |
| stderr latency | 0ms | <5ms | Minimal |
| Memory | 0MB | ~50MB | Node.js runtime |

The ~100ms startup is Node.js loading. For long-running processes (servers, build tools), this is negligible.

## Troubleshooting

### "Command not found"

```bash
# Check if errbuddy is installed
which errbuddy  # Unix
where errbuddy  # Windows

# If not found, reinstall:
npm link  # In the project directory
```

### Colors not showing

```bash
# Force color mode
errbuddy --color node app.js

# Or set environment variable
FORCE_COLOR=1 errbuddy node app.js
```

### Output is garbled

Some programs detect they're not in a real TTY and change output format. Try:

```bash
# Force TTY mode (if available in your terminal)
script -q /dev/null errbuddy node app.js  # Unix
```

### Interactive programs not working

If a program needs interactive input (like `npm init`):

```bash
# This should work (stdin is inherited)
errbuddy npm init

# If issues, run without errbuddy for interactive setup
npm init
```

## Advanced: Creating Shell Integration

For shells that support it, you can auto-wrap commands:

### Zsh (preexec hook)

```zsh
# Add to ~/.zshrc
preexec() {
  # Only wrap certain commands
  case "$1" in
    node*|npm*|java*|dotnet*)
      eval "errbuddy $1"
      return 1  # Don't run original
      ;;
  esac
}
```

### PowerShell (Set-PSReadLineKeyHandler)

```powershell
# Experimental: Override Enter key
Set-PSReadLineKeyHandler -Key Enter -ScriptBlock {
  $line = $null
  [Microsoft.PowerShell.PSConsoleReadLine]::GetBufferState([ref]$line, [ref]$null)
  
  if ($line -match '^(node|npm|java|dotnet)') {
    [Microsoft.PowerShell.PSConsoleReadLine]::RevertLine()
    [Microsoft.PowerShell.PSConsoleReadLine]::Insert("errbuddy $line")
  }
  [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine()
}
```

⚠️ **Warning:** Auto-wrapping can have unintended side effects. The explicit `errbuddy` prefix is recommended.
