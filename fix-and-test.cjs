const fs = require('fs');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const rawKey = envConfig.FIREBASE_PRIVATE_KEY;

const header = '-----BEGIN PRIVATE KEY-----';
const footer = '-----END PRIVATE KEY-----';

let cleanKey = rawKey;
if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
    cleanKey = cleanKey.slice(1, -1);
}
// Remove literal \n e espaços do conteúdo entre os headers
let base64Part = cleanKey.split(header)[1].split(footer)[0];
base64Part = base64Part.replace(/\\n/g, '').replace(/\s+/g, '');

// Reconstrói o PEM correto
let formattedKey = header + '\n';
for (let i = 0; i < base64Part.length; i += 64) {
    formattedKey += base64Part.substring(i, i + 64) + '\n';
}
formattedKey += footer + '\n';

console.log("Reconstructed Key length:", formattedKey.length);

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'pxx-tech-pro',
      clientEmail: 'firebase-adminsdk-fbsvc@pxx-tech-pro.iam.gserviceaccount.com',
      privateKey: formattedKey,
    }),
  });
  console.log("SUCCESS! Firebase initialized with reconstructed key.");
  
  // Se funcionou, salva no .env
  const envContent = fs.readFileSync('.env', 'utf8');
  const escapedKey = formattedKey.replace(/\n/g, '\\n');
  const newEnvContent = envContent.replace(
      /FIREBASE_PRIVATE_KEY=.*/,
      `FIREBASE_PRIVATE_KEY="${escapedKey}"`
  );
  fs.writeFileSync('.env', newEnvContent);
  console.log(".env file updated with the working key.");
} catch (error) {
  console.error("STILL FAILING:", error);
}
