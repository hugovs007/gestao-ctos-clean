import express from "express";
import pool, { initializeDb } from "./db.js";



import cors from "cors";
import admin from "firebase-admin";

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize DB
initializeDb().catch(console.error);

// Initialize Firebase Admin
if (process.env.FIREBASE_PROJECT_ID) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

async function getGoogleDistances(origin: {lat: number, lng: number}, destinations: {lat: number, lng: number}[]) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return destinations.map(() => null);

  try {
    const originsStr = `${origin.lat},${origin.lng}`;
    const destinationsStr = destinations.map(d => `${d.lat},${d.lng}`).join('|');
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&mode=walking&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json() as any;
    
    if (data.status !== 'OK') {
      console.error("Google Maps API Error:", data.status, data.error_message);
      return destinations.map(() => null);
    }
    
    return data.rows[0].elements.map((el: any) => {
      if (el.status === 'OK') {
        return el.distance.value / 1000; // converter metros para KM
      }
      return null;
    });
  } catch (error) {
    console.error("Error calling Google Maps API:", error);
    return destinations.map(() => null);
  }
}

// Middleware de Autenticação
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado. Token não fornecido.' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    
    // Buscar perfil do usuário no banco de dados
    const userResult = await pool.query("SELECT * FROM users WHERE uid = $1", [decodedToken.uid]);
    if (userResult.rowCount > 0) {
      req.userRole = userResult.rows[0].role;
      req.userData = userResult.rows[0];
    } else {
      // Se não existe no banco, mas tem token válido, talvez seja o primeiro login
      req.userRole = 'sales'; // Default
    }
    
    next();
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

// Middleware para restringir acesso por cargo
const authorize = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Acesso negado. Permissão insuficiente.' });
    }
    next();
  };
};

// API Routes

// Auth & Sync
app.get("/api/auth/me", authenticate, async (req: any, res) => {
  res.json({
    uid: req.user.uid,
    email: req.user.email,
    role: req.userRole || 'sales',
    name: req.userData?.name || req.user.name || ''
  });
});

