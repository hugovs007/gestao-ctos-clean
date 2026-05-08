const fs = require('fs');
const dotenv = require('dotenv');

const envPath = '.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = dotenv.parse(envContent);

let rawKey = envConfig.FIREBASE_PRIVATE_KEY;

// 1. Limpa a chave: remove aspas, resolve \n literais, remove espaços extras
let cleanKey = rawKey;
if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
    cleanKey = cleanKey.slice(1, -1);
}
cleanKey = cleanKey.replace(/\\n/g, '\n').trim();

// 2. Extrai o conteúdo Base64 (entre os headers)
const header = '-----BEGIN PRIVATE KEY-----';
const footer = '-----END PRIVATE KEY-----';

if (cleanKey.includes(header) && cleanKey.includes(footer)) {
    const base64Part = cleanKey
        .split(header)[1]
        .split(footer)[0]
        .replace(/\s+/g, ''); // Remove todos os espaços/quebras de linha do Base64

    // 3. Reconstrói o PEM com quebras de linha a cada 64 caracteres (padrão)
    let formattedKey = header + '\n';
    for (let i = 0; i < base64Part.length; i += 64) {
        formattedKey += base64Part.substring(i, i + 64) + '\n';
    }
    formattedKey += footer + '\n';

    console.log("Key reformatted successfully!");
    
    // 4. Atualiza o arquivo .env
    // Vamos substituir a linha FIREBASE_PRIVATE_KEY
    const escapedKey = formattedKey.replace(/\n/g, '\\n');
    const newEnvContent = envContent.replace(
        /FIREBASE_PRIVATE_KEY=.*/,
        `FIREBASE_PRIVATE_KEY="${escapedKey}"`
    );
    
    fs.writeFileSync(envPath, newEnvContent);
    console.log("File .env updated with formatted key.");
} else {
    console.error("Could not find headers/footers in the key.");
}
