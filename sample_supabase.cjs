
const { Client } = require('pg');

async function analyze() {
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
    // Get 50 samples with address but no GPS
    const res = await client.query("SELECT address FROM ctos WHERE latitude IS NULL AND address IS NOT NULL LIMIT 50");
    console.log('--- Address samples from Supabase ---');
    res.rows.forEach((r, i) => console.log(`${i+1}. ${r.address}`));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

analyze();
