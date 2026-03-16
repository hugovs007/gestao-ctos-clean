
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function checkDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    console.log('--- CTO Count ---');
    const countRes = await client.query('SELECT COUNT(*) FROM ctos');
    console.log('Total CTOs:', countRes.rows[0].count);
    
    console.log('\n--- Cities in DB ---');
    const citiesRes = await client.query('SELECT name FROM cities');
    console.log('Cities:', citiesRes.rows.map(r => r.name).join(', '));
    
    console.log('\n--- Sample CTOs ---');
    const ctosRes = await client.query('SELECT name, latitude, longitude, city_id FROM ctos LIMIT 10');
    console.log(JSON.stringify(ctosRes.rows, null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkDb();
