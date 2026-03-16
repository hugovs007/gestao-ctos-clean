
const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ override: true });

async function testConnection() {
  const url = process.env.DATABASE_URL;
  console.log('Connecting to:', url.replace(/:([^:@]+)@/, ':****@')); // mask password
  
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected!');
    const res = await client.query('SELECT current_user, current_database()');
    console.log('Context:', res.rows[0]);
  } catch (err) {
    console.error('❌ Failed:', err.message);
    console.error('Code:', err.code);
  } finally {
    await client.end();
  }
}

testConnection();
