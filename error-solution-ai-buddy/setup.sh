#!/bin/bash
# Error Buddy - Quick Setup Script for macOS/Linux

echo "🤖 Error Buddy Setup"
echo "==================="
echo ""

# Check Node.js
echo "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js $NODE_VERSION found"
else
    echo "❌ Node.js not found!"
    echo "   Please install from: https://nodejs.org"
    exit 1
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ npm install failed!"
    exit 1
fi
echo "✅ Dependencies installed"

# Link globally
echo ""
echo "Installing errbuddy command globally..."
npm link

if [ $? -ne 0 ]; then
    echo "❌ npm link failed!"
    echo "   Try: sudo npm link"
    exit 1
fi
echo "✅ errbuddy command installed"

# Check Ollama (optional)
echo ""
echo "Checking Ollama (optional, for AI features)..."
if command -v ollama &> /dev/null; then
    echo "✅ Ollama found"
    echo "   Downloading AI model (this takes a few minutes)..."
    ollama pull qwen2.5:0.5b
    echo "✅ AI model ready"
else
    echo "⚠️  Ollama not found (optional)"
    echo "   Install from https://ollama.ai for AI explanations"
    echo "   Error Buddy will still work with pattern-matching!"
fi

# Done!
echo ""
echo "========================================"
echo "🎉 Setup Complete!"
echo "========================================"
echo ""
echo "Usage:"
echo "  errbuddy node app.js     - Run Node.js with error explanations"
echo "  errbuddy npm start       - Run npm scripts with error explanations"
echo "  errbuddy java MyClass    - Run Java with error explanations"
echo "  errbuddy --offline ...   - Use pattern matching only (no AI)"
echo ""
echo "Try it now:"
echo '  errbuddy node -e "console.log(undefined.test)"'
echo ""
