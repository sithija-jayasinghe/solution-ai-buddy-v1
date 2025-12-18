# Architecture Overview

This document explains the system architecture of Error → Solution AI Buddy.

## Design Philosophy

### Core Principle: No Context Switching

Every architectural decision is made with one goal: **keep the developer in their terminal**.

Traditional debugging flow:
```
Error → Copy → Browser → Search → Read → Back to Code
      ↑_____ 5+ context switches _____↑
```

Our flow:
```
Error → Explanation (same terminal)
      ↑___ 0 context switches ___↑
```

## System Components

### 1. CLI Layer (`cli/`)

**Purpose:** User interface and command wrapping

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  index.js                                                    │
│  ├── Command parsing (commander.js)                         │
│  ├── Process spawning (child_process)                       │
│  ├── stdin/stdout/stderr management                         │
│  └── Orchestration of other components                      │
│                                                              │
│  error-listener.js                                           │
│  ├── Error detection (regex patterns)                        │
│  ├── Language detection                                      │
│  ├── Context extraction (file, line, type)                   │
│  └── Local explanations (fallback)                           │
│                                                              │
│  formatter.js                                                │
│  ├── Terminal output formatting                              │
│  ├── Color handling (chalk)                                  │
│  ├── Box drawing (boxen)                                     │
│  └── Text wrapping                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. AI Layer (`backend/src/ai/`)

**Purpose:** Natural language error explanations

```
┌─────────────────────────────────────────────────────────────┐
│                        AI Layer                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ollama-service.js                                           │
│  ├── Connection management                                   │
│  ├── Prompt engineering                                      │
│  ├── Response parsing                                        │
│  └── Error handling & timeouts                               │
│                                                              │
│  System Prompt Design:                                       │
│  ├── Structured output format (WHAT/WHY/FIX/EXAMPLE)        │
│  ├── Beginner-friendly language rules                        │
│  ├── Anti-hallucination guidelines                           │
│  └── Language-specific tips                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. Storage Layer (`backend/src/services/`)

**Purpose:** Persist error history for learning

```
┌─────────────────────────────────────────────────────────────┐
│                      Storage Layer                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  history-service.js                                          │
│  ├── SQLite database management                              │
│  ├── Error logging                                           │
│  ├── Search & retrieval                                      │
│  └── Statistics generation                                   │
│                                                              │
│  Data stored:                                                │
│  ├── Error type, message, stack trace                        │
│  ├── Language detected                                       │
│  ├── AI explanation given                                    │
│  ├── User feedback (helpful/not helpful)                     │
│  └── Timestamp & command used                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                       │
│   User: errbuddy node app.js                                         │
│                                                                       │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│   CLI (index.js)                                                      │
│   ├── Parse command: "node" with args ["app.js"]                     │
│   ├── Check Ollama connection (async, non-blocking)                  │
│   └── Spawn child process with piped stdio                           │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
┌───────────────────┐                   ┌───────────────────┐
│   stdout          │                   │   stderr          │
│   (pass through)  │                   │   (capture)       │
└───────────────────┘                   └─────────┬─────────┘
                                                  │
                                                  ▼
                            ┌─────────────────────────────────────────┐
                            │   Error Listener                         │
                            │   ├── Detect: Is this an error?         │
                            │   ├── Identify: What language?          │
                            │   └── Extract: Type, file, line         │
                            └─────────────────────┬───────────────────┘
                                                  │
                                                  ▼
                            ┌─────────────────────────────────────────┐
                            │   Privacy Filter                         │
                            │   ├── Remove absolute paths             │
                            │   ├── Remove usernames                  │
                            │   └── Remove potential secrets          │
                            └─────────────────────┬───────────────────┘
                                                  │
                    ┌─────────────────────────────┴─────────┐
                    │                                       │
                    ▼                                       ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│   Ollama Available              │       │   Ollama Unavailable            │
│   └── AI explanation            │       │   └── Pattern-based explanation │
└─────────────────────────────────┘       └─────────────────────────────────┘
                    │                                       │
                    └─────────────────┬─────────────────────┘
                                      │
                                      ▼
                            ┌─────────────────────────────────────────┐
                            │   Formatter                              │
                            │   ├── Structure: WHAT/WHY/FIX/EXAMPLE   │
                            │   ├── Style: Colors, box, emoji         │
                            │   └── Output: Pretty terminal display   │
                            └─────────────────────────────────────────┘
```

## Error Detection Strategy

### Language Detection Matrix

| Indicator | JavaScript | Java | C# |
|-----------|------------|------|-----|
| `.js:line:col` | ✅ | | |
| `node_modules` | ✅ | | |
| `ENOENT/EACCES` | ✅ | | |
| `.java:line` | | ✅ | |
| `Exception in thread` | | ✅ | |
| `at java.` | | ✅ | |
| `error CS####` | | | ✅ |
| `.cs(line,col)` | | | ✅ |
| `at System.` | | | ✅ |

### Why Multiple Detection Methods?

1. **Stack trace patterns** - Most reliable
2. **File extensions** - Good backup
3. **Exception naming conventions** - Language-specific
4. **Runtime identifiers** - (`node_modules`, `java.`, `System.`)

## AI Integration Design

### Prompt Engineering Principles

1. **Structured Output**
   - Forces consistent format
   - Easy to parse programmatically
   - No markdown tables that break in terminal

2. **Conciseness Rules**
   - No walls of text
   - One sentence per section
   - Developers want answers, not essays

3. **Uncertainty Acknowledgment**
   - "I'm not 100% sure" is better than hallucination
   - Suggests multiple causes when ambiguous

4. **Language Context**
   - Prompt includes detected language
   - AI can give language-specific advice

### Response Parsing Strategy

```
Raw AI Response:
"WHAT: You tried to access property of undefined.
 WHY: The API returned null instead of an array.
 FIX: Add null check before using .map()
 EXAMPLE: if (data) { data.map(...) }"

Parsed Object:
{
  what: "You tried to access property of undefined.",
  why: "The API returned null instead of an array.",
  fix: "Add null check before using .map()",
  example: "if (data) { data.map(...) }"
}
```

## Performance Considerations

### Latency Budget

| Operation | Target | Actual |
|-----------|--------|--------|
| Error detection | <10ms | ~2ms |
| Language detection | <5ms | ~1ms |
| Ollama health check | <3s | ~100ms |
| AI explanation | <10s | 2-5s |
| Output formatting | <50ms | ~10ms |

### Optimization Strategies

1. **Non-blocking health check** - Don't wait for Ollama on startup
2. **Buffered stderr** - Collect complete error before analyzing
3. **Streaming output** - Show original error immediately
4. **Timeout handling** - Don't hang on slow AI responses

## Security Model

### What We Never Send to AI

1. Absolute file paths → replaced with `[path]`
2. Usernames from paths → stripped
3. Environment variables → never captured
4. API keys in error messages → redacted
5. Full source code → only error text

### What We Log Locally

1. Error type and message (sanitized)
2. Timestamp
3. AI explanation provided
4. User feedback (helpful/not helpful)

### Offline Mode

When `--offline` flag is used:
1. No network requests made
2. Pattern-based explanations only
3. History still saved locally
