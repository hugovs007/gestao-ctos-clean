
const { Client } = require('pg');

async function fastActivate() {
  console.log('🚀 Iniciando ALGORITMO TURBO DE ATIVAÇÃO SQL...');
  
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
    console.log('✅ Conectado ao Supabase.');

    console.log('🔄 Executando extração de alta performance direto no banco...');
    
    // SQL Turbo Algorithm - Extração via substituição e casting
    const sql = `
      UPDATE ctos 
      SET 
        latitude = CAST(substring(address from '(-?\\d+[,.]\\d+)\\s*,\\s*-?\\d+[,.]\\d+') AS DOUBLE PRECISION),
        longitude = CAST(substring(address from '-?\\d+[,.]\\d+\\s*,\\s*(-?\\d+[,.]\\d+)') AS DOUBLE PRECISION)
      WHERE 
        latitude IS NULL 
        AND address IS NOT NULL
        AND address ~ '(-?\\d+[,.]\\d+)\\s*,\\s*(-?\\d+[,.]\\d+)'
      RETURNING id;
    `;

    const res = await client.query(sql);
    console.log(`\n✨ SUCESSO TOTAL!`);
    console.log(`✅ ${res.rowCount} CTOs foram ativadas INSTANTANEAMENTE.`);
    
    // Check remaining
    const remaining = await client.query("SELECT COUNT(*) FROM ctos WHERE latitude IS NULL");
    console.log(`ℹ️ Restam ${remaining.rows[0].count} CTOs sem localização (precisam de geocodificação via endereço de rua).`);

  } catch (err) {
    console.error('\n❌ Erro no algoritmo turbo:', err.message);
  } finally {
    await client.end();
  }
}

fastActivate();
