
import pkg from 'pg';
const { Client } = pkg;

async function activate() {
  console.log('🚀 Iniciando ALGORITMO DE ATIVAÇÃO EM MASSA (Explicit Params)...');
  
  const client = new Client({
    user: 'postgres.omxelcqvaahvrqqaxvps',
    host: 'aws-1-us-east-2.pooler.supabase.com',
    database: 'postgres',
    password: 'Z5ASBF5zGXS37D72',
    port: 6543,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao Supabase com sucesso.');

    const res = await client.query(`
      SELECT id, address 
      FROM ctos 
      WHERE latitude IS NULL 
      AND address IS NOT NULL 
    `);

    console.log(`📊 Total de CTOs sem GPS: ${res.rows.length}`);
    
    let updated = 0;
    let ignored = 0;
    
    console.log('🔄 Processando...');

    // Processar em blocos
    for (let i = 0; i < res.rows.length; i += 100) {
      const batch = res.rows.slice(i, i + 100);
      const updates = [];
      
      for (const row of batch) {
        // Regex para capturar "-6.8893, -36.9112" ou similares
        const match = row.address.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          updates.push(client.query(
            "UPDATE ctos SET latitude = $1, longitude = $2 WHERE id = $3",
            [lat, lng, row.id]
          ));
        } else {
          ignored++;
        }
      }

      if (updates.length > 0) {
        await Promise.all(updates);
        updated += updates.length;
      }
      
      const totalProcessed = i + batch.length;
      process.stdout.write(`\rProgresso: ${totalProcessed}/${res.rows.length} | Ativadas: ${updated} | Ignoradas: ${ignored}`);
    }

    console.log('\n\n ✨ ALGORITMO CONCLUÍDO!');
    console.log(`✅ ${updated} CTOs foram ativadas.`);
    console.log(`ℹ️ ${ignored} CTOs ignoradas (sem coordenadas no texto).`);

  } catch (err) {
    console.error('\n❌ Erro crítico:', err.message);
  } finally {
    await client.end();
  }
}

activate();
