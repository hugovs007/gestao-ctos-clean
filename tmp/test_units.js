
const API_URL = 'http://localhost:3000/api';

async function testUnits() {
  console.log('Testing Units API...');
  
  // 1. Create a Unit
  const createRes = await fetch(`${API_URL}/units`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Unidade Teste' })
  });
  const newUnit = await createRes.json();
  console.log('Created Unit:', newUnit);

  // 2. List Units
  const listRes = await fetch(`${API_URL}/units`);
  const units = await listRes.json();
  console.log('Units List:', units);

  // 3. Update Unit
  await fetch(`${API_URL}/units/${newUnit.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Unidade Teste Editada' })
  });
  console.log('Updated Unit');

  // 4. Create a City with this Unit
  const cityRes = await fetch(`${API_URL}/cities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Cidade Teste', unit_id: newUnit.id })
  });
  const newCity = await cityRes.json();
  console.log('Created City with Unit:', newCity);

  // 5. Cleanup (optional)
  // await fetch(`${API_URL}/units/${newUnit.id}`, { method: 'DELETE' });
  // console.log('Deleted Unit');
}

// Note: This script assumes the server is running on localhost:3000
// testUnits();
console.log('Script written. Please ensure the server is running before executing.');
