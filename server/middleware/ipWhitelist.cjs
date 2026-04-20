/**
 * 🔒 IP WHITELIST MIDDLEWARE
 * 
 * Restricts admin access to specific IP addresses only.
 * Add this to enterprise-secure-server.cjs
 */

const fs = require('fs');
const path = require('path');

// Load allowed IPs from environment
const ADMIN_ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS 
  ? process.env.ADMIN_ALLOWED_IPS.split(',').map(ip => ip.trim())
  : [];

// Log file for blocked attempts
const BLOCKED_LOG = path.join(__dirname, '../logs/ip-blocked.log');

/**
 * IP Whitelist Middleware
 * Only allow requests from whitelisted IP addresses
 */
const ipWhitelist = (req, res, next) => {
  // Skip if no IPs configured (development mode)
  if (ADMIN_ALLOWED_IPS.length === 0) {
    console.log('⚠️  WARNING: No IP whitelist configured. All IPs allowed.');
    return next();
  }

  // Get client IP (handle proxies)
  const clientIP = req.headers['x-forwarded-for'] 
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : req.ip || req.connection.remoteAddress;

  // Check if IP is whitelisted
  const isAllowed = ADMIN_ALLOWED_IPS.includes(clientIP);

  if (!isAllowed) {
    // Log blocked attempt
    const logEntry = `[${new Date().toISOString()}] BLOCKED: ${clientIP} - ${req.method} ${req.path}\n`;
    
    try {
      fs.appendFileSync(BLOCKED_LOG, logEntry);
    } catch (err) {
      console.error('Failed to write to blocked IP log:', err);
    }

    // Log to console
    console.log(`🚫 IP BLOCKED: ${clientIP} attempted to access ${req.path}`);

    // Return 403 Forbidden
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address is not authorized to access the admin panel',
      yourIP: clientIP,
      contact: 'Contact administrator to whitelist your IP'
    });
  }

  // IP is allowed, continue
  console.log(`✅ IP ALLOWED: ${clientIP}`);
  next();
};

/**
 * Get current whitelist (for admin dashboard)
 */
const getWhitelist = () => {
  return {
    allowedIPs: ADMIN_ALLOWED_IPS,
    totalAllowed: ADMIN_ALLOWED_IPS.length,
    lastUpdated: process.env.ADMIN_ALLOWED_IPS_LAST_UPDATE || 'Not set'
  };
};

/**
 * Check if IP whitelist is enabled
 */
const isWhitelistEnabled = () => {
  return ADMIN_ALLOWED_IPS.length > 0;
};

module.exports = {
  ipWhitelist,
  getWhitelist,
  isWhitelistEnabled
};
