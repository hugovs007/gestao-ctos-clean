
const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function testSpecificAddress() {
  const address = "RUA ALDERICO PESSOA DE OLIVEIRA, 246, CATOLE, CAMPINA GRANDE, PB, 58410430";
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;

  console.log(`Testing address: ${address}`);

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
    
    // 1. Geocode via Google
    let lat, lng;
    if (googleKey) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK') {
        lat = data.results[0].geometry.location.lat;
        lng = data.results[0].geometry.location.lng;
        console.log(`✅ Geocoded to: ${lat}, ${lng}`);
      } else {
        console.log(`❌ Google Geocoding failed: ${data.status}`);
        return;
      }
    }

    if (lat && lng) {
      // 2. Search for nearby CTOs (within 200m)
      const radiusKm = 0.2;
      const result = await client.query(`
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
        )
        SELECT * FROM cto_distances
        WHERE distance <= $3
        ORDER BY distance ASC
      `, [lat, lng, radiusKm]);

      console.log(`Found ${result.rows.length} CTOs within 200m.`);
      result.rows.forEach(r => {
        console.log(`- ${r.name} | Distance: ${(r.distance * 1000).toFixed(1)}m`);
      });

      if (result.rows.length === 0) {
        // Check closest regardless of radius
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
          )
          SELECT * FROM cto_distances
          ORDER BY distance ASC
          LIMIT 5
        `, [lat, lng]);
        
        console.log('\nClosest CTOs found:');
        closest.rows.forEach(r => {
          console.log(`- ${r.name} | Distance: ${(r.distance * 1000).toFixed(1)}m | Coords: ${r.latitude}, ${r.longitude}`);
        });
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

testSpecificAddress();
