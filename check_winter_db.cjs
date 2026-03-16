
const { Client } = require('pg');

async function checkCtoData() {
  const connectionString = 'postgresql://neondb_owner:npg_oInDt2H6EWUh@ep-winter-mode-ac8fc3d9.sa-east-1.aws.neon.tech/neondb?sslmode=require';
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Winter Mode DB');
    
    const res = await client.query("SELECT COUNT(*) FROM ctos");
    console.log('Total CTOs:', res.rows[0].count);

    const sample = await client.query(`
      SELECT c.name, c.latitude, c.longitude, ci.name as city_name 
      FROM ctos c 
      JOIN cities ci ON c.city_id = ci.id 
      WHERE c.latitude IS NOT NULL 
      LIMIT 5
    `);
    console.table(sample.rows);

  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.end();
  }
}

checkCtoData();
