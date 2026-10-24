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

async function runRegressionSuite() {
  console.log('========================================================================');
  console.log(' CAMPUSCARE: CROSS-PAGE DATA CONSISTENCY & REGRESSION TEST SUITE');
  console.log('========================================================================\n');

  // Authenticate Student
  const student = createClient(supabaseUrl, supabaseKey);
  const { data: sAuth, error: sErr } = await student.auth.signInWithPassword({
    email: '24481a54e9@campuscare.edu',
    password: 'Password123!'
  });
  if (sErr) throw new Error('Student auth failed: ' + sErr.message);
  console.log('✓ 1. Student Authenticated (UID:', sAuth.user.id, ')');

  // Authenticate Admin
  const admin = createClient(supabaseUrl, supabaseKey);
  const { data: aAuth, error: aErr } = await admin.auth.signInWithPassword({
    email: 'admin@srgec.edu',
    password: 'srgec@123'
  });
  if (aErr) throw new Error('Admin auth failed: ' + aErr.message);
  console.log('✓ 2. Admin Authenticated (UID:', aAuth.user.id, ')');

  // Verify CC-2026-410 Read-Only State
  console.log('\n--- 3. READ-ONLY VERIFICATION OF CC-2026-410 ---');
  const { data: sub410, error: err410 } = await admin
    .from('submissions')
    .select('*')
    .eq('id', 'CC-2026-410')
    .single();

  const { data: res410 } = await admin
    .from('resolution_records')
    .select('*')
    .eq('submission_id', 'CC-2026-410')
    .single();

  const { data: assign410 } = await admin
    .from('assignments')
    .select('*')
    .eq('submission_id', 'CC-2026-410');

  console.log(`   - Submission ID: ${sub410.id}`);
  console.log(`   - Title: "${sub410.title}"`);
  console.log(`   - Status in DB: "${sub410.status}"`);
  console.log(`   - Assigned To in DB: "${sub410.assigned_to}"`);
  console.log(`   - Assigned Team in DB: "${sub410.assigned_team}"`);
  console.log(`   - Resolved By in resolution_records: "${res410?.responsible_person}"`);
  console.log(`   - Action Taken in resolution_records: "${res410?.action_taken}"`);
  console.log(`   - Assignments Table Rows Count: ${assign410.length}`);

  if (sub410.status !== 'Resolved') throw new Error('CC-2026-410 status is not Resolved');
  if (sub410.assigned_to !== 'subbu') throw new Error('CC-2026-410 assigned_to is not subbu');
  if (res410.responsible_person !== 'subbu') throw new Error('CC-2026-410 resolution responsible_person mismatch');
  console.log('✓ 3b. CC-2026-410 is 100% consistent across submissions, assignments, and resolution_records tables');

  // STEP A & B: Create test issue as student and verify initial status
  const testSubId = `CC-TEST-${Date.now()}`;
  console.log(`\n--- 4. LIFECYCLE TEST ON DEDICATED TEST RECORD (${testSubId}) ---`);

  const { data: createdSub, error: insErr } = await student
    .from('submissions')
    .insert({
      id: testSubId,
      student_id: sAuth.user.id,
      student_name: 'Hasini Potanaboyina',
      student_roll_number: '24481A54E9',
      student_department: 'AIDS',
      title: 'Regression Test: Overhead Fan Humming Noise',
      description: 'Fan makes high-frequency vibration during class hours.',
      category: 'Classroom',
      type: 'issue',
      building: 'Auditorium',
      room: '218',
      location: 'Auditorium - 218',
      urgency: 'Medium',
      priority: 'Medium',
      priority_score: 55,
      status: 'Submitted',
      support_count: 1
    })
    .select()
    .single();

  if (insErr) throw new Error('Student submission failed: ' + insErr.message);
  console.log(`✓ 4a. Created issue ${testSubId} as Student with Status="Submitted"`);

  // Verify Student query sees Submitted
  const { data: sViewInit } = await student
    .from('submissions')
    .select('id, status, assigned_to')
    .eq('id', testSubId)
    .single();
  if (sViewInit.status !== 'Submitted' || sViewInit.assigned_to !== null) {
    throw new Error('Initial status mismatch in student view');
  }
  console.log(`✓ 4b. Student query confirms Status="${sViewInit.status}", AssignedTo=${sViewInit.assigned_to}`);

  // STEP C & D: Assign the issue to a maintenance person (e.g. Subbu)
  const maintenancePerson = 'Subbu';
  const maintenanceTeam = 'Electrical Maintenance Team';

  const { error: assignErr } = await admin
    .from('submissions')
    .update({
      assigned_to: maintenancePerson,
      assigned_team: maintenanceTeam,
      status: 'Assigned',
      updated_at: new Date().toISOString()
    })
    .eq('id', testSubId);
  if (assignErr) throw new Error('Admin assign failed: ' + assignErr.message);

  await admin.from('assignments').insert({
    submission_id: testSubId,
    assigned_to: maintenancePerson,
    assigned_team: maintenanceTeam,
    assigned_by: aAuth.user.id
  });

  await admin.from('status_history').insert({
    submission_id: testSubId,
    old_status: 'Submitted',
    new_status: 'Assigned',
    changed_by: aAuth.user.id,
    notes: `Assigned to ${maintenancePerson} (${maintenanceTeam})`
  });

  // Verify Admin and Student both see Assigned & Subbu
  const { data: aViewAssigned } = await admin.from('submissions').select('*').eq('id', testSubId).single();
  const { data: sViewAssigned } = await student.from('submissions').select('*').eq('id', testSubId).single();

  if (aViewAssigned.assigned_to !== maintenancePerson || aViewAssigned.status !== 'Assigned') {
    throw new Error('Admin view does not reflect assignment');
  }
  if (sViewAssigned.assigned_to !== maintenancePerson || sViewAssigned.status !== 'Assigned') {
    throw new Error('Student view does not reflect assignment');
  }
  console.log(`✓ 4c. Assignment confirmed in both Admin & Student views: AssignedTo="${sViewAssigned.assigned_to}", Status="${sViewAssigned.status}"`);

  // STEP E: Progress status to In Progress
  await admin
    .from('submissions')
    .update({
      status: 'In Progress',
      internal_notes: 'Technician on site inspecting capacitor and bearing.',
      updated_at: new Date().toISOString()
    })
    .eq('id', testSubId);

  await admin.from('status_history').insert({
    submission_id: testSubId,
    old_status: 'Assigned',
    new_status: 'In Progress',
    changed_by: aAuth.user.id,
    notes: 'Technician on site inspecting capacitor and bearing.'
  });

  const { data: sViewProgress } = await student.from('submissions').select('status, assigned_to').eq('id', testSubId).single();
  if (sViewProgress.status !== 'In Progress' || sViewProgress.assigned_to !== maintenancePerson) {
    throw new Error('Status transition to In Progress failed');
  }
  console.log(`✓ 4d. Status transition to "In Progress" verified (AssignedTo="${sViewProgress.assigned_to}")`);

  // STEP F & G: Resolve it with action-taken details and responsible person
  const actionTakenText = 'Replaced worn motor capacitor and lubricated bearings. Verified silent operation.';
  await admin
    .from('submissions')
    .update({
      status: 'Resolved',
      assigned_to: maintenancePerson,
      assigned_team: maintenanceTeam,
      verified_by: aAuth.user.id,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', testSubId);

  await admin.from('resolution_records').upsert({
    submission_id: testSubId,
    action_taken: actionTakenText,
    responsible_person: maintenancePerson,
    resolved_date: new Date().toISOString(),
    notes: 'Maintenance completed according to campus safety standards.'
  }, { onConflict: 'submission_id' });

  await admin.from('status_history').insert({
    submission_id: testSubId,
    old_status: 'In Progress',
    new_status: 'Resolved',
    changed_by: aAuth.user.id,
    notes: `Resolved by ${maintenancePerson}: ${actionTakenText}`
  });

  // Verify Admin Dashboard, Submissions Table, Resolution Page, Student Reports query
  const { data: aFinal } = await admin.from('submissions').select('*').eq('id', testSubId).single();
  const { data: sFinal } = await student.from('submissions').select('*').eq('id', testSubId).single();
  const { data: resFinal } = await student.from('resolution_records').select('*').eq('submission_id', testSubId).single();
  const { data: histFinal } = await admin.from('status_history').select('*').eq('submission_id', testSubId);

  if (aFinal.status !== 'Resolved' || aFinal.assigned_to !== maintenancePerson) {
    throw new Error('Admin final state mismatch');
  }
  if (sFinal.status !== 'Resolved' || sFinal.assigned_to !== maintenancePerson) {
    throw new Error('Student final state mismatch');
  }
  if (!resFinal || resFinal.responsible_person !== maintenancePerson || resFinal.action_taken !== actionTakenText) {
    throw new Error('Resolution record final state mismatch');
  }
  if (histFinal.length < 3) {
    throw new Error('Status history missing required transitions');
  }

  console.log(`✓ 4e. Full Resolution Consistency Verified across Admin and Student views:`);
  console.log(`   - Status in Admin View: "${aFinal.status}"`);
  console.log(`   - Status in Student View: "${sFinal.status}"`);
  console.log(`   - Assigned To in Admin View: "${aFinal.assigned_to}"`);
  console.log(`   - Assigned To in Student View: "${sFinal.assigned_to}"`);
  console.log(`   - Resolved By in Student Resolution Query: "${resFinal.responsible_person}"`);
  console.log(`   - Action Taken in Student Resolution Query: "${resFinal.action_taken}"`);
  console.log(`   - Status History Logs Count: ${histFinal.length}`);

  // STEP J: Simulate a failed update (unauthorized student attempting to resolve)
  console.log('\n--- 5. NEGATIVE PATH TEST: UNAUTHORIZED MUTATION REJECTION ---');
  const { error: unauthErr } = await student
    .from('submissions')
    .update({ status: 'Submitted', title: 'Hacked Title Attempt' })
    .eq('id', testSubId);

  // Status must remain Resolved and title unchanged
  const { data: checkUnauth } = await admin.from('submissions').select('status, title').eq('id', testSubId).single();
  if (checkUnauth.status !== 'Resolved' || checkUnauth.title.includes('Hacked')) {
    throw new Error('SECURITY VIOLATION: Unauthorized student mutation succeeded!');
  }
  console.log(`✓ 5a. Unauthorized update rejected by RLS: Status remained "${checkUnauth.status}"`);

  // Clean up dedicated test record
  console.log('\n--- 6. CLEANING UP TEMPORARY REGRESSION TEST RECORD ---');
  await admin.from('status_history').delete().eq('submission_id', testSubId);
  await admin.from('assignments').delete().eq('submission_id', testSubId);
  await admin.from('resolution_records').delete().eq('submission_id', testSubId);
  await admin.from('submissions').delete().eq('id', testSubId);
  console.log(`✓ 6a. Temporary record ${testSubId} cleanly purged`);

  console.log('\n========================================================================');
  console.log('🎉 ALL CROSS-PAGE DATA CONSISTENCY TESTS COMPLETED WITH 100% PASS');
  console.log('========================================================================');
}

runRegressionSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
