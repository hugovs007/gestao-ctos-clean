import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("ERRO CRÍTICO: A variável de ambiente DATABASE_URL não está definida.");
  console.error("Por favor, adicione DATABASE_URL nas configurações da Vercel.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://localhost:5432/postgres",
  ssl: process.env.DATABASE_URL ? { 
    rejectUnauthorized: false,
  } : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10
});

export const query = async (text: string, params?: any[]) => {
  if (!process.env.DATABASE_URL) {
    console.error("Vercel falhou em carregar a DATABASE_URL");
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
      CREATE TABLE IF NOT EXISTS units (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS cities (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS ctos (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
        total_ports INTEGER NOT NULL DEFAULT 16,
        address TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        type TEXT DEFAULT 'residential' CHECK (type IN ('residential', 'condominium'))
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

      CREATE INDEX IF NOT EXISTS idx_ctos_coords ON ctos (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
    `);
    
    // Migrations logic
    // Check if pppoe column exists in clients
    const pppoeRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='clients' AND column_name='pppoe';
    `);
    if (pppoeRes.rowCount === 0) {
      await client.query("ALTER TABLE clients ADD COLUMN pppoe TEXT");
    }

    // Check if type column exists in ctos
    const typeRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='ctos' AND column_name='type';
    `);
    if (typeRes.rowCount === 0) {
      await client.query("ALTER TABLE ctos ADD COLUMN type TEXT DEFAULT 'residential' CHECK (type IN ('residential', 'condominium'))");
    }

    // Create type index when type column exists
    if ((await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='ctos' AND column_name='type'
    `)).rowCount > 0) {
      await client.query("CREATE INDEX IF NOT EXISTS idx_ctos_type ON ctos (type)");
    }

    // Check if latitude/longitude columns exist in ctos
    const latRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='ctos' AND column_name='latitude';
    `);
    if (latRes.rowCount === 0) {
      await client.query("ALTER TABLE ctos ADD COLUMN latitude DOUBLE PRECISION");
      await client.query("ALTER TABLE ctos ADD COLUMN longitude DOUBLE PRECISION");
      
      // Initial migration: Extract coordinates from address if they follow the pattern
      const allCtos = await client.query("SELECT id, address FROM ctos WHERE address IS NOT NULL");
      for (const row of allCtos.rows) {
        const coordsMatch = row.address.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        if (coordsMatch) {
          const lat = parseFloat(coordsMatch[1]);
          const lng = parseFloat(coordsMatch[2]);
          await client.query(
            "UPDATE ctos SET latitude = $1, longitude = $2 WHERE id = $3",
            [lat, lng, row.id]
          );
        }
      }
    }

    // Sync sequences (Fix for "duplicate key value violates unique constraint")
    const tables = ['units', 'cities', 'ctos', 'clients'];
    for (const table of tables) {
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('${table}', 'id'),
          COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1,
          false
        );
      `);
    }

  } catch (err) {
    console.error('Error initializing database', err);
  } finally {
    client.release();
  }
};

export default pool;