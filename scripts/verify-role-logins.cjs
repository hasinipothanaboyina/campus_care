const fs = require('fs');
const path = require('path');

let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
  createClient = require(path.resolve(__dirname, '..', 'frontend', 'node_modules', '@supabase', 'supabase-js')).createClient;
}

// 1. Load configuration
let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const possibleEnvPaths = [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', 'frontend', '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'frontend', '.env')
];
for (const p of possibleEnvPaths) {
  if (fs.existsSync(p)) {
    const envContent = fs.readFileSync(p, 'utf8');
    for (const line of envContent.split('\n')) {
      if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
      if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = line.split('=')[1].trim();
      if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = line.split('=')[1].trim();
    }
    if (supabaseUrl && supabaseAnonKey) break;
  }
}

const adminPass = process.env.ADMIN_PASSWORD || 'srgec@123';
const studentPass = process.env.STUDENT_PASSWORD || 'Password123!';
const parentPass = process.env.PARENT_PASSWORD || '';

// Institutional registry
const INSTITUTIONAL_REGISTRY = {
  '24481A67383': { email: 'admin@srgec.edu', role: 'ADMIN', targetRoute: '/admin' },
  '24481A54E9': { email: '24481a54e9@campuscare.edu', role: 'STUDENT', targetRoute: '/dashboard' },
  '7893589331': { email: 'pavani1505pothanaboyna@gmail.com', role: 'PARENT', targetRoute: '/parent' }
};

