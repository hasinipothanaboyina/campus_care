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

async function auditDatabase() {
  console.log('========================================================================');
  console.log('🔍 CAMPUSCARE: COMPREHENSIVE SUPABASE DATABASE & SCHEMA AUDIT');
  console.log('========================================================================\n');

  const adminClient = createClient(supabaseUrl, supabaseKey);
  const { data: auth, error: aErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@srgec.edu',
    password: 'srgec@123'
  });
  if (aErr) {
    console.error('FAIL: Admin login failed:', aErr);
    return;
  }
  console.log('PASS: Authenticated as Admin (UID:', auth.user.id, ')\n');

  const tables = [
    'profiles',
    'submissions',
    'supports',
    'resolution_records',
    'status_history',
    'assignments',
    'parent_student_links',
    'notifications'
  ];

  for (const t of tables) {
    const { data, error } = await adminClient.from(t).select('*').limit(1);
    if (error) {
      console.log(`❌ Table [${t}]: ERROR ->`, error.message);
    } else {
      console.log(`✅ Table [${t}]: ACCESSIBLE -> Columns:`, data.length > 0 ? Object.keys(data[0]) : '(Table is currently empty)');
    }
  }

  // Audit RLS on critical tables
  console.log('\n--- Auditing Student & Parent Permissions on Tables ---');

  // Test Student client
  const studentClient = createClient(supabaseUrl, supabaseKey);
  await studentClient.auth.signInWithPassword({
    email: '24481a54e9@campuscare.edu',
    password: 'Password123!'
  });

  const { data: stuSubs, error: stuSubErr } = await studentClient.from('submissions').select('id, title, student_id').limit(5);
  console.log('Student SELECT submissions:', stuSubErr ? 'FAIL: ' + stuSubErr.message : `PASS (${stuSubs.length} rows accessible)`);

  const { data: stuProfs, error: stuProfErr } = await studentClient.from('profiles').select('id, student_id').limit(5);
  console.log('Student SELECT profiles:', stuProfErr ? 'FAIL: ' + stuProfErr.message : `PASS (${stuProfs.length} rows accessible)`);

  const { data: stuNotifs, error: stuNotifErr } = await studentClient.from('notifications').select('*').limit(5);
  console.log('Student SELECT notifications:', stuNotifErr ? 'FAIL: ' + stuNotifErr.message : `PASS (${stuNotifs.length} rows accessible)`);

  console.log('\n========================================================================');
  console.log('🏁 SCHEMA & RLS AUDIT FINISHED');
  console.log('========================================================================');
}

auditDatabase();
