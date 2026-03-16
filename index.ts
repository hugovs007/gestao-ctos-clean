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

// Se não carregou, exibe aviso
if (!process.env.DATABASE_URL) {
  console.error('❌ ERRO: DATABASE_URL não encontrada no .env');
}

// Agora importa e executa o servidor
import('./api/server.ts').catch(err => {
  console.error('Erro ao iniciar servidor:', err);
});