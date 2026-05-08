const admin = require('firebase-admin');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
let rawKey = envConfig.FIREBASE_PRIVATE_KEY;

let privateKey = rawKey;
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}
privateKey = privateKey.replace(/\\n/g, '\n');

console.log("Parsed Key length:", privateKey.length);
console.log("JSON.stringify of privateKey:", JSON.stringify(privateKey));

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'pxx-tech-pro',
      clientEmail: 'firebase-adminsdk-fbsvc@pxx-tech-pro.iam.gserviceaccount.com',
      privateKey,
    }),
  });
  console.log("Firebase initialized successfully from .env file!");
} catch (error) {
  console.error("Firebase init failed:", error);
}
