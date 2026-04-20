/**
 * 🔐 HMAC REQUEST SIGNING
 * 
 * Prevents request tampering by requiring cryptographic signatures
 * Used for: Critical contract operations (pause, mint, burn, upgrade)
 */

const crypto = require('crypto');

// Secret key for signing (should be different from other keys)
const REQUEST_SIGNING_SECRET = process.env.REQUEST_SIGNING_SECRET;

if (!REQUEST_SIGNING_SECRET) {
  console.warn('⚠️  WARNING: REQUEST_SIGNING_SECRET not set. HMAC signing disabled.');
}

/**
 * Generate HMAC signature for a request
 * @param {Object} params - Request parameters
 * @param {string} params.method - HTTP method
 * @param {string} params.path - Request path
 * @param {number} params.timestamp - Unix timestamp (ms)
 * @param {Object} params.body - Request body
 * @returns {string} - HMAC signature (hex)
 */
function generateSignature({ method, path, timestamp, body }) {
  if (!REQUEST_SIGNING_SECRET) {
    throw new Error('REQUEST_SIGNING_SECRET not configured');
  }

  // Create canonical request string
  const payload = `${method}${path}${timestamp}${JSON.stringify(body || {})}`;
  
  // Generate HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', REQUEST_SIGNING_SECRET)
    .update(payload)
    .digest('hex');

  return signature;
}

/**
 * Middleware: Verify HMAC request signature
 * Applied to critical routes only
 */
function verifyRequestSignature(req, res, next) {
  if (!REQUEST_SIGNING_SECRET) {
    // Allow request through if signing not configured (development)
    console.warn('⚠️  Skipping HMAC verification - REQUEST_SIGNING_SECRET not set');
    return next();
  }

  const timestamp = req.headers['x-request-timestamp'];
  const signature = req.headers['x-request-signature'];

  // Check required headers
  if (!timestamp || !signature) {
    return res.status(401).json({
      error: 'Missing request signature',
      message: 'Critical operations require HMAC request signing',
      required: ['x-request-timestamp', 'x-request-signature']
    });
  }

  // Check timestamp validity (reject requests older than 5 minutes)
  const requestTime = parseInt(timestamp);
  const currentTime = Date.now();
  const timeDifference = Math.abs(currentTime - requestTime);
  const maxAge = 5 * 60 * 1000; // 5 minutes

  if (timeDifference > maxAge) {
    return res.status(400).json({
      error: 'Request expired',
      message: `Request is older than 5 minutes. Current time: ${currentTime}, Request time: ${requestTime}`
    });
  }

  // Generate expected signature
  const expectedSignature = generateSignature({
    method: req.method,
    path: req.originalUrl || req.url,
    timestamp: requestTime,
    body: req.body
  });

  // Compare signatures (timing-safe comparison)
  const signaturesMatch = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );

  if (!signaturesMatch) {
    // Log potential tampering attempt
    console.error('❌ HMAC signature mismatch:', {
      ip: req.ip,
      method: req.method,
      path: req.path,
      adminId: req.admin?.id
    });

    return res.status(401).json({
      error: 'Invalid request signature',
      message: 'Request signature verification failed. Possible tampering detected.'
    });
  }

  // Signature valid - proceed
  next();
}

/**
 * Middleware: Require HMAC for POST/DELETE/PUT only
 * GET requests don't need signing
 */
function requireSignatureForMutations(req, res, next) {
  const requiresSignature = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  
  if (requiresSignature) {
    return verifyRequestSignature(req, res, next);
  }
  
  // GET requests don't need signing
  next();
}

/**
 * Client-side helper: Sign a request before sending
 * 
 * Example usage in frontend:
 * ```javascript
 * const signedHeaders = signRequest({
 *   method: 'POST',
 *   path: '/api/admin/contracts/pause',
 *   body: { contractAddress: '0x...' }
 * });
 * 
 * fetch('/api/admin/contracts/pause', {
 *   method: 'POST',
 *   headers: {
 *     ...signedHeaders,
 *     'Content-Type': 'application/json',
 *     'Authorization': 'Bearer ' + token
 *   },
 *   body: JSON.stringify(body)
 * });
 * ```
 */
function signRequestForClient({ method, path, body }) {
  const timestamp = Date.now().toString();
  
  const signature = generateSignature({
    method,
    path,
    timestamp: parseInt(timestamp),
    body
  });

  return {
    'x-request-timestamp': timestamp,
    'x-request-signature': signature
  };
}

module.exports = {
  verifyRequestSignature,
  requireSignatureForMutations,
  generateSignature,
  signRequestForClient,
  REQUEST_SIGNING_SECRET
};
