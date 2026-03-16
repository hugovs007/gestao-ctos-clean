import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// Configurar caminhos (isso deve vir ANTES de qualquer outra coisa)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Carregar .env com caminho absoluto
const envPath = path.join(__dirname, '.env');
console.log('📁 Carregando .env de:', envPath);
dotenv.config({ path: envPath });
// Verificar se carregou
console.log('🔍 DATABASE_URL após dotenv:', process.env.DATABASE_URL ? '✅ presente' : '❌ ausente');
if (!process.env.DATABASE_URL) {
    console.error('❌ ERRO FATAL: DATABASE_URL não foi carregada!');
    console.error('💡 Dica: Verifique se o arquivo .env existe em:', envPath);
    process.exit(1);
}
// Agora importa o resto (DEPOIS do dotenv)
import express from "express";
import { createServer as createViteServer } from "vite";
// Import CORRIGIDO apontando para o arquivo compilado em dist-server
import pool from "./dist-server/src/db.js";
// NÃO recriar __filename e __dirname aqui! Já temos acima.
const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
app.use(express.json());
// Função para iniciar o servidor APÓS o banco estar pronto
async function startServer() {
    try {
        // Testar conexão com banco
        await pool.query('SELECT 1');
        console.log('✅ Banco de dados conectado');
        // API Routes
        app.get("/api/cities", async (req, res) => {
            try {
                const result = await pool.query("SELECT * FROM cities ORDER BY name");
                res.json(result.rows);
            }
            catch (error) {
                console.error("Error fetching cities:", error);
                res.status(500).json({ error: error.message });
            }
        });
        app.post("/api/cities", async (req, res) => {
            const { name } = req.body;
            try {
                const result = await pool.query("INSERT INTO cities (name) VALUES ($1) RETURNING id, name", [name]);
                res.json(result.rows[0]);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
        app.get("/api/cities/:cityId/ctos", async (req, res) => {
            try {
                const ctosResult = await pool.query("SELECT * FROM ctos WHERE city_id = $1 ORDER BY name", [req.params.cityId]);
                const ctosWithStats = await Promise.all(ctosResult.rows.map(async (cto) => {
                    const usedPortsResult = await pool.query("SELECT COUNT(*) as count FROM clients WHERE cto_id = $1 AND status = 'active'", [cto.id]);
                    return { ...cto, used_ports: parseInt(usedPortsResult.rows[0].count) };
                }));
                res.json(ctosWithStats);
            }
            catch (error) {
                console.error("Error fetching CTOs:", error);
                res.status(500).json({ error: error.message });
            }
        });
        app.post("/api/ctos", async (req, res) => {
            const { name, city_id, total_ports, address } = req.body;
            try {
                const result = await pool.query("INSERT INTO ctos (name, city_id, total_ports, address) VALUES ($1, $2, $3, $4) RETURNING *", [name, city_id, total_ports || 16, address]);
                res.json(result.rows[0]);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
        app.get("/api/ctos/:id", async (req, res) => {
            try {
                const ctoResult = await pool.query("SELECT * FROM ctos WHERE id = $1", [req.params.id]);
                if (ctoResult.rows.length === 0) {
                    return res.status(404).json({ error: "CTO not found" });
                }
                const clientsResult = await pool.query("SELECT * FROM clients WHERE cto_id = $1", [req.params.id]);
                res.json({ ...ctoResult.rows[0], clients: clientsResult.rows });
            }
            catch (error) {
                console.error("Error fetching CTO details:", error);
                res.status(500).json({ error: error.message });
            }
        });
        app.delete("/api/ctos/:id", async (req, res) => {
            try {
                await pool.query("DELETE FROM ctos WHERE id = $1", [req.params.id]);
                res.json({ success: true });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        app.post("/api/clients", async (req, res) => {
            const { name, address, pppoe, city_id, cto_id, port_number, status } = req.body;
            try {
                const result = await pool.query(`INSERT INTO clients (name, address, pppoe, city_id, cto_id, port_number, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [name, address, pppoe, city_id, cto_id, port_number, status || 'active']);
                res.json(result.rows[0]);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
        app.put("/api/clients/:id", async (req, res) => {
            const { name, address, pppoe, status } = req.body;
            try {
                await pool.query(`UPDATE clients SET name = $1, address = $2, pppoe = $3, status = $4 WHERE id = $5`, [name, address, pppoe, status, req.params.id]);
                res.json({ success: true });
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
        app.delete("/api/clients/:id", async (req, res) => {
            try {
                await pool.query("DELETE FROM clients WHERE id = $1", [req.params.id]);
                res.json({ success: true });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        app.get("/api/search", async (req, res) => {
            try {
                const query = req.query.q;
                if (!query || query.length < 2)
                    return res.json([]);
                const searchTerm = `%${query}%`;
                const result = await pool.query(`SELECT c.*, cto.name as cto_name, city.name as city_name 
           FROM clients c
           JOIN ctos cto ON c.cto_id = cto.id
           JOIN cities city ON c.city_id = city.id
           WHERE c.name ILIKE $1 
              OR c.address ILIKE $1 
              OR c.pppoe ILIKE $1 
              OR cto.name ILIKE $1
           LIMIT 50`, [searchTerm]);
                res.json(result.rows);
            }
            catch (error) {
                console.error("Error searching clients:", error);
                res.status(500).json({ error: error.message });
            }
        });
        // Serve static files in production
        if (process.env.NODE_ENV === 'production') {
            app.use(express.static(path.join(__dirname, 'dist')));
            app.get('*', (req, res) => {
                res.sendFile(path.join(__dirname, 'dist', 'index.html'));
            });
        }
        // Iniciar servidor
        if (process.env.NODE_ENV !== 'production') {
            const vite = await createViteServer({
                server: { middlewareMode: true },
                appType: "spa",
            });
            app.use(vite.middlewares);
        }
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}
// Iniciar tudo
startServer();
export default app;
