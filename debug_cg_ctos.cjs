
const { Client } = require('pg');

async function debugCitySearch() {
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
    
    // 1. Encontrar a cidade "Campina Grande"
    const cityRes = await client.query("SELECT * FROM cities WHERE name ILIKE '%Campina Grande%'");
    console.log('Cities found:', cityRes.rows);
    
    if (cityRes.rows.length > 0) {
      const cityId = cityRes.rows[0].id;
      
      // 2. Ver quantas CTOs tem e quantas tem GPS
      const ctoStats = await client.query(`
        SELECT COUNT(*) as total, COUNT(latitude) as with_gps 
        FROM ctos 
        WHERE city_id = $1
      `, [cityId]);
      console.log(`Stats for ${cityRes.rows[0].name}:`, ctoStats.rows[0]);
      
      // 3. Ver algumas CTOs com GPS em Campina Grande
      const ctos = await client.query(`
        SELECT name, address, latitude, longitude 
        FROM ctos 
        WHERE city_id = $1 AND latitude IS NOT NULL 
        LIMIT 5
      `, [cityId]);
      console.log('Sample CTOs with GPS:');
      ctos.rows.forEach(r => console.log(`- ${r.name} | ${r.address} | ${r.latitude}, ${r.longitude}`));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

debugCitySearch();
