
const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();

async function debugSearch() {
  const address = "RUA ALDERICO PESSOA DE OLIVEIRA, 246, CAMPINA GRANDE, PB";
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;

  console.log(`Step 1: Geocoding "${address}"`);
  
  const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleKey}&language=pt-BR`;
  const geoRes = await fetch(geoUrl);
  const geoData = await geoRes.json();

  if (geoData.status !== 'OK') {
    console.log('Geocoding failed:', geoData.status);
    return;
  }

  const result = geoData.results[0];
  const components = result.address_components;
  const getComponent = (type) => {
    const comp = components.find((c) => c.types.includes(type));
    return comp ? comp.long_name : '';
  };

  const city = getComponent('administrative_area_level_2') || getComponent('locality');
  const lat = result.geometry.location.lat;
  const lng = result.geometry.location.lng;

  console.log(`✅ Geocoded to: ${lat}, ${lng}`);
  console.log(`✅ Extracted City: "${city}"`);

  console.log(`\nStep 2: Checking /api/viability?lat=${lat}&lng=${lng}&radius=0.5&city_name=${encodeURIComponent(city)}`);
  
  // We'll simulate the backend call logic here
  const { Client } = require('pg');
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
    
    // Simulating the backend city find
    const cityRes = await client.query("SELECT id, name FROM cities WHERE name ILIKE $1", [city]);
    console.log('City match in DB:', cityRes.rows);

    let targetCityId = cityRes.rows.length > 0 ? cityRes.rows[0].id : null;

    if (!targetCityId) {
      console.log('⚠️ No city match found in DB for this name!');
      // Check all cities to see what we have
      const allCities = await client.query("SELECT name FROM cities LIMIT 10");
      console.log('Available cities (first 10):', allCities.rows.map(c => c.name));
    } else {
      console.log(`✅ Using city_id: ${targetCityId}`);
    }

    const queryText = `
      WITH cto_distances AS (
        SELECT 
          c.*, 
          (
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0, 
                cos(radians($1)) * cos(radians(c.latitude)) * 
                cos(radians(c.longitude) - radians($2)) + 
                sin(radians($1)) * sin(radians(c.latitude))
              ))
            )
          ) AS distance
        FROM ctos c
        WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
        ${targetCityId ? 'AND c.city_id = ' + targetCityId : ''}
      )
      SELECT * FROM cto_distances
      WHERE distance <= 0.5
      ORDER BY distance ASC
    `;

    const res = await client.query(queryText, [lat, lng]);
    console.log(`\nResults found: ${res.rows.length}`);
    res.rows.forEach(r => console.log(`- ${r.name} (${(r.distance*1000).toFixed(0)}m)`));

    if (res.rows.length === 0) {
        const closest = await client.query(`
          WITH cto_distances AS (
            SELECT 
              c.*, 
              (
                6371 * acos(
                  LEAST(1.0, GREATEST(-1.0, 
                    cos(radians($1)) * cos(radians(c.latitude)) * 
                    cos(radians(c.longitude) - radians($2)) + 
                    sin(radians($1)) * sin(radians(c.latitude))
                  ))
                )
              ) AS distance
            FROM ctos c
            WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
             ${targetCityId ? 'AND c.city_id = ' + targetCityId : ''}
          )
          SELECT * FROM cto_distances
          ORDER BY distance ASC
          LIMIT 1
        `, [lat, lng]);
        if (closest.rows.length > 0) {
            console.log(`Closest in db: ${closest.rows[0].name} at ${(closest.rows[0].distance*1000).toFixed(0)}m`);
        }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

debugSearch();
