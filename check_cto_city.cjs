
const { Client } = require('pg');

async function checkCtoCity() {
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
    
    const res = await client.query(`
      SELECT c.name, c.city_id, ci.name as city_name 
      FROM ctos c 
      JOIN cities ci ON c.city_id = ci.id 
      WHERE c.name = 'CGEH-R14-CT4'
    `);
    
    console.log('CTO City Info:', res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkCtoCity();
