import { Pool } from 'pg';
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('❌ DATABASE_URL não definida!');
    process.exit(1);
}
console.log('📌 String original:', databaseUrl);
// Extrair componentes da URL de conexão
const url = new URL(databaseUrl);
const password = decodeURIComponent(url.password); // Garantir que está decodificada
console.log('📊 Componentes extraídos:', {
    user: url.username,
    password: password ? '***' + password.slice(-3) : 'ausente',
    host: url.hostname,
    port: url.port || '5432',
    database: url.pathname.slice(1)
});
const pool = new Pool({
    user: url.username,
    password: password,
    host: url.hostname,
    port: parseInt(url.port || '5432', 10),
    database: url.pathname.slice(1),
    ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false
});
// Teste de conexão
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erro ao conectar ao banco:', err.message);
        console.error('Detalhes do erro:', err);
    }
    else {
        console.log('✅ Conectado ao PostgreSQL com sucesso!');
        release();
    }
});
// Initialize tables (mesmo código de antes)
async function initializeDatabase() {
    try {
        console.log('🔄 Criando tabelas...');
        await pool.query(`
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
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cto_id, port_number)
      );
    `);
        console.log('✅ Database initialized successfully');
    }
    catch (error) {
        console.error('❌ Error initializing database:', error);
    }
}
initializeDatabase();
export default pool;
