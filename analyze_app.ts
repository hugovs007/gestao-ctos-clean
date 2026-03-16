
import { query } from './api/db.ts';

async function analyze() {
  try {
    const res = await query(`
      SELECT address 
      FROM ctos 
      WHERE latitude IS NULL AND address IS NOT NULL 
      LIMIT 500
    `);
    
    console.log(`Sampled ${res.rows.length} addresses.`);
    
    let patterns = {
      coords: 0,
      google: 0,
      maps_link: 0,
      bare_numbers: 0
    };

    res.rows.forEach(row => {
      const a = row.address;
      if (a.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)) patterns.coords++;
      if (a.includes('google.com/maps')) patterns.maps_link++;
      if (a.includes('q=') && a.includes(',')) patterns.google++;
    });

    console.log('--- Patterns Found ---');
    console.table(patterns);
    
    console.log('\n--- Sample Addresses ---');
    res.rows.slice(0, 50).forEach(r => console.log(`> ${r.address}`));
    
  } catch (err) {
    console.error(err);
  }
}

analyze();
