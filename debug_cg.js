
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function checkCampinaGrande() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    console.log('--- Checking Campina Grande ---');
    const cities = await client.query("SELECT id, name FROM cities WHERE name ILIKE '%Campina Grande%'");
    
    if (cities.rows.length === 0) {
      console.log('City "Campina Grande" not found in database.');
      return;
    }

    for (const city of cities.rows) {
      console.log(`\nCity: ${city.name} (ID: ${city.id})`);
      const res = await client.query(
        "SELECT id, name, address, latitude, longitude, total_ports FROM ctos WHERE city_id = $1", 
        [city.id]
      );
      
      if (res.rows.length === 0) {
        console.log('No CTOs found for this city.');
      } else {
        console.table(res.rows.map(r => ({
          name: r.name,
          address: r.address ? (r.address.length > 30 ? r.address.substring(0, 27) + '...' : r.address) : 'EMPTY',
          lat: r.latitude,
          lng: r.longitude,
          ports: r.total_ports
        })));
        
        const missing = res.rows.filter(r => r.latitude === null || r.longitude === null).length;
        console.log(`CTOs missing coords: ${missing} / ${res.rows.length}`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkCampinaGrande();
