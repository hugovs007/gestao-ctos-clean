const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const rawKey = envConfig.FIREBASE_PRIVATE_KEY;

console.log("Raw Key (first 50):", rawKey.substring(0, 50));
console.log("Raw Key (last 50):", rawKey.substring(rawKey.length - 50));

let processedKey = rawKey;
if (processedKey.startsWith('"') && processedKey.endsWith('"')) {
    processedKey = processedKey.slice(1, -1);
}
processedKey = processedKey.replace(/\\n/g, '\n');

console.log("Processed Key (first 50) [JSON]:", JSON.stringify(processedKey.substring(0, 50)));
console.log("Processed Key (last 50) [JSON]:", JSON.stringify(processedKey.substring(processedKey.length - 50)));

// Verifica se existem espaços extras ou caracteres invisíveis
console.log("Starts with header:", processedKey.startsWith('-----BEGIN PRIVATE KEY-----'));
console.log("Ends with footer:", processedKey.trim().endsWith('-----END PRIVATE KEY-----'));
