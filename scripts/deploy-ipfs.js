/**
 * Deploy Frontend to IPFS
 * 
 * This script builds the frontend and deploys it to IPFS using:
 * - IPFS (via ipfs-http-client or web3.storage)
 * - Optional: Pin to Pinata for persistence
 * 
 * Usage:
 *   node scripts/deploy-ipfs.js
 * 
 * Required:
 *   - WEB3_STORAGE_TOKEN (get from https://web3.storage)
 *   - Or PINATA_API_KEY and PINATA_SECRET_KEY
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  WEB3_STORAGE_TOKEN: process.env.WEB3_STORAGE_TOKEN || '',
  PINATA_API_KEY: process.env.PINATA_API_KEY || '',
  PINATA_SECRET_KEY: process.env.PINATA_SECRET_KEY || '',
  BUILD_DIR: path.join(__dirname, '..', 'dist'),
};

async function buildFrontend() {
  console.log('🔨 Building frontend...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ Frontend built successfully!');
    return true;
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    return false;
  }
}

async function deployToIPFS() {
  console.log('\n📦 Deploying to IPFS...\n');

  // Check if build directory exists
  if (!fs.existsSync(CONFIG.BUILD_DIR)) {
    console.error('❌ Build directory not found. Run npm run build first.');
    process.exit(1);
  }

  // Method 1: Using web3.storage (recommended)
  if (CONFIG.WEB3_STORAGE_TOKEN) {
    return await deployWithWeb3Storage();
  }

  // Method 2: Using Pinata
  if (CONFIG.PINATA_API_KEY && CONFIG.PINATA_SECRET_KEY) {
    return await deployWithPinata();
  }

  // Method 3: Using IPFS CLI (if available)
  try {
    return await deployWithIPFSCli();
  } catch (error) {
    console.error('❌ No IPFS deployment method available.');
    console.log('\n📝 Please set one of the following:');
    console.log('  - WEB3_STORAGE_TOKEN (recommended)');
    console.log('  - PINATA_API_KEY and PINATA_SECRET_KEY');
    console.log('  - Or install IPFS CLI: brew install kubo');
    process.exit(1);
  }
}

async function deployWithWeb3Storage() {
  console.log('🌐 Using web3.storage for IPFS deployment...');
  
  try {
    // Install web3.storage if not present
    execSync('npm install web3.storage', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

    const { Web3Storage, getFilesFromPath } = await import('web3.storage');
    const client = new Web3Storage({ token: CONFIG.WEB3_STORAGE_TOKEN });

    console.log('📤 Uploading to IPFS...');
    const files = await getFilesFromPath(CONFIG.BUILD_DIR);
    const cid = await client.put(files, {
      wrapWithDirectory: true,
      maxRetries: 3,
    });

    console.log('✅ Upload complete!');
    console.log('🔗 IPFS CID:', cid);
    console.log('🌐 Gateway URL:', `https://${cid}.ipfs.dweb.link`);
    console.log('🌐 Alternative:', `https://ipfs.io/ipfs/${cid}`);

    return { cid, gateway: `https://${cid}.ipfs.dweb.link` };
  } catch (error) {
    console.error('❌ web3.storage deployment failed:', error.message);
    throw error;
  }
}

async function deployWithPinata() {
  console.log('📌 Using Pinata for IPFS deployment...');

  try {
    const axios = require('axios');
    const formData = require('form-data');

    // Read all files from build directory
    const form = new formData();
    form.append('file', fs.createReadStream(path.join(CONFIG.BUILD_DIR, 'index.html')), {
      filepath: 'index.html',
    });

    // Add other files
    const addFileToForm = (dir, baseDir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          addFileToForm(filePath, baseDir);
        } else {
          const relativePath = path.relative(baseDir, filePath);
          form.append('file', fs.createReadStream(filePath), {
            filepath: relativePath,
          });
        }
      });
    };

    addFileToForm(CONFIG.BUILD_DIR, CONFIG.BUILD_DIR);

    console.log('📤 Uploading to Pinata...');
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      form,
      {
        maxBodyLength: 'Infinity',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${form._boundary}`,
          pinata_api_key: CONFIG.PINATA_API_KEY,
          pinata_secret_api_key: CONFIG.PINATA_SECRET_KEY,
        },
      }
    );

    const cid = response.data.IpfsHash;
    console.log('✅ Upload complete!');
    console.log('🔗 IPFS CID:', cid);
    console.log('🌐 Pinata Gateway:', `https://${cid}.ipfs.pinata.cloud`);
    console.log('🌐 Public Gateway:', `https://ipfs.io/ipfs/${cid}`);

    return { cid, gateway: `https://${cid}.ipfs.pinata.cloud` };
  } catch (error) {
    console.error('❌ Pinata deployment failed:', error.message);
    throw error;
  }
}

async function deployWithIPFSCli() {
  console.log('🖥️  Using IPFS CLI...');

  try {
    // Check if IPFS is installed
    execSync('ipfs version', { stdio: 'pipe' });

    // Start IPFS daemon if not running
    try {
      execSync('ipfs swarm peers', { stdio: 'pipe' });
    } catch {
      console.log('🚀 Starting IPFS daemon...');
      execSync('ipfs daemon &', { stdio: 'pipe' });
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Add directory to IPFS
    console.log('📤 Adding to IPFS...');
    const output = execSync(`ipfs add -r -q ${CONFIG.BUILD_DIR}`, { encoding: 'utf-8' });
    const lines = output.trim().split('\n');
    const cid = lines[lines.length - 1];

    console.log('✅ Added to IPFS!');
    console.log('🔗 IPFS CID:', cid);
    console.log('🌐 Local Gateway:', `http://localhost:8080/ipfs/${cid}`);
    console.log('🌐 Public Gateway:', `https://ipfs.io/ipfs/${cid}`);

    return { cid, gateway: `http://localhost:8080/ipfs/${cid}` };
  } catch (error) {
    throw new Error('IPFS CLI not available');
  }
}

async function updateENSRecord(cid) {
  console.log('\n🔄 Updating ENS record (optional)...');
  console.log('📝 To update your ENS record to point to this IPFS hash:');
  console.log(`   1. Go to https://app.ens.domains`);
  console.log(`   2. Select your domain (e.g., dwallet.eth)`);
  console.log(`   3. Edit Content Hash`);
  console.log(`   4. Set to: ipfs://${cid}`);
  console.log(`   5. Or use: ipns://${cid}`);
  console.log('\n   Your site will be available at:');
  console.log(`   https://dwallet.eth.limo`);
  console.log(`   https://dwallet.eth.link`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('🌐 dWallet Frontend IPFS Deployment');
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Build frontend
  const buildSuccess = await buildFrontend();
  if (!buildSuccess) {
    process.exit(1);
  }

  // Step 2: Deploy to IPFS
  const result = await deployToIPFS();

  // Step 3: Save deployment info
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    ipfsHash: result.cid,
    gateway: result.gateway,
    urls: {
      dweb: `https://${result.cid}.ipfs.dweb.link`,
      ipfsio: `https://ipfs.io/ipfs/${result.cid}`,
      cloudflare: `https://cloudflare-ipfs.com/ipfs/${result.cid}`,
      pinata: result.cid ? `https://${result.cid}.ipfs.pinata.cloud` : null,
    },
    ens: `ipfs://${result.cid}`,
  };

  const outputPath = path.join(__dirname, `ipfs-deployment-${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${outputPath}`);

  // Step 4: Instructions for ENS
  await updateENSRecord(result.cid);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Deployment complete!');
  console.log('='.repeat(60));
  console.log('\n🌐 Access your decentralized frontend:');
  console.log(`   Primary: ${result.gateway}`);
  console.log(`   Backup:  https://ipfs.io/ipfs/${result.cid}`);
  console.log('\n⚠️  Important:');
  console.log('   - IPFS hashes are immutable');
  console.log('   - To update, deploy again and update ENS record');
  console.log('   - Pin to multiple services for persistence');
  console.log('   - Consider setting up IPNS for mutable references');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
