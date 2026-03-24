
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query("SELECT count(*) FROM geocoding_cache");
    console.log(`Cache count: ${res.rows[0].count}`);
  } catch (err) {
    console.error("Check error:", err);
  } finally {
    await pool.end();
  }
}

check();
