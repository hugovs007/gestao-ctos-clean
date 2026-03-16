
const { Client } = require('pg');

async function checkRemaining() {
  const client = new Client({
    user: 'postgres.omxelcqvaahvrqqaxvps',
    host: 'aws-1-us-east-2.pooler.supabase.com',
    database: 'postgres',
    password: 'Z5ASBF5zGXS37D72',
    port: 6543,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query("SELECT address FROM ctos WHERE latitude IS NULL AND address IS NOT NULL LIMIT 50");
    console.log('--- Remaining 193 (Samples) ---');
    res.rows.forEach(r => console.log(`- ${r.address}`));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkRemaining();
