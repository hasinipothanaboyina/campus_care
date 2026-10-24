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

async function testAuth() {
  console.log('--- TEST 1: Student Login with Valid Password ---');
  const client1 = createClient(supabaseUrl, supabaseKey);
  const { data: sData, error: sErr } = await client1.auth.signInWithPassword({
    email: '24481a54e9@campuscare.edu',
    password: 'Password123!'
  });
  if (sErr || !sData.session) {
    console.error('FAIL: Valid student login failed:', sErr?.message);
  } else {
    console.log('PASS: Student successfully authenticated! UID:', sData.user.id);
    console.log('JWT Token Present:', !!sData.session.access_token);
  }

  console.log('\n--- TEST 2: Student Login with Invalid Password ---');
  const client2 = createClient(supabaseUrl, supabaseKey);
  const { data: failData, error: failErr } = await client2.auth.signInWithPassword({
    email: '24481a54e9@campuscare.edu',
    password: 'WrongPassword999!'
  });
  if (failErr && !failData.session) {
    console.log('PASS: Invalid password correctly rejected with error:', failErr.message);
  } else {
    console.error('FAIL: Invalid password was accepted or not rejected properly!');
  }

  console.log('\n--- TEST 3: Admin Login with Valid Password ---');
  const client3 = createClient(supabaseUrl, supabaseKey);
  const { data: aData, error: aErr } = await client3.auth.signInWithPassword({
    email: 'admin@srgec.edu',
    password: 'srgec@123'
  });
  if (aErr || !aData.session) {
    console.error('FAIL: Valid admin login failed:', aErr?.message);
  } else {
    console.log('PASS: Admin successfully authenticated! UID:', aData.user.id);
  }

  console.log('\n--- TEST 4: Admin Login with Invalid Password ---');
  const client4 = createClient(supabaseUrl, supabaseKey);
  const { data: aFailData, error: aFailErr } = await client4.auth.signInWithPassword({
    email: 'admin@srgec.edu',
    password: 'WrongPassword999!'
  });
  if (aFailErr && !aFailData.session) {
    console.log('PASS: Invalid admin password correctly rejected with error:', aFailErr.message);
  } else {
    console.error('FAIL: Invalid admin password was accepted or not rejected properly!');
  }
}

testAuth().catch(console.error);
