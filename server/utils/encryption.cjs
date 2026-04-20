/**
 * 🔐 DATABASE FIELD-LEVEL ENCRYPTION
 * 
 * AES-256-CBC encryption for sensitive data at rest
 * Used for: 2FA secrets, API keys, sensitive configuration
 */

const crypto = require('crypto');

// Encryption key (must be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16; // AES block size

// Validate key length
if (Buffer.from(ENCRYPTION_KEY, 'hex').length !== 32) {
  console.error('❌ CRITICAL: DB_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

/**
 * Encrypt sensitive text data
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text (IV:encrypted)
 */
function encrypt(text) {
  if (!text) return null;
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + encrypted text (IV needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt encrypted text data
 * @param {string} encryptedText - Encrypted text (IV:encrypted)
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  
  try {
    const textParts = encryptedText.split(':');
    
    if (textParts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedContent = textParts[1];
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt object fields selectively
 * @param {Object} obj - Object to encrypt
 * @param {string[]} fields - Array of field names to encrypt
 * @returns {Object} - Object with encrypted fields
 */
function encryptFields(obj, fields) {
  if (!obj || !fields) return obj;
  
  const encrypted = { ...obj };
  
  fields.forEach(field => {
    if (encrypted[field]) {
      encrypted[field] = encrypt(encrypted[field]);
    }
  });
  
  return encrypted;
}

/**
 * Decrypt object fields selectively
 * @param {Object} obj - Object with encrypted fields
 * @param {string[]} fields - Array of field names to decrypt
 * @returns {Object} - Object with decrypted fields
 */
function decryptFields(obj, fields) {
  if (!obj || !fields) return obj;
  
  const decrypted = { ...obj };
  
  fields.forEach(field => {
    if (decrypted[field]) {
      decrypted[field] = decrypt(decrypted[field]);
    }
  });
  
  return decrypted;
}

/**
 * Generate a new encryption key
 * @returns {string} - 64-character hex string (32 bytes)
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash data for integrity verification (one-way)
 * @param {string} data - Data to hash
 * @returns {string} - SHA-256 hash
 */
function hashData(data) {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

/**
 * Verify data integrity against hash
 * @param {string} data - Original data
 * @param {string} expectedHash - Expected SHA-256 hash
 * @returns {boolean} - True if data matches hash
 */
function verifyHash(data, expectedHash) {
  const actualHash = hashData(data);
  return crypto.timingSafeEqual(
    Buffer.from(actualHash, 'hex'),
    Buffer.from(expectedHash, 'hex')
  );
}

module.exports = {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  generateEncryptionKey,
  hashData,
  verifyHash,
  ENCRYPTION_KEY
};
