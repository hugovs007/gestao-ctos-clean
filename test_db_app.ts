
import { query } from './api/db.ts';

async function test() {
  try {
    const res = await query(`
      SELECT c.name, c.latitude, c.longitude, ci.name as city_name 
      FROM ctos c 
      JOIN cities ci ON c.city_id = ci.id 
      WHERE c.latitude IS NOT NULL 
      LIMIT 10
    `);
    console.log('--- CTOs with GPS ---');
    console.table(res.rows);
  } catch (err) {
    console.error('Query failed:', err);
  }
}

test();
