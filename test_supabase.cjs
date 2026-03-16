
const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ override: true });

async function testConnection() {
  console.log('Testing connection to Supabase...');
  console.log('URL starting with:', process.env.DATABASE_URL.substring(0, 30) + '...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Server time:', res.rows[0].now);
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in public schema:', tables.rows.map(t => t.table_name));

  } catch (err) {
    console.error('❌ Connection failed!');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    if (err.detail) console.error('Error detail:', err.detail);
  } finally {
    await client.end();
  }
}

testConnection();
