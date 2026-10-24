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

async function syncHistorical() {
  const client = createClient(supabaseUrl, supabaseKey);
  await client.auth.signInWithPassword({
    email: 'admin@srgec.edu',
    password: 'srgec@123'
  });

  console.log('=== Checking submissions with resolution_records but unassigned ===');
  const { data: resolutions } = await client.from('resolution_records').select('*');
  console.log(`Found ${resolutions.length} resolution records.`);

  for (const r of resolutions) {
    const { data: sub } = await client.from('submissions').select('id, assigned_to, status').eq('id', r.submission_id).single();
    if (sub) {
      console.log(`Submission ${sub.id}: status=${sub.status}, assigned_to=${sub.assigned_to}, resolved_by=${r.responsible_person}`);
      if (!sub.assigned_to && r.responsible_person) {
        console.log(`-> Synchronizing assigned_to = "${r.responsible_person}" on submission ${sub.id}...`);
        await client
          .from('submissions')
          .update({
            assigned_to: r.responsible_person,
            assigned_team: 'Facilities Maintenance',
            updated_at: new Date().toISOString()
          })
          .eq('id', sub.id);

        // Also ensure an assignments record exists
        const { data: existAssign } = await client
          .from('assignments')
          .select('id')
          .eq('submission_id', sub.id);

        if (!existAssign || existAssign.length === 0) {
          console.log(`-> Inserting assignment record for ${sub.id}...`);
          await client.from('assignments').insert({
            submission_id: sub.id,
            assigned_to: r.responsible_person,
            assigned_team: 'Facilities Maintenance'
          });
        }
      }
    }
  }

  // Verify CC-2026-410 after sync
  const { data: verify410 } = await client.from('submissions').select('*').eq('id', 'CC-2026-410').single();
  console.log('\nVerified CC-2026-410 post-sync:');
  console.log(`ID: ${verify410.id}`);
  console.log(`Status: ${verify410.status}`);
  console.log(`Assigned To: ${verify410.assigned_to}`);
  console.log(`Assigned Team: ${verify410.assigned_team}`);
}

syncHistorical().catch(console.error);
