
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const googleKey = process.env.GOOGLE_MAPS_API_KEY;

async function testReverse(lat, lng) {
  console.log(`\nTesting API Reverse Geocode for: ${lat}, ${lng}`);
  
  if (googleKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?key=${googleKey}&latlng=${lat},${lng}&language=pt-BR`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        console.log(`Google API Result: ${data.results[0].formatted_address}`);
      } else {
        console.log(`Google API Result: None (Status: ${data.status})`);
      }
    } catch (e) {
      console.error(`Google API Error: ${e.message}`);
    }
  }
}

async function run() {
    // Coordinates for Igreja São Sebastião in São José do Sabugi
    // Nominatim returns "Rua Igreja São Sebastião"
    // Let's see what Google returns.
    await testReverse(-6.8651285, -36.9205393);
}

run();
