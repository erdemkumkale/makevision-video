#!/bin/bash

# MakeVision.video - Quick Deploy Script
# Usage: chmod +x deploy.sh && ./deploy.sh

echo "🎬 MakeVision.video - Deployment Script"
echo "========================================"
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing Git repository..."
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

# Check if .gitignore exists
if [ ! -f .gitignore ]; then
    echo "📝 Creating .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage

# Production
dist
build

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Editor
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Vercel
.vercel
EOF
    echo "✅ .gitignore created"
fi

# Add all files
echo ""
echo "📦 Adding files to git..."
git add .

# Commit
echo "💾 Creating commit..."
git commit -m "Initial commit - MakeVision.video MVP ready for deployment"

# Check if remote exists
if git remote | grep -q origin; then
    echo "✅ Git remote already configured"
else
    echo ""
    echo "⚠️  Git remote not configured"
    echo "Please create a GitHub repository and run:"
    echo "git remote add origin https://github.com/YOUR_USERNAME/makevision-video.git"
    echo "git push -u origin main"
    echo ""
fi

# Check if Vercel CLI is installed
if command -v vercel &> /dev/null; then
    echo ""
    echo "🚀 Vercel CLI found!"
    echo ""
    read -p "Deploy to Vercel now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Deploying to Vercel..."
        vercel
    else
        echo "⏭️  Skipping Vercel deployment"
        echo "Run 'vercel' manually when ready"
    fi
else
    echo ""
    echo "⚠️  Vercel CLI not found"
    echo "Install with: npm i -g vercel"
    echo "Then run: vercel"
fi

echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Push to GitHub (if not done)"
echo "2. Deploy to Vercel: vercel --prod"
echo "3. Add environment variables in Vercel dashboard:"
echo "   - VITE_GEMINI_API_KEY"
echo "   - VITE_FAL_KEY"
echo "4. Test the live site!"
echo ""
echo "🎉 Good luck with your launch!"
