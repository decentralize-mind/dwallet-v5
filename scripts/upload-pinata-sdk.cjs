/**
 * Upload dist folder to Pinata using the official SDK
 * This properly uploads as a directory, not a tarball
 */

const pinataSDK = require('@pinata/sdk');
const path = require('path');
const fs = require('fs');

// Pinata Configuration
const PINATA_API_KEY = '319ccae58dbbf3a4edf7';
const PINATA_SECRET_KEY = 'b9165adc22c3267984832dba5ab9539f310953453f7e08d652d1f366d8619833';
const BUILD_DIR = path.join(__dirname, '..', 'dist');

const pinata = new pinataSDK(PINATA_API_KEY, PINATA_SECRET_KEY);

async function uploadToPinata() {
  console.log('==================================');
  console.log('🌐 dWallet IPFS Upload to Pinata (SDK)');
  console.log('==================================');
  console.log('');

  // Check if dist directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ Error: dist/ directory not found!');
    console.error('Run "npm run build" first.');
    process.exit(1);
  }

  // Count files
  let fileCount = 0;
  const countFiles = (dir) => {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        countFiles(fullPath);
      } else {
        fileCount++;
      }
    }
  };
  countFiles(BUILD_DIR);

  console.log(`📦 Found ${fileCount} files in dist/ folder`);
  console.log('');
  console.log('📤 Uploading to Pinata via SDK...');
  console.log('');

  try {
    // Upload directory using pinFromFS
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

    console.log('==================================');
    console.log('✅ Upload Successful!');
    console.log('==================================');
    console.log('');
    console.log('📊 IPFS Hash (CID):', response.IpfsHash);
    console.log('📏 Pin Size:', (response.PinSize / 1024 / 1024).toFixed(2), 'MB');
    console.log('📅 Timestamp:', response.Timestamp);
    console.log('');
    console.log('🌐 Access your frontend:');
    console.log('   Pinata:  https://' + response.IpfsHash + '.ipfs.pinata.cloud');
    console.log('   IPFS.io: https://ipfs.io/ipfs/' + response.IpfsHash);
    console.log('   Dweb:    https://' + response.IpfsHash + '.ipfs.dweb.link');
    console.log('   Cloudflare: https://cloudflare-ipfs.com/ipfs/' + response.IpfsHash);
    console.log('');
    console.log('📝 Full URI for ENS:');
    console.log('   ipfs://' + response.IpfsHash);
    console.log('');

    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      ipfsHash: response.IpfsHash,
      pinSize: response.PinSize,
      pinataTimestamp: response.Timestamp,
      gateways: {
        pinata: `https://${response.IpfsHash}.ipfs.pinata.cloud`,
        ipfsio: `https://ipfs.io/ipfs/${response.IpfsHash}`,
        cloudflare: `https://cloudflare-ipfs.com/ipfs/${response.IpfsHash}`,
        dweb: `https://${response.IpfsHash}.ipfs.dweb.link`,
      },
      ens: {
        contentHash: `ipfs://${response.IpfsHash}`,
        ensLimo: 'https://dwallet.eth.limo',
        ensLink: 'https://dwallet.eth.link',
      }
    };

    const outputPath = path.join(__dirname, 'pinata-deployment-latest.json');
    fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('💾 Deployment info saved to:', outputPath);
    console.log('');
    console.log('==================================');
    console.log('🎉 Done! Test the links above');
    console.log('==================================');

    return response.IpfsHash;

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    console.error('');
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

uploadToPinata();
