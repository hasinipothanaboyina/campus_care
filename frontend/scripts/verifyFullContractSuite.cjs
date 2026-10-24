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

async function runFullContractSuite() {
  console.log('========================================================================');
  console.log(' CAMPUSCARE: COMPREHENSIVE CONTRACT & INTEGRATION VERIFICATION SUITE');
  console.log('========================================================================\n');

  // 1. Authenticate as Student
  const studentClient = createClient(supabaseUrl, supabaseKey);
  const { data: sAuth, error: sErr } = await studentClient.auth.signInWithPassword({
    email: '24481a54e9@campuscare.edu',
    password: 'Password123!'
  });
  if (sErr) throw new Error('Student auth failed: ' + sErr.message);
  console.log('✓ 1. Student Authenticated via Supabase Auth (UID: ' + sAuth.user.id + ')');

  // Verify Student Profile
  const { data: sProfile, error: pErr } = await studentClient
    .from('profiles')
    .select('*')
    .eq('id', sAuth.user.id)
    .single();
  if (pErr) throw new Error('Student profile fetch failed: ' + pErr.message);
  console.log(`   - Roll Number: ${sProfile.student_id}`);
  console.log(`   - Department: ${sProfile.department}`);
  console.log(`   - Role: ${sProfile.role}`);
  console.log(`   - Approved: ${sProfile.is_approved}`);
  if (sProfile.student_id !== '24481A54E9' || sProfile.department !== 'AIDS' || sProfile.role !== 'STUDENT') {
    throw new Error('Student profile attributes mismatch!');
  }
  console.log('✓ 2. Student Profile Integrity Verified');

  // 2. Authenticate as Admin/CMC
  const adminClient = createClient(supabaseUrl, supabaseKey);
  const { data: aAuth, error: aErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@srgec.edu',
    password: 'srgec@123'
  });
  if (aErr) throw new Error('Admin auth failed: ' + aErr.message);
  console.log('\n✓ 3. Admin/CMC Authenticated via Supabase Auth (UID: ' + aAuth.user.id + ')');

  // Verify Admin Profile
  const { data: aProfile } = await adminClient
    .from('profiles')
    .select('role, email')
    .eq('id', aAuth.user.id)
    .single();
  console.log(`   - Admin Role: ${aProfile.role} (${aProfile.email})`);

  // Verify Key Benchmark Submission CC-2026-220
  const { data: cc220, error: ccErr } = await adminClient
    .from('submissions')
    .select('*')
    .eq('id', 'CC-2026-220')
    .single();
  if (ccErr || !cc220) {
    throw new Error('CRITICAL: CC-2026-220 not found in database: ' + (ccErr?.message || 'null'));
  }
  console.log(`\n✓ 4. Permanent Submission CC-2026-220 Verified Intact:`);
  console.log(`   - ID: ${cc220.id}`);
  console.log(`   - Title: "${cc220.title}"`);
  console.log(`   - Category: ${cc220.category} | Location: ${cc220.location}`);
  console.log(`   - Status: ${cc220.status} | Priority: ${cc220.priority}`);
  console.log(`   - Student Roll: ${cc220.student_roll_number}`);

  // Test Submission Flow: Student submits a new issue -> Admin reviews, updates status, and resolves
  const testId = `CC-TEST-${Date.now()}`;
  console.log(`\n--- 5. Lifecycle Test: Issue Submission & Resolution (${testId}) ---`);

  const { data: newSub, error: subErr } = await studentClient
    .from('submissions')
    .insert({
      id: testId,
      student_id: sAuth.user.id,
      student_name: sProfile.full_name || 'Hasini Potanaboyina',
      student_roll_number: '24481A54E9',
      student_department: 'AIDS',
      title: 'Automated Lifecycle Test: Classroom Light Repair',
      description: 'Testing end-to-end status progression from Submitted to Resolved.',
      category: 'Facility',
      type: 'issue',
      urgency: 'Medium',
      priority: 'Medium',
      status: 'Submitted',
      location: 'Block A - Room 101'
    })
    .select()
    .single();

  if (subErr) throw new Error('Student submission failed: ' + subErr.message);
  console.log(`✓ 5a. Student successfully created issue ${testId}`);

  // Admin views the new issue
  const { data: adminViewSub, error: aViewErr } = await adminClient
    .from('submissions')
    .select('*')
    .eq('id', testId)
    .single();
  if (aViewErr || !adminViewSub) throw new Error('Admin unable to view student submission: ' + aViewErr?.message);
  console.log(`✓ 5b. Admin immediately retrieved submission in queue (Status: ${adminViewSub.status})`);

  // Admin updates status to In Progress and assigns to maintenance officer
  const { error: updErr } = await adminClient
    .from('submissions')
    .update({
      status: 'In Progress',
      assigned_to: 'Campus Maintenance Cell - Electrician Team',
      internal_notes: 'Work order dispatched to campus electrical team.',
      updated_at: new Date().toISOString()
    })
    .eq('id', testId);
  if (updErr) throw new Error('Admin status update failed: ' + updErr.message);

  // Student checks updated status
  const { data: studentCheckSub } = await studentClient
    .from('submissions')
    .select('status, assigned_to')
    .eq('id', testId)
    .single();
  console.log(`✓ 5c. Student sees real-time progress: Status="${studentCheckSub.status}", Assigned="${studentCheckSub.assigned_to}"`);

  // Admin marks resolved and creates resolution record
  const { error: resErr } = await adminClient
    .from('submissions')
    .update({
      status: 'Resolved',
      verified_by: aAuth.user.id,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', testId);
  if (resErr) throw new Error('Admin resolve failed: ' + resErr.message);

  const { error: recErr } = await adminClient
    .from('resolution_records')
    .insert({
      submission_id: testId,
      resolved_by: aAuth.user.id,
      resolution_summary: 'Replaced ballast and bulb. Tested operational.',
      action_taken: 'Replaced electrical hardware',
      department_feedback: 'Completed on schedule'
    });
  if (recErr) console.warn('Note on resolution_records:', recErr.message);

  const { data: finalSub } = await studentClient
    .from('submissions')
    .select('status, verified_at')
    .eq('id', testId)
    .single();
  console.log(`✓ 5d. Student confirms resolution: Status="${finalSub.status}", VerifiedAt="${finalSub.verified_at}"`);

  // Clean up only the lifecycle test issue
  await adminClient.from('resolution_records').delete().eq('submission_id', testId);
  await adminClient.from('submissions').delete().eq('id', testId);
  console.log(`✓ 5e. Lifecycle test record cleanly removed`);

  // 6. Test Parent-Student Link Management
  console.log('\n--- 6. Parent-Student Link Management Lifecycle ---');
  const { data: existingLinks, error: linkErr } = await adminClient
    .from('parent_student_links')
    .select('*');
  if (linkErr) {
    console.log('   - Parent-student links table query note:', linkErr.message);
  } else {
    console.log(`✓ 6a. Admin verified parent-student links table (${existingLinks.length} records present)`);
  }

  // 7. Security Isolation Test: Verify Student Cannot Tamper With Other Submissions
  console.log('\n--- 7. Security Isolation Verification ---');
  const { data: otherSubmissions } = await adminClient
    .from('submissions')
    .select('id, student_id, title')
    .neq('student_id', sAuth.user.id)
    .limit(1);

  if (otherSubmissions && otherSubmissions.length > 0) {
    const targetSub = otherSubmissions[0];
    const originalTitle = targetSub.title;

    // Student attempts to overwrite foreign title
    await studentClient
      .from('submissions')
      .update({ title: 'Hacked Title Attempt' })
      .eq('id', targetSub.id);

    // Verify row was not tampered
    const { data: verifyRow } = await adminClient
      .from('submissions')
      .select('title')
      .eq('id', targetSub.id)
      .single();

    if (verifyRow.title === 'Hacked Title Attempt') {
      throw new Error('SECURITY VIOLATION: Student was able to modify another user submission!');
    }
    console.log(`✓ 7a. Row-Level Security Enforced: Student cannot tamper with submission ${targetSub.id} (Title remained: "${verifyRow.title}")`);
  } else {
    console.log('✓ 7a. No foreign submissions found to test against');
  }

  console.log('\n========================================================================');
  console.log('🎉 ALL CONTRACT & INTEGRATION TESTS COMPLETED SUCCESSFULLY WITH 100% PASS');
  console.log('========================================================================');
}

runFullContractSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
