import express from "express";
import pool, { initializeDb } from "./db.js";



import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

app.put("/api/cities/:id", async (req, res) => {
  const { name, unit_id } = req.body;
  try {
    await pool.query(
      "UPDATE cities SET name = $1, unit_id = $2 WHERE id = $3",
      [name, unit_id === "" ? null : unit_id, req.params.id]
    );
    res.json({ success: true });
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

// Bulk Import
app.post("/api/import", async (req, res) => {
  const { rows } = req.body; 
  if (!rows || !Array.isArray(rows)) return res.status(400).json({ error: "Invalid data" });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Process cities first (Batch)
    const uniqueCities = Array.from(new Set(rows.map(r => r.cidade.replace(/\s*\(Imp\.\)$/i, '').trim())));
    
    // Insert all cities, ignoring duplicates
    if (uniqueCities.length > 0) {
      await client.query(`
        INSERT INTO cities (name)
        SELECT * FROM UNNEST($1::text[])
        ON CONFLICT (name) DO NOTHING
      `, [uniqueCities]);
    }
    
    // Get all relevant city IDs in one go
    const cityMapRes = await client.query("SELECT id, name FROM cities WHERE name = ANY($1)", [uniqueCities]);
    const cityIdMap = new Map(cityMapRes.rows.map(r => [r.name.toLowerCase(), r.id]));
    
    // 2. Prepare CTO data
    const ctoData = rows.map(row => {
      const cityName = row.cidade.replace(/\s*\(Imp\.\)$/i, '').trim().toLowerCase();
      const cityId = cityIdMap.get(cityName);
      
      let ctoName = row.sigla && row.sigla !== '**' ? row.sigla : row.sigla_poste;
      ctoName = ctoName?.trim() || 'Sem Nome';
      
      const location = row.endereco?.trim() || `${row.lat}, ${row.lng}`;
      
      return cityId ? [ctoName, cityId, location, 16] : null;
    }).filter(Boolean);

    // 3. Batch insert CTOs using a temporary table for deduplication
    // This is safer and faster for large sets than individual checks
    if (ctoData.length > 0) {
      // Create temp table to handle the batch logic
      await client.query(`
        CREATE TEMP TABLE temp_import_ctos (
          name TEXT,
          city_id INTEGER,
          address TEXT,
          total_ports INTEGER
        ) ON COMMIT DROP
      `);

      // Fill temp table
      // Constructing values string for multiple insertion to avoid one query per row
      // For 10k rows, we might need to chunk this or use a cleaner approach like UNNEST if PG version permits
      const values = [];
      const params = [];
      for (let i = 0; i < ctoData.length; i++) {
        const offset = i * 4;
        values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
        params.push(...ctoData[i]);
      }

      await client.query(`
        INSERT INTO temp_import_ctos (name, city_id, address, total_ports)
        VALUES ${values.join(',')}
      `, params);

      // Insert into real table where NOT EXISTS (deduplication)
      const insertRes = await client.query(`
        INSERT INTO ctos (name, city_id, address, total_ports)
        SELECT DISTINCT t.name, t.city_id, t.address, t.total_ports
        FROM temp_import_ctos t
        WHERE NOT EXISTS (
          SELECT 1 FROM ctos c 
          WHERE c.city_id = t.city_id AND c.name = t.name
        )
        RETURNING id
      `);
      
      const importedCount = insertRes.rowCount || 0;
      await client.query('COMMIT');
      res.json({ success: true, count: importedCount });
    } else {
      await client.query('COMMIT');
      res.json({ success: true, count: 0 });
    }
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Import error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
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