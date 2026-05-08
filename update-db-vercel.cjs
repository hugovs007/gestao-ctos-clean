const { execSync } = require('child_process');

const variables = {
    DATABASE_URL: "postgresql://postgres.omxelcqvaahvrqqaxvps:Z5ASBF5zGXS37D72@aws-1-us-east-2.pooler.supabase.com:6543/postgres",
};

const toRemove = ['PGUSER', 'PGPASSWORD'];

for (const key of toRemove) {
    try {
        console.log(`Removing ${key}...`);
        execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' });
    } catch (e) {}
}

for (const [key, value] of Object.entries(variables)) {
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
