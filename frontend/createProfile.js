const fs = require('fs');

let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
let apikey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) apikey = line.split('=')[1].trim();
  }
}

async function createProfile() {
  const token = process.env.AUTH_TOKEN;
  if (!token) {
    console.log('Script requires valid AUTH_TOKEN environment variable. Aborting.');
    return;
  }
  const url = `${supabaseUrl}/rest/v1/profiles`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': apikey,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      full_name: "Principal Admin",
      email: "admin@srgec.edu",
      role: "ADMIN",
      student_id: "24481A67383",
      department: "Administration",
      is_approved: true
    })
  });
  const data = await response.json();
  console.log('Result status:', response.status);
}

createProfile();
