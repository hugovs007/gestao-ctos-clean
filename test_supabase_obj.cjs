
const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    user: 'postgres.omxelcqvaahvrqqaxvps',
    host: 'aws-1-us-east-2.pooler.supabase.com',
    database: 'postgres',
    password: 'Z5ASBF5zGXS37D72',
    port: 6543,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting with explicit object params (New Password)...');
    await client.connect();
    console.log('✅ Connected!');
    const res = await client.query('SELECT current_user, current_database()');
    console.log('Context:', res.rows[0]);
    
    // Check CTO count
    const ctoCount = await client.query('SELECT COUNT(*) FROM ctos');
    console.log('Total CTOs:', ctoCount.rows[0].count);
    
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await client.end();
  }
}

testConnection();
