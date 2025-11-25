#!/bin/bash

# Banterblogs Deployment Script
# This script helps deploy the blog to Vercel

echo "🚀 Deploying Banterblogs to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "⚠️  Not in a git repository. Initializing..."
    git init
    git add .
    git commit -m "Initial commit: Professional blog setup"
fi

# Deploy to Vercel
echo "📦 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🌐 Your blog should be live at the provided URL"
echo ""
echo "📋 Next steps:"
echo "1. Update the domain in vercel.json if needed"
echo "2. Configure analytics in index.html"
echo "3. Add your custom domain in Vercel dashboard"
echo "4. Test all functionality on the live site"
