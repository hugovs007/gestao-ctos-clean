import fs from 'fs';
import { execSync } from 'child_process';

const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split('\n');

for (const line of lines) {
  if (line.trim() === '' || line.startsWith('#')) continue;
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1];
    let value = match[2];
    
    if (key !== 'FIREBASE_PROJECT_ID') continue;

    // Remove enclosing quotes if they exist
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    
    console.log(`Atualizando variável: ${key}...`);
    try {
      execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' });
    } catch (e) {}
    
    try {
      const out = execSync(`npx vercel env add ${key} production`, {
        input: value,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      console.log(`✅ ${key} enviada com sucesso: ${out.toString().trim()}`);
    } catch (e) {
      console.error(`❌ Falha ao enviar ${key}:`, e.stderr ? e.stderr.toString() : e.message);
    }
  }
}
console.log('✅ Todas as variáveis foram enviadas! Por favor, faça um novo deploy (npx vercel --prod).');
