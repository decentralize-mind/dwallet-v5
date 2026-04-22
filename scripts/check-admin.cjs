const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 Checking admin users...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/dwallet_admin'
});

async function checkAdmin() {
  let client;
  
  try {
    client = await pool.connect();
    
    const result = await client.query(`
      SELECT id, type, locked_until, failed_attempts, created_at 
      FROM admin_users
    `);
    
    console.log(`\n📊 Found ${result.rowCount} admin user(s):\n`);
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Type: ${row.type}`);
      console.log(`   Locked until: ${row.locked_until || 'Not locked'}`);
      console.log(`   Failed attempts: ${row.failed_attempts || 0}`);
      console.log(`   Created: ${row.created_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

checkAdmin();
