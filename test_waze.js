
async function testWaze(q) {
  console.log(`\nTesting Waze Geocode for: "${q}"`);
  try {
    // Waze unofficial search endpoint
    const url = `https://www.waze.com/row-SearchServer/service/Search?q=${encodeURIComponent(q)}&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.waze.com/'
      }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      const best = data[0];
      console.log(`Waze Result: ${best.name} (${best.location.lat}, ${best.location.lon})`);
      console.log(`Details: ${JSON.stringify(best, null, 2)}`);
    } else {
      console.log(`Waze Result: None`);
    }
  } catch (e) {
    console.error(`Waze Error: ${e.message}`);
  }
}

async function run() {
    await testWaze("Rua Pre Escolar, São José do Sabugi, PB");
    await testWaze("Rua Igreja São Sebastião, São José do Sabugi, PB");
}

run();
