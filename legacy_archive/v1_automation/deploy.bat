@echo off
REM Banterblogs Deployment Script for Windows
REM This script helps deploy the blog to Vercel

echo 🚀 Deploying Banterblogs to Vercel...

REM Check if Vercel CLI is installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
)

REM Check if we're in a git repository
if not exist ".git" (
    echo ⚠️  Not in a git repository. Initializing...
    git init
    git add .
    git commit -m "Initial commit: Professional blog setup"
)

REM Deploy to Vercel
echo 📦 Deploying to Vercel...
vercel --prod

echo ✅ Deployment complete!
echo 🌐 Your blog should be live at the provided URL
echo.
echo 📋 Next steps:
echo 1. Update the domain in vercel.json if needed
echo 2. Configure analytics in index.html
echo 3. Add your custom domain in Vercel dashboard
echo 4. Test all functionality on the live site

pause
