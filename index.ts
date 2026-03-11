import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar caminhos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar .env com caminho absoluto
console.log('📁 Carregando .env de:', path.join(__dirname, '.env'));
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('✅ DATABASE_URL:', process.env.DATABASE_URL ? 'presente' : 'ausente');

// Se não carregou, tenta hard-code (último recurso)
if (!process.env.DATABASE_URL) {
  console.log('⚠️ Usando DATABASE_URL hard-coded para teste');
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_oInDt2H6EWUh@ep-winter-mode-ac8fc3d9.sa-east-1.aws.neon.tech/neondb?sslmode=require';
}

// Agora importa e executa o servidor
import('./server.ts').catch(err => {
  console.error('Erro ao iniciar servidor:', err);
});