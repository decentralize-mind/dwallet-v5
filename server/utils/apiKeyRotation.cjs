/**
 * 🔑 API KEY ROTATION SYSTEM
 * 
 * Implements automatic API key expiration and rotation:
 * - 90-day expiration for all API keys
 * - Automatic key rotation warnings
 * - Key revocation capabilities
 * - Audit trail for key management
 */

const crypto = require('crypto');
const { Pool } = require('pg');

// Configuration
const KEY_EXPIRATION_DAYS = 90;
const WARNING_DAYS_BEFORE_EXPIRY = 14; // Warn 2 weeks before expiry

/**
 * Generate a secure API key
 */
function generateAPIKey(prefix = 'toklo') {
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${timestamp}_${randomBytes}`;
}

/**
 * Hash API key for storage (never store plain text keys)
 */
function hashAPIKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Create new API key with expiration
 */
async function createAPIKey(pool, adminId, keyName, permissions = []) {
  const apiKey = generateAPIKey();
  const hashedKey = hashAPIKey(apiKey);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + KEY_EXPIRATION_DAYS);

  try {
    const result = await pool.query(
      `INSERT INTO api_keys 
       (admin_id, key_name, key_hash, permissions, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, key_name, permissions, expires_at, created_at`,
      [adminId, keyName, hashedKey, permissions, expiresAt]
    );

    console.log(`🔑 API Key created: ${keyName} for admin ${adminId}`);
    
    // Return the actual key (only time it's visible) and metadata
    return {
      apiKey, // ⚠️ Only returned once - user must save it
      metadata: result.rows[0]
    };
  } catch (error) {
    console.error('Failed to create API key:', error);
    throw error;
  }
}

/**
 * Validate API key
 */
async function validateAPIKey(pool, apiKey) {
  const hashedKey = hashAPIKey(apiKey);

  try {
    const result = await pool.query(
      `SELECT id, admin_id, key_name, permissions, expires_at, is_active, last_used_at
       FROM api_keys 
       WHERE key_hash = $1`,
      [hashedKey]
    );

    if (result.rows.length === 0) {
      return { valid: false, reason: 'Invalid API key' };
    }

    const keyData = result.rows[0];

    // Check if key is active
    if (!keyData.is_active) {
      return { valid: false, reason: 'API key has been revoked' };
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(keyData.expires_at);
    
    if (now > expiresAt) {
      return { valid: false, reason: 'API key has expired' };
    }

    // Update last used timestamp
    await pool.query(
      `UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [keyData.id]
    );

    return {
      valid: true,
      adminId: keyData.admin_id,
      keyName: keyData.key_name,
      permissions: keyData.permissions,
      expiresAt: keyData.expires_at,
      daysUntilExpiry: Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
    };
  } catch (error) {
    console.error('Failed to validate API key:', error);
    return { valid: false, reason: 'Validation error' };
  }
}

/**
 * Check for expiring keys and send alerts
 */
async function checkExpiringKeys(pool, sendAlert) {
  try {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + WARNING_DAYS_BEFORE_EXPIRY);

    const result = await pool.query(
      `SELECT id, admin_id, key_name, expires_at, admin_users.email
       FROM api_keys
       JOIN admin_users ON api_keys.admin_id = admin_users.id
       WHERE is_active = true 
       AND expires_at <= $1 
       AND expires_at > CURRENT_TIMESTAMP
       AND (last_warning_sent IS NULL OR last_warning_sent < CURRENT_TIMESTAMP - INTERVAL '7 days')`,
      [warningDate]
    );

    if (result.rows.length > 0) {
      console.log(`⚠️  Found ${result.rows.length} API keys expiring soon`);

      for (const key of result.rows) {
        const daysLeft = Math.ceil((new Date(key.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
        
        // Send alert
        if (sendAlert) {
          await sendAlert({
            type: 'API Key Expiring Soon',
            severity: 'medium',
            adminId: key.admin_id,
            details: `API Key "${key.key_name}" expires in ${daysLeft} days (${key.expires_at}). Please rotate this key.`,
            timestamp: new Date().toISOString()
          });
        }

        // Update last warning timestamp
        await pool.query(
          `UPDATE api_keys SET last_warning_sent = CURRENT_TIMESTAMP WHERE id = $1`,
          [key.id]
        );
      }
    }

    return result.rows;
  } catch (error) {
    console.error('Failed to check expiring keys:', error);
    return [];
  }
}

/**
 * Revoke API key
 */
async function revokeAPIKey(pool, keyId, adminId, reason = '') {
  try {
    await pool.query(
      `UPDATE api_keys 
       SET is_active = false, revoked_at = CURRENT_TIMESTAMP, revoke_reason = $1
       WHERE id = $2 AND admin_id = $3`,
      [reason, keyId, adminId]
    );

    console.log(`🚫 API Key revoked: ${keyId} by admin ${adminId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to revoke API key:', error);
    throw error;
  }
}

/**
 * Rotate API key (revoke old, create new)
 */
async function rotateAPIKey(pool, oldKeyId, adminId, keyName, permissions = [], sendAlert) {
  try {
    // Revoke old key
    await revokeAPIKey(pool, oldKeyId, adminId, 'Rotated');

    // Create new key
    const newKeyData = await createAPIKey(pool, adminId, keyName, permissions);

    // Send alert
    if (sendAlert) {
      await sendAlert({
        type: 'API Key Rotated',
        severity: 'low',
        adminId,
        details: `API Key "${keyName}" has been rotated. Old key revoked, new key created.`,
        timestamp: new Date().toISOString()
      });
    }

    return newKeyData;
  } catch (error) {
    console.error('Failed to rotate API key:', error);
    throw error;
  }
}

/**
 * Get all API keys for an admin
 */
async function getAdminAPIKeys(pool, adminId) {
  try {
    const result = await pool.query(
      `SELECT id, key_name, permissions, is_active, created_at, expires_at, 
              last_used_at, revoked_at, revoke_reason,
              CASE 
                WHEN expires_at <= CURRENT_TIMESTAMP THEN 'expired'
                WHEN is_active = false THEN 'revoked'
                WHEN expires_at <= CURRENT_TIMESTAMP + INTERVAL '${WARNING_DAYS_BEFORE_EXPIRY} days' THEN 'expiring_soon'
                ELSE 'active'
              END as status
       FROM api_keys
       WHERE admin_id = $1
       ORDER BY created_at DESC`,
      [adminId]
    );

    return result.rows;
  } catch (error) {
    console.error('Failed to get API keys:', error);
    throw error;
  }
}

/**
 * Clean up expired keys (mark as inactive)
 */
async function cleanupExpiredKeys(pool) {
  try {
    const result = await pool.query(
      `UPDATE api_keys 
       SET is_active = false 
       WHERE expires_at <= CURRENT_TIMESTAMP 
       AND is_active = true
       RETURNING id, key_name, admin_id`
    );

    if (result.rows.length > 0) {
      console.log(`🧹 Cleaned up ${result.rows.length} expired API keys`);
    }

    return result.rows;
  } catch (error) {
    console.error('Failed to cleanup expired keys:', error);
    return [];
  }
}

module.exports = {
  generateAPIKey,
  hashAPIKey,
  createAPIKey,
  validateAPIKey,
  checkExpiringKeys,
  revokeAPIKey,
  rotateAPIKey,
  getAdminAPIKeys,
  cleanupExpiredKeys,
  KEY_EXPIRATION_DAYS,
  WARNING_DAYS_BEFORE_EXPIRY
};
