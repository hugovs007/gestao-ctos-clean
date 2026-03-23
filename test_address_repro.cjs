
// Use global fetch (Node 18+)
const dotenv = require('dotenv');
dotenv.config();

async function testAddress() {
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    
    // Exact address from screenshot
    const q = "RUA DO PRÉ ESCOLAR, 153, SÃO SEBASTIÃO, SANTA LUZIA, PB, 58600000";
    const street = "RUA DO PRÉ ESCOLAR";
    const city = "SANTA LUZIA";
    const state = "PB";

    console.log(`Using GOOGLE_MAPS_API_KEY: ${googleKey ? 'PRESENT' : 'MISSING'}`);

    // Replicating server logic for finalAddress
    let addressParts = [];
    if (street) addressParts.push(street);
    if (city) addressParts.push(city);
    if (state) addressParts.push(state);
    
    let finalAddress = q ? `${q}, ${addressParts.join(', ')}` : addressParts.join(', ');

    console.log(`\nTest 1: Combined address -> "${finalAddress}"`);
    let url1 = `https://maps.googleapis.com/maps/api/geocode/json?key=${googleKey}&language=pt-BR&address=${encodeURIComponent(finalAddress)}`;
    let res1 = await fetch(url1);
    let data1 = await res1.json();
    console.log(`Result 1 Status: ${data1.status}`);
    if (data1.status === 'OK') {
        console.log(`Result 1 Formatted: ${data1.results[0].formatted_address}`);
    } else {
        console.log('Result 1 Error Message:', data1.error_message || 'No error message');
    }

    console.log(`\nTest 2: Original Q only -> "${q}"`);
    let url2 = `https://maps.googleapis.com/maps/api/geocode/json?key=${googleKey}&language=pt-BR&address=${encodeURIComponent(q)}`;
    let res2 = await fetch(url2);
    let data2 = await res2.json();
    console.log(`Result 2 Status: ${data2.status}`);
    if (data2.status === 'OK') {
        console.log(`Result 2 Formatted: ${data2.results[0].formatted_address}`);
    }

    console.log(`\nTest 3: Nominatim Q only`);
    let url3 = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&countrycodes=br&q=${encodeURIComponent(q)}`;
    let res3 = await fetch(url3, { headers: { 'User-Agent': 'GestaoCTOs/1.0' } });
    let data3 = await res3.json();
    console.log(`Result 3 Count: ${data3.length}`);
    if (data3.length > 0) {
        console.log(`Result 3 Display Name: ${data3[0].display_name}`);
    }
}

testAddress();
