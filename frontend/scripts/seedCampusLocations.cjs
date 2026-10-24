const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '', supabaseKey = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
}

const LOCATIONS = [
  'M Block',
  'Shed A',
  'Shed B',
  'Shed C',
  'N Block',
  'Pharmacy Block',
  'P Block',
  'Hostel',
  'Canteen',
  'Gym',
  'Football Court',
  'Parking',
];

async function updateLocationsTable() {
  const client = createClient(supabaseUrl, supabaseKey);
  await client.auth.signInWithPassword({
    email: 'admin@srgec.edu',
    password: 'srgec@123'
  });

  console.log('Seeding 12 campus locations into public.locations table in Supabase...');

  // Delete old placeholder locations from locations table (only if not referenced by FK)
  try {
    const { error: delErr } = await client.from('locations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delErr) console.log('Notice on delete old locations:', delErr.message);
  } catch (e) {
    console.log('Delete note:', e.message);
  }

  // Insert the 12 actual campus locations
  for (const loc of LOCATIONS) {
    const { error: insErr } = await client.from('locations').insert({
      building: loc,
      room: 'General'
    });
    if (insErr) {
      console.log(`Note inserting ${loc}:`, insErr.message);
    } else {
      console.log(`✓ Inserted: ${loc}`);
    }
  }

  const { data: allLocs } = await client.from('locations').select('*');
  console.log('\nCurrent locations in Supabase DB:');
  console.log(allLocs.map(l => l.building));
}

updateLocationsTable().catch(console.error);
