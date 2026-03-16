
const { Client } = require('pg');

async function analyzePatterns() {
  const connectionString = 'postgresql://neondb_owner:npg_oInDt2H6EWUh@ep-winter-mode-ac8fc3d9.sa-east-1.aws.neon.tech/neondb?sslmode=require';
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- Analyzing Address Patterns (Random 200 samples) ---');
    
    const res = await client.query(`
      SELECT address 
      FROM ctos 
      WHERE latitude IS NULL AND address IS NOT NULL 
      LIMIT 200
    `);
    
    let stats = {
      has_comma_coords: 0,
      has_google_link: 0,
      has_numbers_only: 0,
      total_sampled: res.rows.length
    };

    res.rows.forEach(row => {
      const addr = row.address;
      if (addr.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)) stats.has_comma_coords++;
      if (addr.includes('google.com/maps') || addr.includes('goo.gl/maps')) stats.has_google_link++;
      console.log(`- ${addr.substring(0, 80)}`);
    });

    console.log('\n--- Stats ---');
    console.table(stats);

  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.end();
  }
}

analyzePatterns();
