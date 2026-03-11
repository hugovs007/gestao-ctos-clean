import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Força o carregamento do .env
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('✅ Variáveis de ambiente carregadas. DATABASE_URL:', process.env.DATABASE_URL ? 'presente' : 'ausente');

// Se não carregou, tenta com caminho absoluto alternativo
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: 'C:\\pxxope\\gestao-ctos\\.env' });
  console.log('🔄 Tentativa 2 - DATABASE_URL:', process.env.DATABASE_URL ? 'presente' : 'ausente');
}

// Se ainda não carregou, mostra erro
if (!process.env.DATABASE_URL) {
  console.error('❌ CRÍTICO: Não foi possível carregar DATABASE_URL');
  process.exit(1);
}