
import dotenv from 'dotenv';
dotenv.config();

const googleKey = process.env.GOOGLE_MAPS_API_KEY;

async function testGeocode(q) {
  console.log(`\nTesting Geocode for: "${q}"`);
  
  // Google Geocode
  if (googleKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?key=${googleKey}&language=pt-BR&address=${encodeURIComponent(q)}`;
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

  // Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&countrycodes=br&q=${encodeURIComponent(q)}`;
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

async function testReverse(lat, lng) {
    console.log(`\nTesting Reverse Geocode for: ${lat}, ${lng}`);
    
    // Google Reverse
    if (googleKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?key=${googleKey}&language=pt-BR&latlng=${lat},${lng}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
          console.log(`Google Reverse: ${data.results[0].formatted_address}`);
        } else {
          console.log(`Google Reverse: None (Status: ${data.status})`);
        }
      } catch (e) {
        console.error(`Google Reverse Error: ${e.message}`);
      }
    }
  
    // Nominatim Reverse
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
      const response = await fetch(url, { headers: { 'User-Agent': 'GestaoCTOs/1.0' } });
      const data = await response.json();
      if (data && data.display_name) {
        console.log(`Nominatim Reverse: ${data.display_name}`);
      } else {
        console.log(`Nominatim Reverse: None`);
      }
    } catch (e) {
      console.error(`Nominatim Reverse Error: ${e.message}`);
    }
}

async function run() {
    await testGeocode("Rua Pre Escolar");
    await testGeocode("Rua Igreja São Sebastião");
    
    // Attempting to find coordinates for Catolé do Rocha (common city in this project's context)
    // or searching for "Igreja São Sebastião" to get coordinates and reverse geocode them.
    await testGeocode("Igreja São Sebastião");
}

run();