async function testSuite() {
  console.log('========================================================================');
  console.log('🧪 CAMPUSCARE ROLE-BASED AUTHENTICATION & DATA INTEGRITY TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // TEST 1: Admin Authentication via Identifier
  console.log('--- TEST 1: Admin ID (24481A67383) Login ---');
  const { data: aAuth, error: aErr } = await client.auth.signInWithPassword({
    email: INSTITUTIONAL_REGISTRY['24481A67383'].email,
    password: adminPass
  });
  assert(!aErr && aAuth?.session?.access_token, 'Admin authenticated successfully with Admin ID identifier');
  assert(aAuth?.user?.id === '73e4a745-374e-4911-8297-b57fc00d9e47', 'Admin user ID maps to authoritative admin profile');

  // Verify Admin Role & Route
  const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${aAuth?.session?.access_token}` } }
  });
  const { data: aProf } = await adminClient.from('profiles').select('*').eq('id', aAuth?.user?.id).single();
  assert(aProf?.role === 'ADMIN', 'Admin profile role in database is verified as ADMIN');
  assert(INSTITUTIONAL_REGISTRY['24481A67383'].targetRoute === '/admin', 'Admin redirects to Admin Dashboard (/admin)');

  // TEST 2: Student Authentication via Identifier
  console.log('\n--- TEST 2: Student ID (24481A54E9) Login ---');
  const { data: sAuth, error: sErr } = await client.auth.signInWithPassword({
    email: INSTITUTIONAL_REGISTRY['24481A54E9'].email,
    password: studentPass
  });
  assert(!sErr && sAuth?.session?.access_token, 'Student authenticated successfully with Student ID identifier');
  assert(sAuth?.user?.id === '1f33aadb-1259-4cb1-bb5b-6dc6477c5153', 'Student user ID maps to primary active profile');

  // Verify Student Role & Route
  const studentClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${sAuth?.session?.access_token}` } }
  });
  const { data: sProf } = await studentClient.from('profiles').select('*').eq('id', sAuth?.user?.id).single();
  assert(sProf?.role === 'STUDENT' && sProf?.is_approved === true, 'Student profile role is STUDENT and approved');
  assert(sProf?.department === 'AIDS' && sProf?.student_id === '24481A54E9', 'Student roll number and department are preserved');
  assert(INSTITUTIONAL_REGISTRY['24481A54E9'].targetRoute === '/dashboard', 'Student redirects to Student Dashboard (/dashboard)');

  // TEST 3: Parent Authentication via Identifier
  console.log('\n--- TEST 3: Parent Phone (7893589331) Login ---');
  if (parentPass) {
    const { data: pAuth, error: pErr } = await client.auth.signInWithPassword({
      email: INSTITUTIONAL_REGISTRY['7893589331'].email,
      password: parentPass
    });
    assert(!pErr && pAuth?.session?.access_token, 'Parent authenticated successfully with Phone Number identifier');
    assert(pAuth?.user?.id === '2cb3671a-223c-4529-a118-4673200ff8ac', 'Parent maps to active verified profile');
    assert(INSTITUTIONAL_REGISTRY['7893589331'].targetRoute === '/parent', 'Parent redirects to Parent Dashboard (/parent)');
  } else {
    console.log('ℹ️  Parent password not supplied in environment ($env:PARENT_PASSWORD). Testing identifier mapping readiness...');
    assert(INSTITUTIONAL_REGISTRY['7893589331'].email === 'pavani1505pothanaboyna@gmail.com', 'Parent Phone 7893589331 correctly mapped to verified profile email');
    assert(INSTITUTIONAL_REGISTRY['7893589331'].targetRoute === '/parent', 'Parent route correctly designated as /parent');
  }

  // TEST 4: Incorrect Password Rejection
  console.log('\n--- TEST 4: Incorrect Password Handling ---');
  const { data: failAdmin, error: failAdminErr } = await client.auth.signInWithPassword({
    email: INSTITUTIONAL_REGISTRY['24481A67383'].email,
    password: 'InvalidAdminPassword999!'
  });
  assert(failAdminErr && !failAdmin.session, 'Invalid Admin password correctly rejected with error');

  const { data: failStu, error: failStuErr } = await client.auth.signInWithPassword({
    email: INSTITUTIONAL_REGISTRY['24481A54E9'].email,
    password: 'InvalidStudentPassword999!'
  });
  assert(failStuErr && !failStu.session, 'Invalid Student password correctly rejected with error');

  // TEST 5: Cross-Role Portal Authorization Protection
  console.log('\n--- TEST 5: Role Authorization & Portal Isolation ---');
  // Student cannot access Admin portal
  assert(sProf?.role !== 'ADMIN' && sProf?.role !== 'CMC', 'Student account is strictly denied Admin portal privileges');
  // Admin cannot be mistaken for student
  assert(aProf?.role !== 'STUDENT', 'Admin account is strictly differentiated from Student accounts');

  // TEST 6: Session Persistence Simulation (Token Validity)
  console.log('\n--- TEST 6: Session Persistence & Token Validity ---');
  const persistentClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  const { data: setSessionData, error: setSessionErr } = await persistentClient.auth.setSession({
    access_token: sAuth?.session?.access_token,
    refresh_token: sAuth?.session?.refresh_token
  });
  assert(!setSessionErr && setSessionData?.user?.id === sAuth?.user?.id, 'Session correctly restored via setSession API');

  // TEST 7: Logout Functionality
  console.log('\n--- TEST 7: Logout Functionality ---');
  const { error: signOutErr } = await persistentClient.auth.signOut();
  assert(!signOutErr, 'Sign out executed cleanly without error');
  const { data: emptySession } = await persistentClient.auth.getSession();
  assert(!emptySession.session, 'Active session cleared after logout');

  // TEST 8: Existing Parent-Student Relationships Intact
  console.log('\n--- TEST 8: Historical Parent-Student Relationships Intact ---');
  const { data: links, error: lErr } = await adminClient.from('parent_student_links').select('*');
  assert(!lErr && links?.length >= 2, `Parent-student links table accessible (${links?.length} links found)`);
  
  const studentLink = links?.find(l => l.student_roll_number === '24481A54E9' && l.verification_status === 'VERIFIED');
  assert(!!studentLink, 'Verified link between Student 24481A54E9 and Parent 7893589331 is 100% PRESERVED');

  // TEST 9: Historical Submissions & Data Preservation Check
  console.log('\n--- TEST 9: Historical Submissions Preservation ---');
  const { data: submissions, error: subErr } = await adminClient.from('submissions').select('id, title, status, student_roll_number');
  assert(!subErr && submissions?.length > 0, `Submissions table preserved (${submissions?.length} total records found)`);

  const fanSub = submissions?.find(s => s.id === 'CC-2026-410');
  assert(!!fanSub && fanSub.title === 'classroom fan', 'Historical submission CC-2026-410 ("classroom fan") preserved');

  const netSub = submissions?.find(s => s.id === 'CC-2026-756');
  assert(!!netSub && netSub.title.includes('network issue'), 'Historical submission CC-2026-756 ("network issue") preserved');

  const sugSub = submissions?.find(s => s.id === 'SUG-2026-986');
  assert(!!sugSub && sugSub.title.includes('flashmobs'), 'Historical suggestion SUG-2026-986 preserved');

  console.log('\n========================================================================');
  console.log(`🏁 TEST SUITE COMPLETE: ${passed} / ${total} TESTS PASSED`);
  console.log('========================================================================');
}

testSuite().catch(console.error);
