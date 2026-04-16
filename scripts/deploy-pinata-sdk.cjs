/**
 * Deploy Frontend to IPFS via Pinata SDK
 * Properly uploads directory structure for web hosting
 */

const pinataSDK = require('@pinata/sdk');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Pinata Configuration
const PINATA_API_KEY = '319ccae58dbbf3a4edf7';
const PINATA_SECRET_KEY = 'b9165adc22c3267984832dba5ab9539f310953453f7e08d652d1f366d8619833';
const BUILD_DIR = path.join(__dirname, '..', 'dist');

const pinata = new pinataSDK(PINATA_API_KEY, PINATA_SECRET_KEY);

async function buildFrontend() {
  console.log('🔨 Building frontend...\n');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('\n✅ Frontend built successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    return false;
  }
}

async function uploadToPinata() {
  console.log('📤 Uploading to Pinata via SDK...\n');
  
  // Verify dist directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ Build directory not found:', BUILD_DIR);
    process.exit(1);
  }

  // List files
  const files = [];
  const walkDir = (dir) => {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  };
  walkDir(BUILD_DIR);

  console.log(`📦 Found ${files.length} files\n`);

  try {
    // Upload entire directory
    const response = await pinata.pinFromFS(BUILD_DIR, {
      metadata: {
        name: `dWallet-Frontend-${new Date().toISOString().split('T')[0]}`,
        keyvalues: {
          project: 'dWallet v5',
          type: 'frontend',
          version: '5.0.0',
        }
      },
      cidVersion: 1,
    });

    return response;
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🌐 dWallet Frontend - Pinata IPFS Deployment (SDK Mode)');
  console.log('='.repeat(60));
  console.log('');

  // Build frontend
  const buildSuccess = await buildFrontend();
  if (!buildSuccess) {
    process.exit(1);
  }

  // Upload to Pinata
  const result = await uploadToPinata();

  const ipfsHash = result.IpfsHash;
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Deployment to Pinata IPFS Successful!');
  console.log('='.repeat(60));
  console.log('\n📊 Deployment Details:');
  console.log(`   IPFS Hash (CID): ${ipfsHash}`);
  console.log(`   Pin Size: ${(result.PinSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Timestamp: ${result.Timestamp}`);
  
  console.log('\n🌐 Access Your Decentralized Frontend:');
  console.log(`   Pinata Gateway: https://${ipfsHash}.ipfs.pinata.cloud`);
  console.log(`   IPFS.io Gateway: https://ipfs.io/ipfs/${ipfsHash}`);
  console.log(`   Cloudflare Gateway: https://cloudflare-ipfs.com/ipfs/${ipfsHash}`);
  console.log(`   Dweb Gateway: https://${ipfsHash}.ipfs.dweb.link`);
  
  console.log('\n🔗 Quick Access:');
  console.log(`   Primary: https://${ipfsHash}.ipfs.pinata.cloud`);
  
  console.log('\n📝 Next Steps:');
  console.log('   1. ✅ Test the Pinata Gateway link');
  console.log('   2. ✅ Verify index.html loads correctly');
  console.log('   3. ⏳ Update ENS record with new hash');
  console.log('   4. ⏳ Share with community');

  // Save deployment info
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    ipfsHash: ipfsHash,
    pinSize: result.PinSize,
    pinataTimestamp: result.Timestamp,
    gateways: {
      pinata: `https://${ipfsHash}.ipfs.pinata.cloud`,
      ipfsio: `https://ipfs.io/ipfs/${ipfsHash}`,
      cloudflare: `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
      dweb: `https://${ipfsHash}.ipfs.dweb.link`,
    },
    ens: {
      contentHash: `ipfs://${ipfsHash}`,
      ensLimo: 'https://dwallet.eth.limo',
      ensLink: 'https://dwallet.eth.link',
    }
  };

  const outputPath = path.join(__dirname, `pinata-deployment-sdk-${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${outputPath}`);

  return ipfsHash;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
