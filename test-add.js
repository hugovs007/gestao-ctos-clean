const { execSync } = require('child_process');
try {
  const result = execSync('npx vercel env add TEST_VAR_2 production', {
    input: 'test_value_2',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.log("Success:", result.toString());
} catch (e) {
  console.log("Error:", e.stderr.toString());
}
