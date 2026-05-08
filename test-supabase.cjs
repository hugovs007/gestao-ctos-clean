const { Pool } = require('pg');

const connectionString = "postgresql://postgres.omxelcqvaahvrqqaxvps:Z5ASBF5zGXS37D72@aws-1-us-east-2.pooler.supabase.com:6543/postgres";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Local connection failed (Supabase):', err.message);
  } else {
    console.log('Local connection success (Supabase):', res.rows[0]);
  }
  pool.end();
});
