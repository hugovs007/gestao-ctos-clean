
const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function checkTypes() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Check column types
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ctos' 
      AND column_name IN ('latitude', 'longitude')
    `);
    console.log('Column Types:', res.rows);

    const sample = await client.query("SELECT name, latitude, longitude FROM ctos LIMIT 3");
    console.log('Sample data:', sample.rows);
    if (sample.rows.length > 0) {
       console.log('Lat type:', typeof sample.rows[0].latitude);
       console.log('Lng type:', typeof sample.rows[0].longitude);
    }

  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.end();
  }
}

checkTypes();
