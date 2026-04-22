#!/usr/bin/env node

/**
 * Deploy Admin Server to Railway
 */

const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function deployAdminServer() {
  console.log('🚀 Deploying Admin Server to Railway...\n');

  // Check Railway CLI
  try {
    execSync('railway --version', { stdio: 'ignore' });
    console.log('✅ Railway CLI found\n');
  } catch (error) {
    console.error('❌ Railway CLI not found');
    console.log('Install with: npm install -g @railway/cli');
    process.exit(1);
  }

  // Check if logged in
  try {
    execSync('railway whoami', { stdio: 'ignore' });
    console.log('✅ Railway logged in\n');
  } catch (error) {
    console.error('❌ Not logged in to Railway');
    console.log('Run: railway login');
    process.exit(1);
  }

  // Initialize project
  console.log('📦 Initializing Railway project...');
  try {
    execSync('railway init --name toklo-admin-server', { stdio: 'inherit' });
    console.log('✅ Project initialized\n');
  } catch (error) {
    console.log('⚠️  Project might already exist, continuing...\n');
  }

  // Get required environment variables
  console.log('🔧 Setting up environment variables...\n');

  const databaseUrl = await question('Enter your PostgreSQL DATABASE_URL (from Railway or external): ');
  const jwtSecret = await question('Enter JWT_SECRET (or press Enter to auto-generate): ');
  const csrfSecret = await question('Enter CSRF_SECRET (or press Enter to auto-generate): ');

  const autoJwtSecret = jwtSecret || require('crypto').randomBytes(64).toString('hex');
  const autoCsrfSecret = csrfSecret || require('crypto').randomBytes(64).toString('hex');

  console.log('\n📝 Setting environment variables...');

  const envVars = {
    DATABASE_URL: databaseUrl,
    JWT_SECRET: autoJwtSecret,
    CSRF_SECRET: autoCsrfSecret,
    NODE_ENV: 'production',
    ADMIN_SERVER_PORT: '3001',
    ADMIN_ALLOWED_ORIGINS: 'https://www.toklo.xyz,https://toklo.xyz,http://localhost:5173'
  };

  // Set environment variables
  for (const [key, value] of Object.entries(envVars)) {
    try {
      execSync(`railway variables set ${key}="${value}"`, { stdio: 'ignore' });
      console.log(`   ✅ ${key} set`);
    } catch (error) {
      console.error(`   ❌ Failed to set ${key}`);
    }
  }

  console.log('\n📤 Deploying to Railway...');
  try {
    execSync('railway up --detach', { stdio: 'inherit' });
    console.log('\n✅ Deployment started!');
  } catch (error) {
    console.error('\n❌ Deployment failed!');
    rl.close();
    process.exit(1);
  }

  // Wait a moment and get the deployment URL
  console.log('\n⏳ Waiting for deployment...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  try {
    const status = execSync('railway status --json', { encoding: 'utf8' });
    const statusJson = JSON.parse(status);
    console.log('\n🌐 Deployment Status:');
    console.log(statusJson);
  } catch (error) {
    console.log('\n💡 Check deployment status with: railway open');
  }

  console.log('\n✅ Admin server deployment initiated!');
  console.log('\n📋 Next steps:');
  console.log('   1. Run: railway open (to see deployment in browser)');
  console.log('   2. Wait for deployment to complete');
  console.log('   3. Copy the public URL');
  console.log('   4. Update your frontend .env with VITE_ADMIN_API_URL');
  console.log('\n🎉 Done!');

  rl.close();
}

deployAdminServer().catch(error => {
  console.error('❌ Error:', error.message);
  rl.close();
  process.exit(1);
});
