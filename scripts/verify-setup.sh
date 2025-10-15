#!/bin/bash

# Test script to verify GitHub Copilot CLI integration

echo "🔍 Verifying GitHub Copilot CLI Integration Setup..."
echo ""

# Check GitHub CLI
echo "1. Checking GitHub CLI installation..."
if command -v gh &> /dev/null; then
    echo "   ✓ GitHub CLI is installed: $(gh --version | head -1)"
else
    echo "   ✗ GitHub CLI is NOT installed"
    echo "     Install with: brew install gh"
    exit 1
fi

# Check Copilot extension
echo ""
echo "2. Checking GitHub Copilot extension..."
if gh extension list | grep -q "github/gh-copilot"; then
    echo "   ✓ GitHub Copilot CLI extension is installed"
else
    echo "   ✗ GitHub Copilot CLI extension is NOT installed"
    echo "     Install with: gh extension install github/gh-copilot"
    exit 1
fi

# Check authentication
echo ""
echo "3. Checking GitHub authentication..."
if gh auth status &> /dev/null; then
    echo "   ✓ GitHub CLI is authenticated"
else
    echo "   ✗ GitHub CLI is NOT authenticated"
    echo "     Authenticate with: gh auth login"
    exit 1
fi

# Check environment variable
echo ""
echo "4. Checking GITHUB_TOKEN environment variable..."
if [ -f .env.local ]; then
    if grep -q "GITHUB_TOKEN=" .env.local; then
        echo "   ✓ GITHUB_TOKEN is set in .env.local"
    else
        echo "   ⚠ GITHUB_TOKEN is NOT set in .env.local"
        echo "     Add: GITHUB_TOKEN=ghp_your_token_here"
    fi
else
    echo "   ⚠ .env.local file not found"
    echo "     Create it from .env.local.example"
fi

# Check Node.js
echo ""
echo "5. Checking Node.js version..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "   ✓ Node.js is installed: $NODE_VERSION"
else
    echo "   ✗ Node.js is NOT installed"
    exit 1
fi

# Check dependencies
echo ""
echo "6. Checking project dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✓ Dependencies are installed"
else
    echo "   ⚠ Dependencies are NOT installed"
    echo "     Run: npm install"
fi

echo ""
echo "✅ Setup verification complete!"
echo ""
echo "Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Visit: http://localhost:3000"
echo "  3. Click 'Refresh Intelligence' on any repository card"
echo ""
