const { Pool } = require('pg');
require('dotenv').config();

console.log('🔓 Clearing all IP bans...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/dwallet_admin'
});

async function clearBans() {
  let client;
  
  try {
    client = await pool.connect();
    
    // Clear all IP bans
    const result = await client.query(`
      UPDATE ip_bans 
      SET is_active = false, 
          unbanned_at = NOW()
      WHERE is_active = true
    `);
    
    console.log(`✅ Cleared ${result.rowCount} active IP ban(s)`);
    
    // Also reset admin user lockouts just in case
    const adminResult = await client.query(`
      UPDATE admin_users 
      SET locked_until = NULL, 
          failed_attempts = 0 
      WHERE locked_until IS NOT NULL OR failed_attempts > 0
    `);
    
    console.log(`✅ Reset ${adminResult.rowCount} admin user lockout(s)`);
    
    console.log('\n✅ All bans cleared! You can now login again.');
    
  } catch (error) {
    console.error('❌ Error clearing bans:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

clearBans();
