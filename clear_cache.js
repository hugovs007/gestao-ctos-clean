
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clearCache() {
  console.log("Cleaning geocoding_cache table...");
  try {
    const res = await pool.query("DELETE FROM geocoding_cache");
    console.log(`Success! Deleted ${res.rowCount} entries from cache.`);
  } catch (err) {
    console.error("Error cleaning cache:", err);
  } finally {
    await pool.end();
  }
}

clearCache();