app.post("/api/auth/sync", async (req, res) => {
  const { idToken, name } = req.body;
  if (!idToken) return res.status(400).json({ error: "Token é obrigatório" });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email } = decodedToken;

    // Verificar se já existe
    const existing = await pool.query("SELECT * FROM users WHERE uid = $1", [uid]);
    
    if (existing.rowCount === 0) {
      // Verificar se é o primeiro usuário do sistema (se for, vira admin)
      const countRes = await pool.query("SELECT COUNT(*) FROM users");
      const isFirst = parseInt(countRes.rows[0].count) === 0;
      const role = isFirst ? 'admin' : 'sales';

      await pool.query(
        "INSERT INTO users (uid, email, role, name) VALUES ($1, $2, $3, $4)",
        [uid, email, role, name || '']
      );
      res.json({ uid, email, role, name, isNew: true });
    } else {
      res.json({ ...existing.rows[0], isNew: false });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// User Management (Admin only)
app.get("/api/users", authenticate, authorize(['admin']), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users", authenticate, authorize(['admin']), async (req, res) => {
  const { email, password, name, role } = req.body;
  
  try {
    // 1. Criar no Firebase
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Salvar no Banco Local
    const result = await pool.query(
      "INSERT INTO users (uid, email, role, name) VALUES ($1, $2, $3, $4) RETURNING *",
      [userRecord.uid, email, role || 'sales', name]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/users/:uid", authenticate, authorize(['admin']), async (req, res) => {
  const { role, name } = req.body;
  try {
    await pool.query(
      "UPDATE users SET role = $1, name = $2 WHERE uid = $3",
      [role, name, req.params.uid]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/users/:uid", authenticate, authorize(['admin']), async (req, res) => {
  try {
    // 1. Deletar no Firebase
    await admin.auth().deleteUser(req.params.uid);
    // 2. Deletar no Banco
    await pool.query("DELETE FROM users WHERE uid = $1", [req.params.uid]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cities
app.get("/api/cities", authenticate, async (req, res) => {
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

app.post("/api/cities", authenticate, authorize(['admin']), async (req, res) => {
  const { name, unit_id } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Nome da cidade é obrigatório" });
  
  const normalizedName = name.trim().toUpperCase();
  
  try {
    const result = await pool.query(
      "INSERT INTO cities (name, unit_id) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET unit_id = EXCLUDED.unit_id RETURNING id, name, unit_id",
      [normalizedName, unit_id || null]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating city:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/cities/:id", authenticate, authorize(['admin']), async (req, res) => {
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
app.get("/api/cities/:cityId/ctos", authenticate, async (req, res) => {
  try {
    const cityId = req.params.cityId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM ctos WHERE city_id = $1",
      [cityId]
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get CTOs with stats in a single query
    const ctosResult = await pool.query(`
      SELECT c.*, 
             COALESCE(stats.used_ports, 0)::int as used_ports
      FROM ctos c
      LEFT JOIN (
        SELECT cto_id, COUNT(*) as used_ports
        FROM clients
        WHERE status = 'active'
        GROUP BY cto_id
      ) stats ON c.id = stats.cto_id
      WHERE c.city_id = $1
      ORDER BY c.name
      LIMIT $2 OFFSET $3
    `, [cityId, limit, offset]);

    res.json({
      ctos: ctosResult.rows,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error: any) {
    console.error("Error fetching CTOs:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ctos", authenticate, authorize(['admin']), async (req, res) => {
  const { name, city_id, total_ports, address, latitude, longitude } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO ctos (name, city_id, total_ports, address, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [name, city_id, total_ports || 16, address, latitude || null, longitude || null]
    );
    res.json({ id: result.rows[0].id, name, city_id, total_ports, address, latitude, longitude });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/ctos/:id", authenticate, async (req, res) => {
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

app.put("/api/ctos/:id", authenticate, authorize(['admin']), async (req, res) => {
  const { name, address, total_ports, latitude, longitude } = req.body;
  try {
    await pool.query(
      "UPDATE ctos SET name = $1, address = $2, total_ports = $3, latitude = $4, longitude = $5 WHERE id = $6",
      [name, address, total_ports, latitude || null, longitude || null, req.params.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/ctos/:id", authenticate, authorize(['admin']), async (req, res) => {
  try {
    await pool.query("DELETE FROM ctos WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clients
app.post("/api/clients", authenticate, authorize(['admin', 'tech']), async (req, res) => {
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

app.put("/api/clients/:id", authenticate, authorize(['admin']), async (req, res) => {
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

app.delete("/api/clients/:id", authenticate, authorize(['admin']), async (req, res) => {
  try {
    await pool.query("DELETE FROM clients WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Import
app.post("/api/import", authenticate, authorize(['admin']), async (req, res) => {
  const { rows } = req.body; 
  if (!rows || !Array.isArray(rows)) return res.status(400).json({ error: "Invalid data" });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Process cities first (Batch & Case-Insensitive)
    const cityNamesRaw = Array.from(new Set(rows.map(r => r.cidade.replace(/\s*\(Imp\.\)$/i, '').trim())));
    const cityNamesLower = cityNamesRaw.map(n => n.toLowerCase());
    
    // Find cities that already exist (any casing)
    const existingCitiesRes = await client.query(
      "SELECT id, name FROM cities WHERE LOWER(name) = ANY($1)", 
      [cityNamesLower]
    );
    
    const cityIdMap = new Map<string, number>();
    existingCitiesRes.rows.forEach(r => cityIdMap.set(r.name.toLowerCase(), r.id));
    
    // Identify cities that need to be created
    const citiesToCreate = cityNamesRaw.filter(name => !cityIdMap.has(name.toLowerCase()));
    
    if (citiesToCreate.length > 0) {
      // Insert new cities (normalizing to Uppercase for consistency)
      const insertCitiesRes = await client.query(`
        INSERT INTO cities (name)
        SELECT DISTINCT UPPER(name) FROM UNNEST($1::text[]) as name
        ON CONFLICT (name) DO NOTHING
        RETURNING id, name
      `, [citiesToCreate]);
      
      insertCitiesRes.rows.forEach(r => cityIdMap.set(r.name.toLowerCase(), r.id));
    }
    
    // 2. Prepare CTO data
    const ctoData: any[][] = rows.map(row => {
      const cityNameClean = row.cidade.replace(/\s*\(Imp\.\)$/i, '').trim().toLowerCase();
      const cityId = cityIdMap.get(cityNameClean);
      
      let ctoName = row.sigla && row.sigla !== '**' ? row.sigla : row.sigla_poste;
      ctoName = ctoName?.trim() || 'Sem Nome';
      
      const location = row.endereco?.trim() || `${row.lat}, ${row.lng}`;
      
      // Try to parse lat/lng from row.lat/row.lng or address
      let lat = parseFloat(row.lat);
      let lng = parseFloat(row.lng);
      
      if (isNaN(lat) || isNaN(lng)) {
        const coordsMatch = location.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        if (coordsMatch) {
          lat = parseFloat(coordsMatch[1]);
          lng = parseFloat(coordsMatch[2]);
        }
      }

      return cityId ? [ctoName, cityId, location, 16, isNaN(lat) ? null : lat, isNaN(lng) ? null : lng] : null;
    }).filter((r): r is any[] => r !== null);

      // 3. Batch insert CTOs using a temporary table for deduplication
      if (ctoData.length > 0) {
        // Create temp table to handle the batch logic
        await client.query(`
          CREATE TEMP TABLE temp_import_ctos (
            name TEXT,
            city_id INTEGER,
            address TEXT,
            total_ports INTEGER,
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION
          ) ON COMMIT DROP
        `);
  
        const values = [];
        const params = [];
        for (let i = 0; i < ctoData.length; i++) {
          const offset = i * 6;
          values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
          params.push(...ctoData[i]);
        }
  
        await client.query(`
          INSERT INTO temp_import_ctos (name, city_id, address, total_ports, latitude, longitude)
          VALUES ${values.join(',')}
        `, params);
  
        // Insert into real table where NOT EXISTS (deduplication)
        const insertRes = await client.query(`
          INSERT INTO ctos (name, city_id, address, total_ports, latitude, longitude)
          SELECT DISTINCT t.name, t.city_id, t.address, t.total_ports, t.latitude, t.longitude
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

// Viability Check
app.get("/api/viability", authenticate, async (req, res) => {
  const { lat, lng, radius } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: "Latitude e Longitude são obrigatórias" });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);
  const radiusKm = parseFloat(radius as string) || 1.0;

  try {
    // 1. Filtragem inicial por Haversine (linha reta) com margem de segurança de 1km extra
    // Isso reduz o número de pontos para enviar ao Google Maps
    const initialBuffer = 1.0; 
    const result = await pool.query(`
      SELECT 
        c.*, 
        COALESCE(stats.used_ports, 0)::int as used_ports,
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(c.latitude)) * 
            cos(radians(c.longitude) - radians($2)) + 
            sin(radians($1)) * sin(radians(c.latitude))
          )
        ) AS distance_direct
      FROM ctos c
      LEFT JOIN (
        SELECT cto_id, COUNT(*) as used_ports
        FROM clients
        WHERE status = 'active'
        GROUP BY cto_id
      ) stats ON c.id = stats.cto_id
      WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
      AND (
        6371 * acos(
          cos(radians($1)) * cos(radians(c.latitude)) * 
          cos(radians(c.longitude) - radians($2)) + 
          sin(radians($1)) * sin(radians(c.latitude))
        )
      ) <= $3 + $4
      ORDER BY distance_direct ASC
      LIMIT 25
    `, [latitude, longitude, radiusKm, initialBuffer]);

    const candidates = result.rows;

    if (candidates.length === 0) {
      return res.json([]);
    }

    // 2. Calcular distância real de rota via Google Maps
    const destinations = candidates.map(c => ({ lat: c.latitude, lng: c.longitude }));
    const routeDistances = await getGoogleDistances({ lat: latitude, lng: longitude }, destinations);

    // 3. Atualizar distâncias e filtrar novamente
    const resultsWithRoute = candidates.map((c, index) => {
      const routeDistance = routeDistances[index];
      return {
        ...c,
        distance: routeDistance !== null ? routeDistance : c.distance_direct,
        is_route: routeDistance !== null
      };
    })
    .filter(c => c.distance <= radiusKm) // Filtrar pelo raio real
    .sort((a, b) => a.distance - b.distance); // Ordenar pela distância real

    res.json(resultsWithRoute);
  } catch (error: any) {
    console.error("Error in viability check:", error);
    res.status(500).json({ error: error.message });
  }
});

// Geocoding
app.get("/api/geocode", authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Endereço é obrigatório" });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q as string)}&limit=1`, {
      headers: {
        'User-Agent': 'GestaoCTOs/1.0'
      }
    });
    const data = await response.json() as any[];
    
    if (data && data.length > 0) {
      res.json({
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name
      });
    } else {
      res.status(404).json({ error: "Endereço não encontrado" });
    }
  } catch (error: any) {
    console.error("Geocoding error:", error);
    res.status(500).json({ error: "Erro ao buscar coordenadas" });
  }
});

// Search
app.get("/api/search", authenticate, async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 2) return res.json([]);
    const pattern = `%${q}%`;

    const result = await pool.query(`
      (
        SELECT 
          'client' as type,
          c.id, c.name, c.status, c.port_number, c.pppoe, c.address,
          cto.id as cto_id, cto.name as cto_name, 
          city.name as city_name
        FROM clients c
        JOIN ctos cto ON c.cto_id = cto.id
        JOIN cities city ON c.city_id = city.id
        WHERE c.name ILIKE $1 OR c.address ILIKE $1 OR c.pppoe ILIKE $1 OR cto.name ILIKE $1
      )
      UNION ALL
      (
        SELECT 
          'cto' as type,
          cto.id as id, cto.name as name, 'active' as status, 0 as port_number, '' as pppoe, cto.address as address,
          cto.id as cto_id, cto.name as cto_name,
          city.name as city_name
        FROM ctos cto
        JOIN cities city ON cto.city_id = city.id
        WHERE cto.name ILIKE $1 OR cto.address ILIKE $1
      )
      LIMIT 50
    `, [pattern]);
    
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error searching:", error);
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