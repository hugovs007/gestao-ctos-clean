const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const rawKey = envConfig.FIREBASE_PRIVATE_KEY;

const header = '-----BEGIN PRIVATE KEY-----';
const footer = '-----END PRIVATE KEY-----';

let cleanKey = rawKey;
if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
    cleanKey = cleanKey.slice(1, -1);
}
cleanKey = cleanKey.replace(/\\n/g, '\n').trim();

const base64Part = cleanKey.split(header)[1].split(footer)[0].replace(/\s+/g, '');

console.log("Base64 length:", base64Part.length);

const invalidChars = base64Part.match(/[^a-zA-Z0-9+/=]/g);
if (invalidChars) {
    console.log("Invalid characters found:", JSON.stringify(invalidChars));
} else {
    console.log("No invalid Base64 characters found.");
}

// Tenta decodificar e verificar se o Buffer resultante parece um DER
const buf = Buffer.from(base64Part, 'base64');
console.log("Buffer length:", buf.length);
if (buf[0] === 0x30 && buf[1] === 0x82) {
    console.log("Looks like a valid ASN.1 Sequence.");
    const length = (buf[2] << 8) | buf[3];
    console.log("ASN.1 encoded length:", length);
    console.log("Total bytes needed (header + content):", length + 4);
} else {
    console.log("Does NOT look like a valid ASN.1 Sequence.");
}
