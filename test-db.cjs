const { Pool } = require('pg');

const connectionString = "postgres://neondb_owner:npg_LjwZoJaC82rk@ep-bold-surf-a51pvnq8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Local connection failed:', err.message);
  } else {
    console.log('Local connection success:', res.rows[0]);
  }
  pool.end();
});
