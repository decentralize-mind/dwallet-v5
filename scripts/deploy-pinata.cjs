/**
 * Deploy Frontend to IPFS via Pinata
 * 
 * Uses the provided Pinata API credentials to upload the built frontend
 * 
 * Usage:
 *   node scripts/deploy-pinata.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { execSync } = require('child_process');

// Pinata Configuration
const PINATA_API_KEY = '319ccae58dbbf3a4edf7';
const PINATA_SECRET_KEY = 'b9165adc22c3267984832dba5ab9539f310953453f7e08d652d1f366d8619833';
const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmZTJkYmJjOS0yM2I0LTRmODAtYWQxYi0xODViNGMxOWI4YTIiLCJlbWFpbCI6InRhYmZpbmFuY2V6ZXJvQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiIzMTljY2FlNThkYmJmM2E0ZWRmNyIsInNjb3BlZEtleVNlY3JldCI6ImI5MTY1YWRjMjJjMzI2Nzk4NDgzMmRiYTVhYjk1MzlmMzEwOTUzNDUzZjdlMDhkNjUyZDFmMzY2ZDg2MTk4MzMiLCJleHAiOjE4MDc4ODE1NDd9.kGugl7z1AOTHFv_grHQbo9CXF7VVDoI6WZVEOPuU2dI';

const BUILD_DIR = path.join(__dirname, '..', 'dist');

async function buildFrontend() {
  console.log('🔨 Building frontend...\n');
  try {
    execSync('npm run build', { 
      stdio: 'inherit', 
      cwd: path.join(__dirname, '..') 
    });
    console.log('\n✅ Frontend built successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    return false;
  }
}

async function deployToPinata() {
  console.log('📌 Deploying to Pinata IPFS...\n');

  // Check if build directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ Build directory not found. Running build first...');
    const buildSuccess = await buildFrontend();
    if (!buildSuccess) {
      process.exit(1);
    }
  }

  try {
    console.log('📦 Creating ZIP archive of build...');
    
    // Create a zip file of the build directory
    const zipPath = path.join(__dirname, '..', 'dist.zip');
    const archiver = require('archiver');
    
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(BUILD_DIR, false);
      archive.finalize();
    });
    
    console.log('✅ ZIP created successfully\n');

    // Create form data with zip file
    const form = new FormData();
    const fileStream = fs.createReadStream(zipPath);
    form.append('file', fileStream, {
      filepath: 'dist.zip',
    });

    // Add metadata
    form.append('pinataMetadata', JSON.stringify({
      name: `dWallet-Frontend-${new Date().toISOString().split('T')[0]}`,
      keyvalues: {
        project: 'dWallet v5',
        type: 'frontend',
        version: '5.0.0',
      }
    }));

    form.append('pinataOptions', JSON.stringify({
      cidVersion: 1,
    }));

    console.log('📤 Uploading to Pinata IPFS...\n');

    // Upload to Pinata using API Key and Secret
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

    const ipfsHash = response.data.IpfsHash;
    const ipfsHashSize = response.data.PinSize;
    
    console.log('='.repeat(60));
    console.log('✅ Deployment to Pinata IPFS Successful!');
    console.log('='.repeat(60));
    console.log('\n📊 Deployment Details:');
    console.log(`   IPFS Hash (CID): ${ipfsHash}`);
    console.log(`   Pin Size: ${(ipfsHashSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Timestamp: ${response.data.Timestamp}`);
    
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
    console.log('   2. Update ENS record (if you have dwallet.eth):');
    console.log(`      - Content Hash: ipfs://${ipfsHash}`);
    console.log('   3. Access via ENS: https://dwallet.eth.limo');
    console.log('\n⚠️  Important:');
    console.log('   - Pinata automatically pins your content');
    console.log('   - Content is now available on IPFS network');
    console.log('   - Save this IPFS hash for future reference');
    console.log('   - To update, deploy again and update ENS record');

    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      ipfsHash: ipfsHash,
      pinSize: ipfsHashSize,
      pinataTimestamp: response.data.Timestamp,
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
      },
      pinata: {
        apiKey: PINATA_API_KEY.substring(0, 10) + '...',
        region: 'FRA1, NYC1',
      }
    };

    const outputPath = path.join(__dirname, `pinata-deployment-${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${outputPath}`);

    return ipfsHash;

  } catch (error) {
    console.error('\n❌ Pinata deployment failed!');
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check Pinata API credentials are correct');
    console.log('   2. Verify Pinata account has available storage');
    console.log('   3. Check network connectivity');
    console.log('   4. Try again in a few minutes');
    
    throw error;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🌐 dWallet Frontend - Pinata IPFS Deployment');
  console.log('='.repeat(60));
  console.log('');

  // Build frontend
  const buildSuccess = await buildFrontend();
  if (!buildSuccess) {
    process.exit(1);
  }

  // Deploy to Pinata
  const ipfsHash = await deployToPinata();

  console.log('\n' + '='.repeat(60));
  console.log('🎉 All Done!');
  console.log('='.repeat(60));
  console.log('\nYour decentralized frontend is now live on IPFS! 🚀');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
