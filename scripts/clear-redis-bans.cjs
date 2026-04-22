const redis = require('redis');
require('dotenv').config();

console.log('🔓 Clearing Redis rate limits and bans...');

async function clearRedis() {
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  try {
    await client.connect();
    console.log('✅ Connected to Redis');

    // Get all keys
    const keys = await client.keys('*');
    console.log(`\n📊 Found ${keys.length} keys in Redis`);

    // Delete rate limit and ban related keys
    const toDelete = keys.filter(key => 
      key.includes('rate') || 
      key.includes('ban') || 
      key.includes('limit') ||
      key.includes('lock')
    );

    if (toDelete.length > 0) {
      await client.del(toDelete);
      console.log(`✅ Deleted ${toDelete.length} rate limit/ban key(s)`);
    } else {
      console.log('ℹ️  No rate limit/ban keys found');
    }

    console.log('\n✅ Redis cleared! You can now login again.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.quit();
  }
}

clearRedis();
