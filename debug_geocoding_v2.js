
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const googleKey = process.env.GOOGLE_MAPS_API_KEY;

async function testGeocode(q, city = '') {
  const fullQuery = city ? `${q}, ${city}` : q;
  console.log(`\nTesting Geocode for: "${fullQuery}"`);
  
  if (googleKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?key=${googleKey}&language=pt-BR&address=${encodeURIComponent(fullQuery)}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        console.log(`Google Result: ${data.results[0].formatted_address} (${data.results[0].geometry.location.lat}, ${data.results[0].geometry.location.lng})`);
      } else {
        console.log(`Google Result: None (Status: ${data.status})`);
      }
    } catch (e) {
      console.error(`Google Error: ${e.message}`);
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&countrycodes=br&q=${encodeURIComponent(fullQuery)}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'GestaoCTOs/1.0' } });
    const data = await response.json();
    if (data && data.length > 0) {
      console.log(`Nominatim Result: ${data[0].display_name} (${data[0].lat}, ${data[0].lon})`);
    } else {
      console.log(`Nominatim Result: None`);
    }
  } catch (e) {
    console.error(`Nominatim Error: ${e.message}`);
  }
}

async function run() {
    const cities = ["Santa Luzia, PB", "São José do Sabugi, PB", "Várzea, PB"];
    for (const city of cities) {
        await testGeocode("Rua Pre Escolar", city);
        await testGeocode("Rua Igreja São Sebastião", city);
    }
}

run();
