import Database from 'better-sqlite3';

const db = new Database('network.db');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS ctos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    city_id INTEGER NOT NULL,
    total_ports INTEGER NOT NULL DEFAULT 16,
    address TEXT,
    FOREIGN KEY (city_id) REFERENCES cities (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    pppoe TEXT,
    city_id INTEGER NOT NULL,
    cto_id INTEGER NOT NULL,
    port_number INTEGER NOT NULL,
    status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (city_id) REFERENCES cities (id),
    FOREIGN KEY (cto_id) REFERENCES ctos (id) ON DELETE CASCADE,
    UNIQUE(cto_id, port_number)
  );
`);

// Migration to add pppoe column if it doesn't exist (for existing dbs)
try {
  db.prepare("ALTER TABLE clients ADD COLUMN pppoe TEXT").run();
} catch (error) {
  // Column likely already exists
}

export default db;
