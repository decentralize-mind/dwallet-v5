#!/usr/bin/env node

/**
 * Deploy to Vercel Pre-Production
 * 
 * This script:
 * 1. Validates pre-production environment variables
 * 2. Copies .env.preproduction to .env.local
 * 3. Deploys to Vercel with pre-production settings
 * 4. Provides deployment URL
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting Pre-Production Deployment...\n');

// Step 1: Validate .env.preproduction exists
const envPreprodPath = path.join(rootDir, '.env.preproduction');
if (!fs.existsSync(envPreprodPath)) {
  console.error('❌ Error: .env.preproduction not found!');
  console.log('\n📝 Please create .env.preproduction with testnet configuration.');
  console.log('   Copy from .env.example and use Sepolia testnet values.\n');
  process.exit(1);
}

console.log('✅ Found .env.preproduction');

// Step 2: Check for required variables
const envContent = fs.readFileSync(envPreprodPath, 'utf8');
const requiredVars = [
  'VITE_INFURA_KEY',
  'VITE_WALLETCONNECT_PROJECT_ID',
  'DEPLOYER_PRIVATE_KEY'
];

const missingVars = [];
requiredVars.forEach(varName => {
  const regex = new RegExp(`${varName}=`, 'm');
  if (!regex.test(envContent)) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.error(`\n❌ Missing required variables: ${missingVars.join(', ')}`);
  console.log('   Please update .env.preproduction\n');
  process.exit(1);
}

console.log('✅ Environment variables validated');

// Step 3: Backup current .env.local if exists
const envLocalPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envLocalPath)) {
  const backupPath = path.join(rootDir, '.env.local.backup');
  fs.copyFileSync(envLocalPath, backupPath);
  console.log('💾 Backed up current .env.local');
}

// Step 4: Copy .env.preproduction to .env.local
fs.copyFileSync(envPreprodPath, envLocalPath);
console.log('✅ Copied pre-production config to .env.local');

// Step 5: Build the project
console.log('\n🔨 Building project...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
  console.log('✅ Build successful');
} catch (error) {
  console.error('❌ Build failed! Reverting changes...');
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, envLocalPath);
  }
  process.exit(1);
}

// Step 6: Deploy to Vercel
console.log('\n🌐 Deploying to Vercel Pre-Production...');
console.log('📋 Run this command to deploy:');
console.log('');
console.log('   vercel --prod --prebuilt');
console.log('');
console.log('Or for interactive deployment:');
console.log('   vercel');
console.log('');

// Optional: Auto-deploy if vercel CLI is available
try {
  execSync('vercel --version', { stdio: 'ignore', cwd: rootDir });
  console.log('✅ Vercel CLI detected');
  console.log('\n✨ Deployment command ready!');
  console.log('   The build is complete. Run "vercel --prod --prebuilt" to deploy.\n');
} catch (error) {
  console.log('⚠️  Vercel CLI not found. Install with: npm install -g vercel');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 PRE-PRODUCTION DEPLOYMENT CHECKLIST:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ 1. Build completed');
console.log('⏳ 2. Run: vercel --prod --prebuilt');
console.log('🔍 3. Test thoroughly on Sepolia testnet');
console.log('✅ 4. When ready, deploy to production separately');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
