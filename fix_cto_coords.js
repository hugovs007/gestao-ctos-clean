
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function checkAndFix() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    const res = await client.query('SELECT id, name, address, latitude, longitude FROM ctos');
    const ctos = res.rows;
    
    console.log(`Total CTOs: ${ctos.length}`);
    const missing = ctos.filter(c => c.latitude === null || c.longitude === null);
    console.log(`CTOs missing coordinates: ${missing.length}`);
    
    if (missing.length > 0) {
      console.log('Sample missing coords:');
      console.table(missing.slice(0, 5).map(c => ({ name: c.name, address: c.address })));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkAndFix();
