const fs = require('fs');

// Load environment variables from .env
let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
let anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@srgec.edu';
const adminPassword = process.env.ADMIN_PASSWORD || '';

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) anonKey = line.split('=')[1].trim();
  }
}

async function checkLogin() {
  if (!adminPassword) {
    console.error('Error: ADMIN_PASSWORD environment variable is required to run checkLogin.');
    return;
  }
  const loginUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`;
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword
    })
  });
  const data = await response.json();
  console.log('Login status:', response.status, data.user ? 'Authenticated successfully' : data.error_description || 'Auth failed');
}

checkLogin();
