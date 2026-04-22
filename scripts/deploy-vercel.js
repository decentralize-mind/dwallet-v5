#!/usr/bin/env node

/**
 * Vercel Deployment Script
 * Builds and deploys to Vercel
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting Vercel deployment...\n');

// Check if Vercel CLI is installed
try {
  execSync('vercel --version', { stdio: 'ignore' });
  console.log('✅ Vercel CLI found\n');
} catch (error) {
  console.log('❌ Vercel CLI not found');
  console.log('Installing Vercel CLI...');
  execSync('npm install -g vercel', { stdio: 'inherit' });
  console.log('✅ Vercel CLI installed\n');
}

// Build the project
console.log('📦 Building project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful\n');
} catch (error) {
  console.error('❌ Build failed!');
  process.exit(1);
}

// Deploy to Vercel
console.log('📤 Deploying to Vercel...');
console.log('Note: You will be prompted to confirm deployment\n');

try {
  execSync('vercel --prod', { stdio: 'inherit' });
  console.log('\n✅ Deployment successful!');
  console.log('\n🌐 Next steps:');
  console.log('   1. Run: vercel domains add www.toklo.xyz');
  console.log('   2. Update your DNS to point to Vercel');
  console.log('   3. Set environment variables in Vercel dashboard');
} catch (error) {
  console.error('\n❌ Deployment failed!');
  process.exit(1);
}
