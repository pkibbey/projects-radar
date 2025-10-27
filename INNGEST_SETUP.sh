#!/bin/bash
# Inngest Setup Commands

echo "========================================="
echo "Inngest Integration - Getting Started"
echo "========================================="
echo ""

# Step 1
echo "✓ Step 1: Package already installed (inngest)"
echo "  Run: npm list inngest"
npm list inngest 2>/dev/null | grep inngest || echo "  ✓ Installed"
echo ""

# Step 2
echo "⚠ Step 2: Create Inngest Account (manual)"
echo "  1. Go to https://app.inngest.com"
echo "  2. Sign up for free account"
echo "  3. Create a new project"
echo ""

# Step 3
echo "⚠ Step 3: Get your API Key (manual)"
echo "  1. In Inngest Dashboard, go to Settings"
echo "  2. Find 'Event Keys' section"
echo "  3. Copy your key (starts with 'inngest_ek_')"
echo ""

# Step 4
echo "📝 Step 4: Add to .env.local"
cat > .env.local.example << 'EOF'
# Add these to .env.local
INNGEST_EVENT_KEY=<your-key-from-step-3>
INNGEST_BASE_URL=https://app.inngest.com

# Already required (add if missing)
GITHUB_TOKEN=<your-github-token>
GITHUB_OWNER=<your-github-username>
EOF

echo "  Example file created: .env.local.example"
echo "  Copy values from above into your actual .env.local file"
echo ""

# Step 5
echo "🚀 Step 5: Restart Dev Server"
echo "  Run: npm run dev"
echo ""

echo "✅ Setup Complete!"
echo ""
echo "Next Actions:"
echo "  1. Update .env.local with your INNGEST_EVENT_KEY"
echo "  2. Restart your dev server"
echo "  3. Try triggering batch generation"
echo "  4. Watch progress in https://app.inngest.com"
echo ""
echo "Documentation:"
echo "  - Quick Start: INNGEST_QUICKSTART.md"
echo "  - Full Setup: INNGEST_SETUP.md"
echo "=========================================\n"
