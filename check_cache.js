
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkCache() {
  try {
    const res = await pool.query(
      "SELECT * FROM geocoding_cache WHERE query LIKE '%RUA PRE ESCOLAR%' OR query LIKE '%RUA IGREJA SÃO SEBASTIÃO%' OR display_name LIKE '%Rua Igreja São Sebastião%'"
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkCache();
