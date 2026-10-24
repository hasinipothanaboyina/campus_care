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

async function inspect() {
  const client = createClient(supabaseUrl, supabaseKey);

  // Authenticate as Admin to bypass RLS restrictions for read-only inspection
  const { data: auth, error: aErr } = await client.auth.signInWithPassword({
    email: 'admin@srgec.edu',
    password: 'srgec@123'
  });
  if (aErr) {
    console.error('Admin auth failed:', aErr);
    return;
  }

  console.log('=== INSPECTION: submissions ===');
  const { data: sub410, error: subErr } = await client
    .from('submissions')
    .select('*')
    .or('id.eq.CC-2026-410,title.ilike.%fan%');
  console.log('submissions matching CC-2026-410 or %fan%:', JSON.stringify(sub410, null, 2), subErr);

  console.log('\n=== INSPECTION: resolution_records ===');
  const { data: resData, error: resErr } = await client
    .from('resolution_records')
    .select('*')
    .or('submission_id.eq.CC-2026-410,notes.ilike.%fan%,action_taken.ilike.%fan%');
  console.log('resolution_records matching CC-2026-410:', JSON.stringify(resData, null, 2), resErr);

  console.log('\n=== INSPECTION: assignments ===');
  const { data: assignData, error: assignErr } = await client
    .from('assignments')
    .select('*')
    .eq('submission_id', 'CC-2026-410');
  console.log('assignments matching CC-2026-410:', JSON.stringify(assignData, null, 2), assignErr);

  console.log('\n=== INSPECTION: status_history ===');
  const { data: histData, error: histErr } = await client
    .from('status_history')
    .select('*')
    .eq('submission_id', 'CC-2026-410');
  console.log('status_history matching CC-2026-410:', JSON.stringify(histData, null, 2), histErr);

  console.log('\n=== INSPECTION: all recent resolution_records ===');
  const { data: allRes } = await client.from('resolution_records').select('*').limit(10);
  console.log('all recent resolution_records:', JSON.stringify(allRes, null, 2));

  console.log('\n=== INSPECTION: all recent assignments ===');
  const { data: allAssign } = await client.from('assignments').select('*').limit(10);
  console.log('all recent assignments:', JSON.stringify(allAssign, null, 2));
}

inspect().catch(console.error);
