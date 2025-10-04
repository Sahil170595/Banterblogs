// Simple test to isolate the build issue
const { execSync } = require('child_process');

console.log('Testing Next.js build in isolation...');

try {
  // Clear cache first
  console.log('Clearing Next.js cache...');
  execSync('rmtree /S /Q .next 2>nul || rm -rf .next', { stdio: 'inherit' });
  
  // Try build
  console.log('Starting build...');
  execSync('npm run build', { stdio: 'inherit', timeout: 120000 });
  
  console.log('✅ Build successful!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  
  // Try dev server instead
  console.log('Trying dev server...');
  execSync('npm run dev &', { stdio: 'inherit', timeout: 10000 });
}
