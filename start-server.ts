import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import pool, { initializeDb } from "./src/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());

  // Initialize DB
  try {
    await initializeDb();
    console.log('✅ Banco de dados inicializado');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
  }

  // API Routes

  // Cities
  app.get("/api/cities", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM cities ORDER BY name");
      res.json(result.rows);
    } catch (error: any) {
      console.error("Error fetching cities:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cities", async (req, res) => {
    const { name } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO cities (name) VALUES ($1) RETURNING id, name",
        [name]
      );
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // CTOs
  app.get("/api/cities/:cityId/ctos", async (req, res) => {
    try {
      const ctosResult = await pool.query(
        "SELECT * FROM ctos WHERE city_id = $1 ORDER BY name",
        [req.params.cityId]
      );
      const ctos = ctosResult.rows;
      
      // Get usage stats for each CTO
      const ctosWithStats = await Promise.all(ctos.map(async (cto: any) => {
        const usedPortsResult = await pool.query(
          "SELECT COUNT(*) as count FROM clients WHERE cto_id = $1 AND status = 'active'",
          [cto.id]
        );
        return { ...cto, used_ports: parseInt(usedPortsResult.rows[0].count) };
      }));

      res.json(ctosWithStats);
    } catch (error: any) {
      console.error("Error fetching CTOs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ctos", async (req, res) => {
    const { name, city_id, total_ports, address } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO ctos (name, city_id, total_ports, address) VALUES ($1, $2, $3, $4) RETURNING id",
        [name, city_id, total_ports || 16, address]
      );
      res.json({ id: result.rows[0].id, name, city_id, total_ports, address });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/ctos/:id", async (req, res) => {
    try {
      const ctoResult = await pool.query("SELECT * FROM ctos WHERE id = $1", [req.params.id]);
      const cto = ctoResult.rows[0];
      
      if (!cto) return res.status(404).json({ error: "CTO not found" });
      
      const clientsResult = await pool.query("SELECT * FROM clients WHERE cto_id = $1", [req.params.id]);
      res.json({ ...cto, clients: clientsResult.rows });
    } catch (error: any) {
      console.error("Error fetching CTO details:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/ctos/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM ctos WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Clients
  app.post("/api/clients", async (req, res) => {
    const { name, address, pppoe, city_id, cto_id, port_number, status } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO clients (name, address, pppoe, city_id, cto_id, port_number, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
        [name, address, pppoe, city_id, cto_id, port_number, status || 'active']
      );
      res.json({ id: result.rows[0].id, ...req.body });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    const { name, address, pppoe, status } = req.body;
    try {
      await pool.query(
        "UPDATE clients SET name = $1, address = $2, pppoe = $3, status = $4 WHERE id = $5",
        [name, address, pppoe, status, req.params.id]
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM clients WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Search
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) return res.json([]);

      const searchTerm = `%${query}%`;
      const result = await pool.query(`
        SELECT c.*, cto.name as cto_name, city.name as city_name 
        FROM clients c
        JOIN ctos cto ON c.cto_id = cto.id
        JOIN cities city ON c.city_id = city.id
        WHERE c.name ILIKE $1 
           OR c.address ILIKE $1 
           OR c.pppoe ILIKE $1 
           OR cto.name ILIKE $1
        LIMIT 50
      `, [searchTerm, searchTerm, searchTerm, searchTerm]);
      
      res.json(result.rows);
    } catch (error: any) {
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
  } else {
    // Vite middleware for development
    const { createServer: createViteServer } = await import("vite");
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

// Iniciar servidor
startServer().catch(console.error);