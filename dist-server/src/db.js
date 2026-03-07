import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
if (!process.env.DATABASE_URL) {
    console.error("ERRO CRÍTICO: A variável de ambiente DATABASE_URL não está definida.");
}
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_LjwZoJaC82rk@ep-red-tooth-ac00bo2q.sa-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: {
        rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 10
});
export const query = async (text, params) => {
    if (!process.env.DATABASE_URL) {
        return { rows: [], rowCount: 0 };
    }
    return pool.query(text, params);
};
export const initializeDb = async () => {
    if (!process.env.DATABASE_URL) {
        return;
    }
    const client = await pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS cities (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS ctos (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
        total_ports INTEGER NOT NULL DEFAULT 16,
        address TEXT
      );

      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        pppoe TEXT,
        city_id INTEGER NOT NULL REFERENCES cities(id),
        cto_id INTEGER NOT NULL REFERENCES ctos(id) ON DELETE CASCADE,
        port_number INTEGER NOT NULL,
        status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cto_id, port_number)
      );
    `);
        // Check if pppoe column exists (migration logic)
        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='clients' AND column_name='pppoe';
    `);
        if (res.rowCount === 0) {
            await client.query("ALTER TABLE clients ADD COLUMN pppoe TEXT");
        }
    }
    catch (err) {
        console.error('Error initializing database', err);
    }
    finally {
        client.release();
    }
};
export default pool;
