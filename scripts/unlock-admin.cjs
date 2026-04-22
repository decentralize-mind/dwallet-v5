/**
 * Unlock Admin Account Script
 * Resets the lockout and failed attempts for admin account
 */

const { Pool } = require('pg');
require('dotenv').config();

console.log('🔓 Unlocking admin account...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/dwallet_admin'
});

async function unlockAdmin() {
  let client;
  
  try {
    client = await pool.connect();
    
    // Reset admin account lockout
    const result = await client.query(`
      UPDATE admin_users 
      SET locked_until = NULL, 
          failed_attempts = 0 
      WHERE id = 'admin-key'
    `);
    
    console.log('✅ Admin account unlocked successfully!');
    console.log(`   Rows updated: ${result.rowCount}`);
    
    // Check current status
    const admin = await client.query(`
      SELECT id, type, locked_until, failed_attempts 
      FROM admin_users 
      WHERE id = 'admin-key'
    `);
    
    if (admin.rows.length > 0) {
      const row = admin.rows[0];
      console.log('\n📊 Current admin status:');
      console.log(`   ID: ${row.id}`);
      console.log(`   Type: ${row.type}`);
      console.log(`   Locked until: ${row.locked_until || 'Not locked'}`);
      console.log(`   Failed attempts: ${row.failed_attempts}`);
    }
    
    console.log('\n✅ Done! You can now login again.');
    
  } catch (error) {
    console.error('❌ Error unlocking admin account:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

unlockAdmin();
