
const { Client } = require('pg');

async function checkCatoleCoverage() {
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
    
    // Search for CTOs in Campina Grande with "Catolé" in address
    const res = await client.query(`
      SELECT name, address, latitude, longitude 
      FROM ctos 
      WHERE city_id = 6 AND (address ILIKE '%Catolé%' OR address ILIKE '%Alderico%')
    `);
    
    console.log(`Found ${res.rows.length} CTOs related to Catolé/Alderico in Campina Grande.`);
    res.rows.forEach(r => {
      console.log(`- ${r.name} | GPS: ${r.latitude ? 'YES' : 'NO'} | Address: ${r.address}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkCatoleCoverage();
