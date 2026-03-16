
const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const cities = await client.query('SELECT id, name FROM cities');
    console.log('\n--- Cities ---');
    console.table(cities.rows);

    const ctos = await client.query(`
      SELECT c.name, c.address, c.latitude, c.longitude, ci.name as city_name 
      FROM ctos c 
      JOIN cities ci ON c.city_id = ci.id
    `);
    
    console.log('\n--- CTOs ---');
    console.table(ctos.rows.map(r => ({
      city: r.city_name,
      name: r.name,
      address: r.address ? (r.address.length > 20 ? r.address.substring(0, 17) + '...' : r.address) : 'NULL',
      lat: r.latitude,
      lng: r.longitude,
      has_gps: r.latitude !== null && r.longitude !== null
    })));

  } catch (err) {
    console.error('Error detail:', err);
  } finally {
    await client.end();
  }
}

run();
