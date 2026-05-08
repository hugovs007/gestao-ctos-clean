const fs = require('fs');
const { execSync } = require('child_process');

const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split('\n');

const varsToSync = [
    'DATABASE_URL',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'GOOGLE_MAPS_API_KEY',
    'GEOGRID_TOKEN'
];

for (const line of lines) {
  if (line.trim() === '' || line.startsWith('#')) continue;
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    
    if (!varsToSync.includes(key)) continue;

    // Remove enclosing quotes if they exist
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    
    console.log(`Updating ${key}...`);
    try {
      execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' });
    } catch (e) {}
    
    try {
      execSync(`npx vercel env add ${key} production`, {
        input: value,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      console.log(`✅ ${key} updated.`);
    } catch (e) {
      console.error(`❌ Failed to update ${key}:`, e.stderr ? e.stderr.toString() : e.message);
    }
  }
}
console.log('Done. Please redeploy.');
