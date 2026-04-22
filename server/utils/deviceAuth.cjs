/**
 * 🔐 Device Fingerprint & MAC Address Authentication
 * 
 * Alternative authentication methods:
 * 1. MAC Address verification (local network)
 * 2. Device fingerprint (browser-based)
 * 3. Hardware ID binding
 * 
 * Features:
 * - MAC address collection (Node.js backend)
 * - Device fingerprint generation (browser frontend)
 * - Multi-factor device authentication
 * - Trusted device management
 */

const crypto = require('crypto');
const { exec } = require('child_process');

/**
 * Get MAC address of current machine (backend)
 * Works on macOS, Linux, Windows
 */
function getMACAddress() {
  return new Promise((resolve, reject) => {
    const platform = process.platform;
    let command;

    switch (platform) {
      case 'darwin': // macOS
        command = "networksetup -listallhardwareports | awk '/Ether/{getline;print $3}' | head -n 1";
        break;
      case 'linux':
        command = "cat /sys/class/net/$(route | grep '^default' | awk '{print $NF}')/address 2>/dev/null || ip link show | awk '/link\\/ether/{print $2; exit}'";
        break;
      case 'win32':
        command = "getmac /fo csv /nh | head -n 1";
        break;
      default:
        return reject(new Error(`Unsupported platform: ${platform}`));
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      
      const mac = stdout.trim().replace(/"/g, '').toUpperCase();
      
      // Validate MAC address format
      if (/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/.test(mac)) {
        resolve(mac);
      } else {
        reject(new Error('Invalid MAC address format'));
      }
    });
  });
}

/**
 * Generate device fingerprint from browser (frontend)
 * Creates a unique identifier based on browser/system characteristics
 */
function generateDeviceFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 1,
    navigator.deviceMemory || 1,
    screen.colorDepth,
  ];

  // Create hash from components
  const fingerprint = components.join('|');
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

/**
 * Get all network interfaces with MAC addresses
 */
function getNetworkInterfaces() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const macAddresses = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    for (const addr of addresses) {
      if (addr.mac && addr.mac !== '00:00:00:00:00:00') {
        macAddresses.push({
          interface: name,
          mac: addr.mac.toUpperCase(),
          internal: addr.internal,
          family: addr.family,
        });
      }
    }
  }

  return macAddresses;
}

/**
 * Verify MAC address against whitelist
 */
function verifyMACAddress(macAddress, allowedMACs) {
  const normalizedMAC = macAddress.toUpperCase().replace(/[:-]/g, ':');
  
  return allowedMACs.some(allowed => {
    const normalizedAllowed = allowed.toUpperCase().replace(/[:-]/g, ':');
    return normalizedMAC === normalizedAllowed;
  });
}

/**
 * Create device authentication middleware
 */
function createDeviceAuthMiddleware(options = {}) {
  const {
    requireDeviceRegistration = false,
    allowedMACs = [],
    allowedFingerprints = [],
    onDeviceVerified = null,
  } = options;

  return async (req, res, next) => {
    try {
      const deviceMAC = req.headers['x-device-mac'];
      const deviceFingerprint = req.headers['x-device-fingerprint'];

      // Verify MAC address if provided
      if (deviceMAC && allowedMACs.length > 0) {
        const isMACAllowed = verifyMACAddress(deviceMAC, allowedMACs);
        
        if (!isMACAllowed) {
          return res.status(403).json({
            error: 'Device not authorized',
            message: 'MAC address not in whitelist',
            requireRegistration: true,
          });
        }
      }

      // Verify device fingerprint if provided
      if (deviceFingerprint && allowedFingerprints.length > 0) {
        const isFingerprintAllowed = allowedFingerprints.includes(deviceFingerprint);
        
        if (!isFingerprintAllowed) {
          return res.status(403).json({
            error: 'Device not authorized',
            message: 'Device fingerprint not recognized',
            requireRegistration: true,
          });
        }
      }

      // Attach device info to request
      req.device = {
        mac: deviceMAC || null,
        fingerprint: deviceFingerprint || null,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      };

      if (onDeviceVerified) {
        onDeviceVerified(req.device);
      }

      next();
    } catch (error) {
      console.error('Device authentication error:', error.message);
      next(); // Fail open
    }
  };
}

/**
 * Register new device
 */
async function registerDevice(req, res) {
  try {
    const { deviceName, macAddress, fingerprint } = req.body;
    
    // Get server-side MAC if not provided
    let serverMAC = macAddress;
    if (!serverMAC) {
      try {
        serverMAC = await getMACAddress();
      } catch (error) {
        // MAC collection failed, continue with fingerprint only
      }
    }

    // Generate registration token
    const registrationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store device registration (in database)
    const deviceData = {
      id: crypto.randomUUID(),
      name: deviceName || 'Unknown Device',
      macAddress: serverMAC,
      fingerprint,
      registrationToken,
      expiresAt,
      registeredAt: new Date(),
      ipAddress: req.ip,
      isActive: true,
    };

    // TODO: Save to database
    // await pool.query('INSERT INTO devices ...', [deviceData]);

    res.json({
      success: true,
      device: {
        id: deviceData.id,
        name: deviceData.name,
        macAddress: deviceData.macAddress,
        fingerprint: deviceData.fingerprint,
        registrationToken: deviceData.registrationToken,
      },
      message: 'Device registered successfully',
    });
  } catch (error) {
    console.error('Device registration error:', error.message);
    res.status(500).json({ error: 'Failed to register device' });
  }
}

/**
 * List all network interfaces (for debugging)
 */
function listNetworkInterfaces() {
  const interfaces = getNetworkInterfaces();
  
  console.log('\n🔍 Network Interfaces:');
  console.log('═'.repeat(60));
  
  interfaces.forEach((iface, index) => {
    console.log(`${index + 1}. ${iface.interface}`);
    console.log(`   MAC: ${iface.mac}`);
    console.log(`   Internal: ${iface.internal}`);
    console.log(`   Family: ${iface.family}`);
    console.log('');
  });
  
  return interfaces;
}

// ─────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────

module.exports = {
  getMACAddress,
  generateDeviceFingerprint,
  getNetworkInterfaces,
  verifyMACAddress,
  createDeviceAuthMiddleware,
  registerDevice,
  listNetworkInterfaces,
};
