# Design Decisions

This document explains **why** we made specific technical decisions. Understanding the reasoning helps you modify the codebase without breaking things.

## Decision 1: Command Wrapper Pattern

### The Problem
We need to intercept terminal errors without:
- Requiring complex shell configuration
- Breaking on different operating systems
- Needing admin/root permissions

### Options Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| Shell wrapper (bash/ps1) | Native | OS-specific, complex | ❌ |
| LD_PRELOAD hook | Invisible to user | Linux only, dangerous | ❌ |
| Log file monitor | Works everywhere | Delayed, misses real-time | ❌ |
| **Command wrapper** | Cross-platform, safe | Requires prefix | ✅ |

### Why Command Wrapper Wins

1. **Explicit is better than implicit**
   - User knows when Error Buddy is active
   - No surprises or hidden behavior

2. **Cross-platform by default**
   - `child_process.spawn()` works on Windows, macOS, Linux
   - No shell-specific scripting

3. **Safe**
   - No system modifications
   - Easy to uninstall (just delete)

### Trade-off Accepted

Users must type `errbuddy` before their command. We mitigate this with:
- Shell aliases (documented)
- VS Code extension (Phase 2)
- Short, memorable name

## Decision 2: Ollama as Primary AI

### The Problem
We need AI explanations that are:
- Free (no API costs)
- Private (code stays local)
- Fast (low latency)
- Reliable (works offline)

### Options Considered

| Provider | Cost | Privacy | Speed | Offline | Decision |
|----------|------|---------|-------|---------|----------|
| OpenAI API | $$ | ❌ Cloud | Fast | ❌ | Backup |
| Groq | Free tier | ❌ Cloud | Very fast | ❌ | Future |
| Claude API | $$$ | ❌ Cloud | Fast | ❌ | No |
| **Ollama** | Free | ✅ Local | Medium | ✅ | Primary |

### Why Ollama Wins

1. **Zero cost** - Important for junior developers
2. **Privacy** - Employers care about this
3. **Portfolio-friendly** - Shows systems thinking
4. **Interview talking point** - "I chose local-first AI because..."

### Trade-off Accepted

- Requires Ollama installation (one-time)
- Uses RAM (~4GB for llama3.2)
- Slightly slower than cloud APIs

We mitigate with: clear setup instructions, fallback patterns, alternative models.

## Decision 3: Node.js for CLI

### The Problem
The CLI tool needs to be:
- Cross-platform
- Easy to install
- Fast to start
- Easy to maintain

### Options Considered

| Language | Install | Startup | Ecosystem | Maintainability |
|----------|---------|---------|-----------|-----------------|
| Python | pip | ~200ms | Good | Good |
| Go | Binary | ~10ms | Limited | Harder for web devs |
| Rust | Binary | ~5ms | Limited | Steep learning curve |
| **Node.js** | npm | ~100ms | Excellent | Already know it |

### Why Node.js Wins

1. **npm install** - Developers already have Node.js
2. **Same language as VS Code extension** - Code sharing
3. **Rich ecosystem** - chalk, commander, boxen
4. **You probably know it** - Faster to contribute

### Trade-off Accepted

- Slower startup than Go/Rust
- Requires Node.js 18+

We mitigate with: lazy loading, minimal dependencies.

## Decision 4: Pattern-Based Fallback

### The Problem
Ollama might not be running. The tool should still help.

### Solution

Built-in error patterns for common errors:
- `TypeError: Cannot read property` → specific explanation
- `NullPointerException` → specific explanation
- `CS0103` → specific explanation

### Why This Matters

1. **Works immediately** - No AI setup required
2. **Instant response** - No network latency
3. **Reliable** - Patterns don't change

### Data Structure

```javascript
COMMON_ERRORS = {
  javascript: {
    'TypeError': {
      'Cannot read property': {
        what: "...",
        why: "...",
        fix: "...",
        example: "..."
      }
    }
  }
}
```

Hierarchical matching: Language → ErrorType → SubPattern

## Decision 5: SQLite for History

### The Problem
We want to save errors for:
- Learning ("have I seen this before?")
- Statistics ("what are my common errors?")
- Feedback ("was the explanation helpful?")

### Options Considered

| Storage | Setup | Query | Portability | Decision |
|---------|-------|-------|-------------|----------|
| JSON file | None | Slow | ✅ | Too simple |
| LevelDB | npm | Fast | ✅ | No SQL |
| **SQLite** | npm | Fast | ✅ | Perfect |
| PostgreSQL | Server | Fast | ❌ | Overkill |

### Why SQLite Wins

1. **Zero setup** - Just a file
2. **SQL queries** - Easy searching
3. **Reliable** - Battle-tested
4. **Portable** - Copy the file to backup

## Decision 6: Privacy by Design

### The Problem
Developers might accidentally expose:
- Project paths (`C:\Users\John\secret-client\...`)
- API keys in error messages
- Internal company information

### Solution

Sanitization before AI:
```javascript
// Remove paths
sanitized = text.replace(/[A-Z]:\\[^\s]+/g, '[path]');

// Remove secrets
sanitized = text.replace(/api[_-]?key\s*[:=]\s*\S+/gi, '[REDACTED]');
```

### Privacy Rules

1. **Strip all absolute paths**
2. **Remove usernames from paths**
3. **Redact common secret patterns**
4. **Never send file contents**
5. **Truncate long errors**

## Decision 7: Phase 2 for VS Code

### The Problem
Building everything at once means:
- Longer time to first working version
- More complex testing
- Harder to debug issues

### Solution

Phase 1: CLI that works in any terminal
Phase 2: VS Code extension that wraps the CLI

### Why CLI First

1. **Works everywhere** - VS Code, Terminal.app, Windows Terminal
2. **Faster feedback loop** - Test without reloading VS Code
3. **Simpler architecture** - One thing to debug
4. **Universal value** - Not everyone uses VS Code

## Decision 8: Emoji by Default

### The Problem
Terminal output needs to be scannable at a glance.

### Solution

```
🤖 Error Buddy Explanation:
📘 What is this?
❓ Why it happens?
✅ How to fix it:
💡 Example:
```

### Why Emoji

1. **Visual anchors** - Eye jumps to icons
2. **Universal meaning** - ✅ means "solution"
3. **Modern terminals support it** - Windows Terminal, iTerm2, etc.

### Fallback

For terminals without emoji support:
```
[Error Buddy]
[What]
[Why]
[Fix]
[Example]
```

## Summary: Design Principles

1. **Developer Experience First** - Every decision optimizes for DX
2. **Explicit Over Implicit** - No magic, no surprises
3. **Offline Capable** - Works without internet
4. **Privacy by Default** - Code never leaves your machine
5. **Progressive Enhancement** - Basic features always work, AI adds value
6. **Cross-Platform** - Windows, macOS, Linux from day one
