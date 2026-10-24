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

const EXPECTED_LOCATIONS = [
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

const FORBIDDEN_OLD_OPTIONS = [
  'Block B (Engineering)',
  'Central Library',
  'Science & Humanities Block',
  'Main Admin Building',
  'Main Auditorium',
  'Student Amenities Center',
  'Sports Complex & Gymnasium',
  'West Campus Walkway',
];

async function testLocations() {
  console.log('========================================================================');
  console.log(' CAMPUSCARE: LOCATION DROPDOWN & END-TO-END PIPELINE VERIFICATION');
  console.log('========================================================================\n');

  // Test 1: Verify source constants
  console.log('--- TEST 1: Verify Shared Locations Source File ---');
  const locFilePath = path.resolve(__dirname, '..', 'src', 'constants', 'locations.ts');
  const locFileContent = fs.readFileSync(locFilePath, 'utf8');

  EXPECTED_LOCATIONS.forEach((loc, idx) => {
    if (!locFileContent.includes(`'${loc}'`)) {
      throw new Error(`Location missing in constants: ${loc}`);
    }
    console.log(`✓ [${idx + 1}/12] Found location: ${loc}`);
  });
  console.log('✓ All 12 campus locations verified in shared constant.');

  // Test 2: Verify ReportIssueStepForm does not contain any forbidden old options
  console.log('\n--- TEST 2: Verify Removal of Old Placeholder Options ---');
  const formPath = path.resolve(__dirname, '..', 'src', 'pages', 'ReportIssueStepForm.tsx');
  const formContent = fs.readFileSync(formPath, 'utf8');

  FORBIDDEN_OLD_OPTIONS.forEach(oldOpt => {
    if (formContent.includes(oldOpt)) {
      throw new Error(`Found old placeholder option in form: ${oldOpt}`);
    }
  });
  console.log('✓ Verified: Old irrelevant/placeholder options are completely removed from form.');

  // Test 3: Authenticate as Student & Submit Issue with "M Block" + "Room 304"
  console.log('\n--- TEST 3: Submit Issue with "M Block" & "Room 304" via Supabase ---');
  const student = createClient(supabaseUrl, supabaseKey);
  const { data: sAuth, error: sErr } = await student.auth.signInWithPassword({
    email: '24481a54e9@campuscare.edu',
    password: 'Password123!'
  });
  if (sErr) throw new Error('Student auth failed: ' + sErr.message);

  const testId1 = `CC-TEST-LOC-${Date.now()}`;
  const building1 = 'M Block';
  const room1 = 'Room 304';
  const locationStr1 = `${building1} - ${room1}`;

  const { data: ins1, error: insErr1 } = await student
    .from('submissions')
    .insert({
      id: testId1,
      student_id: sAuth.user.id,
      student_name: 'Hasini Potanaboyina',
      student_roll_number: '24481A54E9',
      student_department: 'AIDS',
      title: 'Automated Test: M Block Projector Calibration',
      description: 'Testing new location persistence and display in M Block.',
      category: 'Equipment',
      type: 'issue',
      building: building1,
      room: room1,
      location: locationStr1,
      urgency: 'Medium',
      priority: 'Medium',
      status: 'Submitted'
    })
    .select()
    .single();

  if (insErr1) throw new Error('Failed to insert test issue 1: ' + insErr1.message);
  console.log(`✓ Issue 1 created with ID: ${testId1}`);
  console.log(`   - Building: "${ins1.building}"`);
  console.log(`   - Location: "${ins1.location}"`);

  // Test 4: Submit Issue with "Football Court" (no room number)
  console.log('\n--- TEST 4: Submit Issue with "Football Court" (no room) ---');
  const testId2 = `CC-TEST-LOC-${Date.now() + 1}`;
  const building2 = 'Football Court';
  const locationStr2 = building2;

  const { data: ins2, error: insErr2 } = await student
    .from('submissions')
    .insert({
      id: testId2,
      student_id: sAuth.user.id,
      student_name: 'Hasini Potanaboyina',
      student_roll_number: '24481A54E9',
      student_department: 'AIDS',
      title: 'Automated Test: Football Court Floodlight Fuse',
      description: 'Floodlight tower 2 fuse blown during evening match.',
      category: 'Electrical',
      type: 'issue',
      building: building2,
      room: '',
      location: locationStr2,
      urgency: 'Low',
      priority: 'Low',
      status: 'Submitted'
    })
    .select()
    .single();

  if (insErr2) throw new Error('Failed to insert test issue 2: ' + insErr2.message);
  console.log(`✓ Issue 2 created with ID: ${testId2}`);
  console.log(`   - Building: "${ins2.building}"`);
  console.log(`   - Location: "${ins2.location}"`);

  // Test 5: Authenticate as Admin and Verify Retrieval in Admin Workflow
  console.log('\n--- TEST 5: Verify Admin / CMC Portal Retrieval & Consistency ---');
  const admin = createClient(supabaseUrl, supabaseKey);
  const { data: aAuth, error: aErr } = await admin.auth.signInWithPassword({
    email: 'admin@srgec.edu',
    password: 'srgec@123'
  });
  if (aErr) throw new Error('Admin auth failed: ' + aErr.message);

  const { data: aView1 } = await admin.from('submissions').select('*').eq('id', testId1).single();
  const { data: aView2 } = await admin.from('submissions').select('*').eq('id', testId2).single();

  if (!aView1 || aView1.building !== 'M Block' || aView1.location !== 'M Block - Room 304') {
    throw new Error('Admin view failed to retrieve M Block issue with exact location');
  }
  if (!aView2 || aView2.building !== 'Football Court' || aView2.location !== 'Football Court') {
    throw new Error('Admin view failed to retrieve Football Court issue with exact location');
  }
  console.log(`✓ Admin retrieved Issue 1: Building="${aView1.building}", Location="${aView1.location}"`);
  console.log(`✓ Admin retrieved Issue 2: Building="${aView2.building}", Location="${aView2.location}"`);

  // Test 6: Clean up test records
  console.log('\n--- TEST 6: Cleaning Up Test Records ---');
  await admin.from('submissions').delete().eq('id', testId1);
  await admin.from('submissions').delete().eq('id', testId2);
  console.log(`✓ Cleaned up temporary test records ${testId1} and ${testId2}`);

  console.log('\n========================================================================');
  console.log('🎉 ALL 12 LOCATION TESTS & PIPELINE CHECKS PASSED WITH 100% SUCCESS');
  console.log('========================================================================');
}

testLocations().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
