import express from "express";
import pool, { initializeDb } from "./db.js";



import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize DB
initializeDb().catch(console.error);

// API Routes

// Units
app.get("/api/units", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM units ORDER BY name");
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching units:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/units", async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO units (name) VALUES ($1) RETURNING id, name",
      [name]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/units/:id", async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query(
      "UPDATE units SET name = $1 WHERE id = $2",
      [name, req.params.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/units/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM units WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cities
app.get("/api/cities", async (req, res) => {
  const { unit_id } = req.query;
  try {
    let query = "SELECT * FROM cities";
    let params: any[] = [];
    
    if (unit_id) {
      query += " WHERE unit_id = $1";
      params.push(unit_id);
    }
    
    query += " ORDER BY name";
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching cities:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/cities", async (req, res) => {
  const { name, unit_id } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO cities (name, unit_id) VALUES ($1, $2) RETURNING id, name, unit_id",
      [name, unit_id || null]
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

app.put("/api/ctos/:id", async (req, res) => {
  const { name, address, total_ports } = req.body;
  try {
    await pool.query(
      "UPDATE ctos SET name = $1, address = $2, total_ports = $3 WHERE id = $4",
      [name, address, total_ports, req.params.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
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

    const result = await pool.query(`
      SELECT c.*, cto.name as cto_name, city.name as city_name 
      FROM clients c
      JOIN ctos cto ON c.cto_id = cto.id
      JOIN cities city ON c.city_id = city.id
      WHERE c.name ILIKE $1 OR c.address ILIKE $2 OR c.pppoe ILIKE $3 OR cto.name ILIKE $4
      LIMIT 50
    `, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);
    
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error searching clients:", error);
    res.status(500).json({ error: error.message });
  }
});

// Catch-all for API to prevent returning HTML on 404
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found: " + req.path });
});

// Exportar para Vercel (IMPORTANTE!)
export default app;

// Iniciar servidor apenas em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}