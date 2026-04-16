/**
 * Deploy Frontend to IPFS via Pinata (Individual Files)
 * 
 * This script uploads individual files instead of a ZIP,
 * so the frontend is directly accessible via IPFS gateways
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Pinata Configuration
const PINATA_API_KEY = '319ccae58dbbf3a4edf7';
const PINATA_SECRET_KEY = 'b9165adc22c3267984832dba5ab9539f310953453f7e08d652d1f366d8619833';
const BUILD_DIR = path.join(__dirname, '..', 'dist');

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

async function uploadDirectoryToPinata(dirPath, baseName = '') {
  console.log(`📤 Uploading directory: ${baseName || 'root'}\n`);

  const files = [];
  
  // Read all files recursively
  const readDir = (currentPath, relativePath) => {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const relativeItemPath = relativePath ? path.join(relativePath, item) : item;
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        readDir(fullPath, relativeItemPath);
      } else {
        const fileContent = fs.readFileSync(fullPath);
        files.push({
          path: relativeItemPath,
          content: fileContent
        });
      }
    }
  };

  readDir(dirPath, baseName);

  console.log(`📦 Found ${files.length} files to upload\n`);

  // Upload using Pinata's pinFileToIPFS with multiple files
  const FormData = require('form-data');
  const form = new FormData();

  // Add each file to form
  for (const file of files) {
    form.append('file', file.content, {
      filepath: file.path,
    });
  }

  // Add metadata
  form.append('pinataMetadata', JSON.stringify({
    name: `dWallet-Frontend-Files-${new Date().toISOString().split('T')[0]}`,
    keyvalues: {
      project: 'dWallet v5',
      type: 'frontend-files',
      version: '5.0.0',
      fileCount: files.length.toString(),
    }
  }));

  form.append('pinataOptions', JSON.stringify({
    cidVersion: 1,
  }));

  console.log('🚀 Uploading to Pinata...\n');

  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      form,
      {
        maxBodyLength: 'Infinity',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${form._boundary}`,
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY,
        },
        maxContentLength: Infinity,
      }
    );

    return response.data;
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🌐 dWallet Frontend - Pinata IPFS Deployment (Files Mode)');
  console.log('='.repeat(60));
  console.log('');

  // Build frontend
  const buildSuccess = await buildFrontend();
  if (!buildSuccess) {
    process.exit(1);
  }

  // Upload directory
  const result = await uploadDirectoryToPinata(BUILD_DIR);

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
  console.log(`   Gateway.io: https://${ipfsHash}.ipfs.dweb.link`);
  
  console.log('\n🔗 Direct Links:');
  console.log(`   Primary: https://${ipfsHash}.ipfs.pinata.cloud`);
  console.log(`   Backup 1: https://ipfs.io/ipfs/${ipfsHash}`);
  console.log(`   Backup 2: https://cloudflare-ipfs.com/ipfs/${ipfsHash}`);
  
  console.log('\n📝 Next Steps:');
  console.log('   1. Test all gateway links above');
  console.log('   2. Verify index.html loads correctly');
  console.log('   3. Update ENS record with new hash');
  console.log('   4. Share with community');

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

  const outputPath = path.join(__dirname, `pinata-deployment-files-${Date.now()}.json`);
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
