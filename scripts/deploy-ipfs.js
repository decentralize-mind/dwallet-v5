#!/usr/bin/env node

/**
 * IPFS Deployment Script
 * Uploads the built frontend to IPFS via Pinata
 */

const fs = require('fs');
const path = require('path');
const { PinataSDK } = require("@pinata/sdk");

// Load environment variables
require('dotenv').config();

const PINATA_JWT = process.env.PINATA_JWT;
const BUILD_DIR = path.join(__dirname, 'dist');

if (!PINATA_JWT) {
  console.error('❌ PINATA_JWT not found in .env file');
  console.log('Please add your Pinata JWT token to .env:');
  console.log('PINATA_JWT=your_jwt_token_here');
  process.exit(1);
}

if (!fs.existsSync(BUILD_DIR)) {
  console.error('❌ Build directory not found!');
  console.log('Please run: npm run build');
  process.exit(1);
}

async function deployToIPFS() {
  console.log('🚀 Starting IPFS deployment...\n');

  try {
    // Initialize Pinata
    const pinata = new PinataSDK({ pinataJWTKey: PINATA_JWT });

    // Test authentication
    console.log('🔑 Authenticating with Pinata...');
    const auth = await pinata.testAuthentication();
    console.log('✅ Authentication successful!\n');

    // Upload folder to IPFS
    console.log('📤 Uploading build folder to IPFS...');
    const result = await pinata.upload.folder(BUILD_DIR, {
      pinataMetadata: {
        name: `toklo-wallet-${Date.now()}`
      },
      pinataOptions: {
        cidVersion: 1
      }
    });

    const ipfsHash = result.IpfsHash;
    
    console.log('\n✅ Upload successful!');
    console.log('📦 IPFS Hash (CID):', ipfsHash);
    console.log('\n🌐 Access your site via gateways:');
    console.log(`   - https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
    console.log(`   - https://ipfs.io/ipfs/${ipfsHash}`);
    console.log(`   - https://cloudflare-ipfs.com/ipfs/${ipfsHash}`);
    console.log(`   - https://dweb.link/ipfs/${ipfsHash}`);
    
    console.log('\n💡 To use with custom domain:');
    console.log('   1. Go to Pinata Dashboard');
    console.log('   2. Navigate to "Pin Manager"');
    console.log('   3. Click on this pin');
    console.log('   4. Add your custom domain');
    
    // Save deployment info
    const deploymentInfo = {
      ipfsHash,
      timestamp: new Date().toISOString(),
      gateways: [
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        `https://ipfs.io/ipfs/${ipfsHash}`,
        `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`
      ]
    };

    fs.writeFileSync(
      'ipfs-deployment.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log('\n💾 Deployment info saved to ipfs-deployment.json');
    console.log('\n🎉 IPFS deployment complete!');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

deployToIPFS();
