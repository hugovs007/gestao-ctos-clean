import express from "express";
import { createServer as createViteServer } from "vite";
import db from "./src/db";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes

  // Cities
  app.get("/api/cities", (req, res) => {
    try {
      const cities = db.prepare("SELECT * FROM cities ORDER BY name").all();
      res.json(cities);
    } catch (error: any) {
      console.error("Error fetching cities:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cities", (req, res) => {
    const { name } = req.body;
    try {
      const info = db.prepare("INSERT INTO cities (name) VALUES (?)").run(name);
      res.json({ id: info.lastInsertRowid, name });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // CTOs
  app.get("/api/cities/:cityId/ctos", (req, res) => {
    try {
      const ctos = db.prepare("SELECT * FROM ctos WHERE city_id = ? ORDER BY name").all(req.params.cityId);
      
      // Get usage stats for each CTO
      const ctosWithStats = ctos.map((cto: any) => {
        const usedPorts = db.prepare("SELECT COUNT(*) as count FROM clients WHERE cto_id = ? AND status = 'active'").get(cto.id) as { count: number };
        return { ...cto, used_ports: usedPorts.count };
      });

      res.json(ctosWithStats);
    } catch (error: any) {
      console.error("Error fetching CTOs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ctos", (req, res) => {
    const { name, city_id, total_ports, address } = req.body;
    try {
      const info = db.prepare(
        "INSERT INTO ctos (name, city_id, total_ports, address) VALUES (?, ?, ?, ?)"
      ).run(name, city_id, total_ports || 16, address);
      res.json({ id: info.lastInsertRowid, name, city_id, total_ports, address });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/ctos/:id", (req, res) => {
    try {
      const cto = db.prepare("SELECT * FROM ctos WHERE id = ?").get(req.params.id);
      if (!cto) return res.status(404).json({ error: "CTO not found" });
      
      const clients = db.prepare("SELECT * FROM clients WHERE cto_id = ?").all(req.params.id);
      res.json({ ...cto, clients });
    } catch (error: any) {
      console.error("Error fetching CTO details:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/ctos/:id", (req, res) => {
    db.prepare("DELETE FROM ctos WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Clients
  app.post("/api/clients", (req, res) => {
    const { name, address, pppoe, city_id, cto_id, port_number, status } = req.body;
    try {
      const info = db.prepare(
        "INSERT INTO clients (name, address, pppoe, city_id, cto_id, port_number, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(name, address, pppoe, city_id, cto_id, port_number, status || 'active');
      res.json({ id: info.lastInsertRowid, ...req.body });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/clients/:id", (req, res) => {
    const { name, address, pppoe, status } = req.body;
    try {
      db.prepare(
        "UPDATE clients SET name = ?, address = ?, pppoe = ?, status = ? WHERE id = ?"
      ).run(name, address, pppoe, status, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/clients/:id", (req, res) => {
    db.prepare("DELETE FROM clients WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Search
  app.get("/api/search", (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) return res.json([]);

      const clients = db.prepare(`
        SELECT c.*, cto.name as cto_name, city.name as city_name 
        FROM clients c
        JOIN ctos cto ON c.cto_id = cto.id
        JOIN cities city ON c.city_id = city.id
        WHERE c.name LIKE ? OR c.address LIKE ? OR c.pppoe LIKE ? OR cto.name LIKE ?
        LIMIT 50
      `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
      
      res.json(clients);
    } catch (error: any) {
      console.error("Error searching clients:", error);
      res.status(500).json({ error: error.message });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, we would serve static files here
    // But for this environment, we rely on the dev setup mostly
    // or standard static serving if built
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
