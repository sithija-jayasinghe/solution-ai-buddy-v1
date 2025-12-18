# Error Buddy - Quick Setup Script for Windows
# Run this in PowerShell after extracting the project

Write-Host "🤖 Error Buddy Setup" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found!" -ForegroundColor Red
    Write-Host "   Please install from: https://nodejs.org" -ForegroundColor White
    exit 1
}

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Link globally
Write-Host ""
Write-Host "Installing errbuddy command globally..." -ForegroundColor Yellow
npm link

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm link failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ errbuddy command installed" -ForegroundColor Green

# Check Ollama (optional)
Write-Host ""
Write-Host "Checking Ollama (optional, for AI features)..." -ForegroundColor Yellow
try {
    $ollamaPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
    if (Test-Path $ollamaPath) {
        Write-Host "✅ Ollama found" -ForegroundColor Green
        Write-Host "   Downloading AI model (this takes a few minutes)..." -ForegroundColor Yellow
        & $ollamaPath pull qwen2.5:0.5b
        Write-Host "✅ AI model ready" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Ollama not found (optional)" -ForegroundColor Yellow
        Write-Host "   Install from https://ollama.ai for AI explanations" -ForegroundColor White
        Write-Host "   Error Buddy will still work with pattern-matching!" -ForegroundColor White
    }
} catch {
    Write-Host "⚠️  Ollama check skipped" -ForegroundColor Yellow
}

# Done!
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Usage:" -ForegroundColor White
Write-Host "  errbuddy node app.js     - Run Node.js with error explanations" -ForegroundColor Gray
Write-Host "  errbuddy npm start       - Run npm scripts with error explanations" -ForegroundColor Gray
Write-Host "  errbuddy java MyClass    - Run Java with error explanations" -ForegroundColor Gray
Write-Host "  errbuddy --offline ...   - Use pattern matching only (no AI)" -ForegroundColor Gray
Write-Host ""
Write-Host "Try it now:" -ForegroundColor Yellow
Write-Host '  errbuddy node -e "console.log(undefined.test)"' -ForegroundColor Cyan
Write-Host ""
