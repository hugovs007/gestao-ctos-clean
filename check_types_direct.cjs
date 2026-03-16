
const { Client } = require('pg');

async function checkTypes() {
  const connectionString = "postgres://neondb_owner:npg_LjwZoJaC82rk@ep-bold-surf-a51pvnq8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const client = new Client({
    connectionString: connectionString,
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

    const sample = await client.query("SELECT name, latitude, longitude FROM ctos WHERE latitude IS NOT NULL LIMIT 1");
    if (sample.rows.length > 0) {
       console.log('Sample Lat/Lng:', sample.rows[0].latitude, sample.rows[0].longitude);
    } else {
       console.log('No CTOs with coordinates found.');
    }

  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.end();
  }
}

checkTypes();
