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

app.post("/api/ctos", async (req, res) => {
  let { name, city_id, total_ports, address, latitude, longitude, type } = req.body;
  
  try {
    // Auto-geocode if coordinates are missing but address is present
    if ((latitude === null || longitude === null || latitude === undefined || longitude === undefined) && address) {
      const geo = await geocodeAddress(address);
      if (geo) {
        latitude = geo.lat;
        longitude = geo.lng;
      }
    }

    const result = await pool.query(
      "INSERT INTO ctos (name, city_id, total_ports, address, latitude, longitude, type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [name, city_id, total_ports || 16, address, latitude || null, longitude || null, type || 'residential']
    );
    res.json({ id: result.rows[0].id, name, city_id, total_ports, address, latitude, longitude, type: type || 'residential' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/ctos/sync-coords", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  try {
    const ctisRes = await pool.query(`
      SELECT c.id, c.name, c.address, ci.name as city_name 
      FROM ctos c 
      JOIN cities ci ON c.city_id = ci.id 
      WHERE c.latitude IS NULL OR c.longitude IS NULL
      LIMIT $1
    `, [limit]);
    
    // Get total remaining count for progress bar
    const remainingRes = await pool.query("SELECT COUNT(*) FROM ctos WHERE latitude IS NULL OR longitude IS NULL");
    const totalRemaining = parseInt(remainingRes.rows[0].count);
    
    const count = ctisRes.rowCount || 0;
    let fixed = 0;
    let failed = 0;

    for (const cto of ctisRes.rows) {
      if (cto.address) {
        // Pass both street address and city name for better accuracy
        const geo = await geocodeAddress(cto.address, undefined, cto.city_name);
        if (geo) {
          await pool.query(
            "UPDATE ctos SET latitude = $1, longitude = $2 WHERE id = $3",
            [geo.lat, geo.lng, cto.id]
          );
          fixed++;
        } else {
          failed++;
        }
      } else {
        failed++;
      }
    }
    res.json({ total_in_batch: count, fixed, failed, total_remaining: totalRemaining });
  } catch (error: any) {
    console.error("Sync error:", error);
    res.status(500).json({ error: error.message });
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
  let { name, address, total_ports, latitude, longitude } = req.body;
  try {
    // Auto-geocode if coordinates are missing but address is changed or missing coords
    if ((latitude === null || longitude === null || latitude === undefined || longitude === undefined) && address) {
      const geo = await geocodeAddress(address);
      if (geo) {
        latitude = geo.lat;
        longitude = geo.lng;
      }
    }

    await pool.query(
      "UPDATE ctos SET name = $1, address = $2, total_ports = $3, latitude = $4, longitude = $5 WHERE id = $6",
      [name, address, total_ports, latitude || null, longitude || null, req.params.id]
    );
    res.json({ success: true, latitude, longitude });
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

    // Detect format
    const isBaseFormato = rows.length > 0 && 'city_id' in rows[0] && 'name' in rows[0];
    let cityIdMap = new Map<number, boolean>();
    let ctoData: any[][] = [];

    if (isBaseFormato) {
      const ids = Array.from(new Set(rows
        .map((r: any) => { const id = Number(r.city_id); return Number.isFinite(id) ? id : null; })
        .filter((v: any) => v !== null)));

      if (ids.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Nenhum city_id válido na base' });
      }

      const cityCheck = await client.query('SELECT id FROM cities WHERE id = ANY($1)', [ids]);
      cityCheck.rows.forEach((r: any) => cityIdMap.set(r.id, true));

      ctoData = rows.map((row: any) => {
        const cityId = Number(row.city_id);
        if (!cityIdMap.has(cityId)) return null;

        const ctoName = (row.name || '').toString().trim();
        if (!ctoName) return null;

        const totalPorts = Number(row.total_ports) || 16;

        let latitude = Number(row.latitude);
        let longitude = Number(row.longitude);

        const parseCoordsFromAddress = (a: any) => {
          if (!a) return null;
          const coordsMatch = a.toString().match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
          if (!coordsMatch) return null;
          return {
            lat: Number(coordsMatch[1]),
            lng: Number(coordsMatch[2])
          };
        };

        const isCoordValid = (v: number, isLat = true) =>
          Number.isFinite(v) && (isLat ? v >= -91 && v <= 91 : v >= -181 && v <= 181);

        if (!isCoordValid(latitude, true) || !isCoordValid(longitude, false)) {
          const parsed = parseCoordsFromAddress(row.address);
          if (parsed) {
            latitude = parsed.lat;
            longitude = parsed.lng;
          }
        }

        return [
          ctoName,
          cityId,
          row.address && row.address !== '#N/A' ? row.address.toString().trim() : null,
          totalPorts,
          isCoordValid(latitude, true) ? latitude : null,
          isCoordValid(longitude, false) ? longitude : null,
        ];
      }).filter((r: any) => r !== null) as any[][];

    } else {
      // Existing geogrid import path (city names)
      const cityNamesRaw = Array.from(new Set(rows.map((r: any) => (r.cidade || '').toString().replace(/\s*\(Imp\.\)$/i, '').trim())));
      const cityNamesLower = cityNamesRaw.map((n: any) => n.toLowerCase());

      const existingCitiesRes = await client.query(
        "SELECT id, name FROM cities WHERE LOWER(name) = ANY($1)",
        [cityNamesLower]
      );

      const cityIdMapTemp = new Map<string, number>();
      existingCitiesRes.rows.forEach((r: any) => cityIdMapTemp.set(r.name.toLowerCase(), r.id));

      const citiesToCreate = cityNamesRaw.filter((name: string) => !cityIdMapTemp.has(name.toLowerCase()));
      if (citiesToCreate.length > 0) {
        const insertCitiesRes = await client.query(`
          INSERT INTO cities (name)
          SELECT DISTINCT UPPER(name) FROM UNNEST($1::text[]) as name
          ON CONFLICT (name) DO NOTHING
          RETURNING id, name
        `, [citiesToCreate]);

        insertCitiesRes.rows.forEach((r: any) => cityIdMapTemp.set(r.name.toLowerCase(), r.id));
      }

      ctoData = rows.map((row: any) => {
        const cityNameClean = (row.cidade || '').toString().replace(/\s*\(Imp\.\)$/i, '').trim().toLowerCase();
        const cityId = cityIdMapTemp.get(cityNameClean);
        if (!cityId) return null;

        let ctoName = row.sigla && row.sigla !== '**' ? row.sigla : row.sigla_poste;
        ctoName = (ctoName || 'Sem Nome').toString().trim();
        const location = (row.endereco || '').toString().trim() || `${row.lat}, ${row.lng}`;

        let lat = Number(row.lat);
        let lng = Number(row.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          const coordsMatch = location.toString().match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
          if (coordsMatch) {
            lat = Number(coordsMatch[1]);
            lng = Number(coordsMatch[2]);
          }
        }

        return [
          ctoName,
          cityId,
          row.endereco || location || null,
          Number(row.total_ports) || 16,
          Number.isFinite(lat) ? lat : null,
          Number.isFinite(lng) ? lng : null,
          (row.type || 'residential').toString().trim()
        ];
      }).filter((r: any) => r !== null) as any[][];
    }

    if (ctoData.length === 0) {
      await client.query('ROLLBACK');
      return res.json({ success: true, count: 0 });
    }

    // Insert in batch with dedupe
    await client.query(`
      CREATE TEMP TABLE temp_import_ctos (
        name TEXT,
        city_id INTEGER,
        address TEXT,
        total_ports INTEGER,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        type TEXT
      ) ON COMMIT DROP
    `);

    const values = [];
    const params = [];
    for (let i = 0; i < ctoData.length; i++) {
      const offset = i * 7;
      values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
      params.push(...ctoData[i]);
    }

    await client.query(`
      INSERT INTO temp_import_ctos (name, city_id, address, total_ports, latitude, longitude, type)
      VALUES ${values.join(',')}
    `, params);

    const insertRes = await client.query(`
      INSERT INTO ctos (name, city_id, address, total_ports, latitude, longitude, type)
      SELECT DISTINCT t.name, t.city_id, t.address, t.total_ports, t.latitude, t.longitude, t.type
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

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Import error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Helper Geocoding Function
async function geocodeAddress(q: string, street?: string, city?: string, state?: string) {
  console.log(`Geocoding request: q="${q}", street="${street}", city="${city}", state="${state}"`);
  
  // Improved regex for coordinates: handles . or , as decimal, and various delimiters
  const coordsMatch = q.match(/(-?\d+[\.,]\d+)\s*[\s,;]\s*(-?\d+[\.,]\d+)/);
  if (coordsMatch) {
    const lat = parseFloat(coordsMatch[1].replace(',', '.'));
    const lng = parseFloat(coordsMatch[2].replace(',', '.'));
    console.log(`Detected coordinates in query: ${lat}, ${lng}`);
    return {
      lat: lat,
      lng: lng,
      display_name: q,
      details: {}
    };
  }

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;

  try {
    if (googleKey) {
      let url = `https://maps.googleapis.com/maps/api/geocode/json?key=${googleKey}&language=pt-BR`;
      
      let addressParts = [];
      if (street) addressParts.push(street);
      if (city) addressParts.push(city);
      if (state) addressParts.push(state);
      
      let finalAddress = q;
      if (!q && addressParts.length > 0) {
        finalAddress = addressParts.join(', ');
      } else if (q && addressParts.length > 0) {
        // If q is already a full address (contains comma), don't append structured fields as they are likely redundant
        if (!q.includes(',')) {
          finalAddress = `${q}, ${addressParts.join(', ')}`;
        }
      }

      url += `&address=${encodeURIComponent(finalAddress)}`;
      console.log(`Using Google Maps Geocoding: ${finalAddress}`);
      const response = await fetch(url);
      const data = await response.json() as any;
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        console.log(`Google Maps success: ${result.formatted_address}`);
        const components = result.address_components;
        const getComponent = (type: string) => {
          const comp = components.find((c: any) => c.types.includes(type));
          return comp ? comp.long_name : '';
        };
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          display_name: result.formatted_address,
          details: {
            road: getComponent('route'),
            house_number: getComponent('street_number'),
            suburb: getComponent('sublocality_level_1') || getComponent('neighborhood'),
            city: getComponent('administrative_area_level_2') || getComponent('locality'),
            state: getComponent('administrative_area_level_1'),
            postcode: getComponent('postal_code')
          }
        };
      } else {
        console.warn(`Google Maps Geocoding non-OK status: ${data.status}`, data.error_message || '');
      }
    } else {
      console.warn("GOOGLE_MAPS_API_KEY is missing in environment");
    }

    let url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&countrycodes=br`;
    
    // If q looks like a full address (contains a comma), prioritize q as a general search
    if (q && (q.includes(',') || q.split(' ').length > 4)) {
      url += `&q=${encodeURIComponent(q)}`;
    } else if (street || city || state) {
      if (street) url += `&street=${encodeURIComponent(street)}`;
      if (city) url += `&city=${encodeURIComponent(city)}`;
      if (state) url += `&state=${encodeURIComponent(state)}`;
      if (q) url += `&q=${encodeURIComponent(q)}`; // Append q as extra context if small
    } else {
      url += `&q=${encodeURIComponent(q)}`;
    }
    console.log(`Using Nominatim Geocoding fallback: ${url}`);
    const response = await fetch(url, { headers: { 'User-Agent': 'GestaoCTOs/1.0' } });
    const data = await response.json() as any[];
    if (data && data.length > 0) {
      const address = data[0].address || {};
      console.log(`Nominatim success: ${data[0].display_name}`);
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name,
        details: {
          road: address.road || '',
          house_number: address.house_number || '',
          suburb: address.suburb || address.neighbourhood || '',
          city: address.city || address.town || address.village || '',
          state: address.state || '',
          postcode: address.postcode || ''
        }
      };
    }
  } catch (error) {
    console.error("Internal geocoding error:", error);
  }
  return null;
}

// Viability Check
app.get("/api/viability", async (req, res) => {
  const { lat, lng, radius, city_id, city_name, customer_type } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: "Latitude e Longitude são obrigatórias" });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);
  const radiusKm = parseFloat(radius as string) || 1.0;
  let targetCityId: number | null = city_id ? parseInt(city_id as string) : null;
  const targetType = (customer_type as string) || 'residential';

  try {
    // ... city searching logic ...
    if (!targetCityId && city_name) {
      const cityRes = await pool.query(
        "SELECT id FROM cities WHERE $1 ILIKE '%' || name || '%' OR name ILIKE '%' || $1 || '%'",
        [city_name as string]
      );
      if (cityRes.rows.length > 0) {
        targetCityId = cityRes.rows[0].id;
      }
    }

    // Haversine formula to calculate distance in KM
    // optional c.type filter only if column exists for backward compatibility
    const typeInfo = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='ctos' and column_name='type'
    `);
    const hasTypeColumn = (typeInfo.rowCount ?? 0) > 0;

    let queryText = `
      WITH cto_distances AS (
        SELECT 
          c.*, 
          COALESCE(stats.used_ports, 0)::int as used_ports,
          (
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0, 
                cos(radians($1)) * cos(radians(c.latitude)) * 
                cos(radians(c.longitude) - radians($2)) + 
                sin(radians($1)) * sin(radians(c.latitude))
              ))
            )
          ) AS distance
        FROM ctos c
        LEFT JOIN (
          SELECT cto_id, COUNT(*) as used_ports
          FROM clients
          WHERE status = 'active'
          GROUP BY cto_id
        ) stats ON c.id = stats.cto_id
        WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
    `;

    const queryParams: any[] = [latitude, longitude];
    let paramIndex = 3;

    if (hasTypeColumn) {
      queryText += ` AND c.type = $3`;
      queryParams.push(targetType);
      paramIndex = 4;
    }

    if (targetCityId) {
      queryText += ` AND c.city_id = $${paramIndex}`;
      queryParams.push(targetCityId);
      paramIndex++;
    }

    queryText += `
      )
      SELECT * FROM cto_distances
      ORDER BY distance ASC
    `;

    const result = await pool.query(queryText, queryParams);

    const allNearby = result.rows;
    const withinRadius = allNearby.filter(c => c.distance <= radiusKm);
    const allNearbyWithFlags = allNearby.map(c => ({
      ...c,
      within_radius: c.distance <= radiusKm
    }));

    // Stats for troubleshooting
    const statsResult = await pool.query("SELECT COUNT(*) as total, COUNT(latitude) as with_gps FROM ctos");
    const stats = statsResult.rows[0];

    return res.json({
      results: allNearbyWithFlags,
      withinRadiusCount: withinRadius.length,
      closest: allNearby.length > 0 ? { name: allNearby[0].name, distance: allNearby[0].distance } : null,
      stats: {
        total_ctos: parseInt(stats.total),
        ctos_with_gps: parseInt(stats.with_gps),
        search_radius_km: radiusKm,
        search_city: targetCityId ? (await pool.query("SELECT name FROM cities WHERE id = $1", [targetCityId])).rows[0]?.name : null
      }
    });
  } catch (error: any) {
    console.error("Error in viability check:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Walking Route (OSRM)
app.get("/api/route", async (req, res) => {
  const { fromLat, fromLng, toLat, toLng, mode } = req.query;
  if (!fromLat || !fromLng || !toLat || !toLng) {
    return res.status(400).json({ error: "Parâmetros fromLat, fromLng, toLat e toLng são obrigatórios" });
  }

  const fromLatNum = parseFloat(fromLat as string);
  const fromLngNum = parseFloat(fromLng as string);
  const toLatNum = parseFloat(toLat as string);
  const toLngNum = parseFloat(toLng as string);

  if (Number.isNaN(fromLatNum) || Number.isNaN(fromLngNum) || Number.isNaN(toLatNum) || Number.isNaN(toLngNum)) {
    return res.status(400).json({ error: "Coordenadas inválidas" });
  }

  const profile = (mode === 'driving' || mode === 'cycling') ? mode : 'walking';
  // Use radiuses=100;100 to prevent snapping to roads further than 100m away
  const url = `https://router.project-osrm.org/route/v1/${profile}/${fromLngNum},${fromLatNum};${toLngNum},${toLatNum}?overview=full&geometries=geojson&steps=true&radiuses=100;100`; 

  try {
    const routeRes = await fetch(url, { headers: { 'User-Agent': 'GestaoCTOs/1.0' } });
    if (!routeRes.ok) {
      return res.status(502).json({ error: `Erro ao obter rota de ${profile}` });
    }

    const routeData = await routeRes.json() as any;
    if (!routeData || routeData.code !== 'Ok' || !routeData.routes?.length) {
      return res.status(404).json({ error: 'Rota não encontrada' });
    }

    const selected = routeData.routes[0];
    return res.json({
      distance: selected.distance,
      duration: selected.duration,
      geometry: selected.geometry,
      legs: selected.legs,
      profile
    });
  } catch (error: any) {
    console.error('Erro ao calcular rota:', error);
    res.status(500).json({ error: 'Erro interno no cálculo de rota' });
  }
});

// Geocoding
app.get("/api/geocode", async (req, res) => {
  const { q, street, city, state } = req.query;
  try {
    const result = await geocodeAddress(q as string, street as string, city as string, state as string);
    if (result) {
      res.json(result);
    } else {
      res.status(404).json({ error: "Endereço não encontrado" });
    }
  } catch (error: any) {
    console.error("Geocoding error:", error);
    res.status(500).json({ error: "Erro ao buscar coordenadas" });
  }
});

// Reverse Geocoding
app.get("/api/reverse-geocode", async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "Latitude e Longitude são obrigatórias" });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
      headers: {
        'User-Agent': 'GestaoCTOs/1.0'
      }
    });
    const data = await response.json() as any;
    
    if (data && data.address) {
      const address = data.address;
      res.json({
        display_name: data.display_name,
        details: {
          road: address.road || '',
          house_number: address.house_number || '',
          suburb: address.suburb || address.neighbourhood || '',
          city: address.city || address.town || address.village || '',
          state: address.state || '',
          postcode: address.postcode || ''
        }
      });
    } else {
      res.status(404).json({ error: "Localização não encontrada" });
    }
  } catch (error: any) {
    console.error("Reverse geocoding error:", error);
    res.status(500).json({ error: "Erro ao buscar detalhes do endereço" });
  }
});

// Search
app.get("/api/search", async (req, res) => {
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