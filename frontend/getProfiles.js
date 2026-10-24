const fs = require('fs');

let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
let anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) anonKey = line.split('=')[1].trim();
  }
}

async function getProfiles() {
  const url = `${supabaseUrl}/rest/v1/profiles?select=*`;
  const response = await fetch(url, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  });
  const data = await response.json();
  console.log('Retrieved profiles count:', Array.isArray(data) ? data.length : 'error');
}

getProfiles();
