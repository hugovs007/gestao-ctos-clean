import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("ERRO CRÍTICO: A variável de ambiente DATABASE_URL não está definida.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://localhost:5432/postgres",
  ssl: process.env.DATABASE_URL ? { 
    rejectUnauthorized: false,
  } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10
});

export const query = async (text: string, params?: any[]) => {
  return pool.query(text, params);
};

let dbInitialized = false;

export const initializeDb = async () => {
  if (!process.env.DATABASE_URL || dbInitialized) {
    return;
  }

  let client;
  try {
    console.log('[DB] Connecting to database...');
    client = await pool.connect();
    console.log('[DB] Connected. Running migrations...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS units (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE);
      CREATE TABLE IF NOT EXISTS cities (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL);
      CREATE TABLE IF NOT EXISTS ctos (id SERIAL PRIMARY KEY, name TEXT NOT NULL, city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE, total_ports INTEGER NOT NULL DEFAULT 16, address TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION);
      CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, name TEXT NOT NULL, address TEXT, pppoe TEXT, city_id INTEGER NOT NULL REFERENCES cities(id), cto_id INTEGER NOT NULL REFERENCES ctos(id) ON DELETE CASCADE, port_number INTEGER NOT NULL, status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(cto_id, port_number));
      CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL CHECK (role IN ('admin', 'tech', 'sales')) DEFAULT 'sales', name TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    `);

    // Migrations...
    const pppoeRes = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='clients' AND column_name='pppoe'");
    if (pppoeRes.rowCount === 0) await client.query("ALTER TABLE clients ADD COLUMN pppoe TEXT");

    const tables = ['units', 'cities', 'ctos', 'clients'];
    for (const table of tables) {
      await client.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`);
    }

    dbInitialized = true;
    console.log('[DB] Initialization complete.');
  } catch (err) {
    console.error('[DB] Initialization error:', err);
  } finally {
    if (client) client.release();
  }
};

export default pool;