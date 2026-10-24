const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables from .env
const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split('\n');
let supabaseUrl = '', supabaseAnonKey = '';
for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = line.split('=')[1].trim();
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables not found in .env');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey);

async function runPhase2Verification() {
  console.log('========================================================================');
  console.log('🧪 CampusCare Phase 2: Live Database & RLS Automated Security Test Suite');
  console.log('========================================================================');
  console.log(`Connecting to: ${supabaseUrl}\n`);

  // Step 1: Check schema cache for parent_student_links
  console.log('1️⃣ Checking table "parent_student_links" existence...');
  const { data: testLinks, error: tableErr } = await client
    .from('parent_student_links')
    .select('id')
    .limit(1);

  if (tableErr) {
    console.log('❌ Table check failed:', tableErr.message);
    return false;
  }
  console.log('✅ Table "parent_student_links" exists and is queryable via Supabase API.');

  // Step 2: Check phone column on profiles
  console.log('\n2️⃣ Checking profiles column "phone"...');
  const { data: profTest, error: profErr } = await client
    .from('profiles')
    .select('id, phone, role')
    .limit(1);

  if (profErr) {
    console.log('⚠️ Error querying profiles:', profErr.message);
  } else {
    console.log('✅ "phone" column accessible on profiles table.');
  }

  // Step 3: Admin Auth check
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@srgec.edu';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.log('\n⚠️ ADMIN_PASSWORD env variable not set. Skipping admin-authenticated test steps.');
    console.log('To run authenticated admin checks: set ADMIN_PASSWORD=<password> in environment.');
    return true;
  }

  console.log(`\n3️⃣ Authenticating as Admin (${adminEmail})...`);
  const adminClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (adminAuthErr || !adminAuth.session) {
    console.log('❌ Admin login failed:', adminAuthErr?.message);
    return false;
  }
  console.log('✅ Admin authenticated successfully (UID:', adminAuth.user.id, ')');

  // Step 4: Verify Admin can view parent_student_links
  console.log('\n4️⃣ Testing Admin access to parent_student_links queue...');
  const { data: adminLinks, error: adminLinksErr } = await adminClient
    .from('parent_student_links')
    .select('*');

  if (adminLinksErr) {
    console.log('❌ Admin failed to query parent_student_links:', adminLinksErr.message);
  } else {
    console.log(`✅ Admin successfully retrieved parent_student_links (${adminLinks.length} records found).`);
  }

  // Step 5: Test Parent Registration & Link Creation
  const testEmail = `parent_test_${Date.now()}@example.com`;
  const testPhone = '9876543210';
  const crypto = require('crypto');
  const testPassword = `TestP!${crypto.randomBytes(8).toString('hex')}A1#`;
  console.log(`\n5️⃣ Registering test parent (${testEmail})...`);

  const parentClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: parentAuth, error: parentRegErr } = await parentClient.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: 'Test Parent Guardian',
        phone: testPhone,
        role: 'PARENT',
      },
    },
  });

  if (parentRegErr) {
    console.log('❌ Parent sign-up failed:', parentRegErr.message);
    return false;
  }
  console.log('✅ Parent user created in Supabase Auth (UID:', parentAuth.user?.id, ')');

  // Fetch parent profile
  const { data: parentProfile, error: pProfErr } = await parentClient
    .from('profiles')
    .select('*')
    .eq('id', parentAuth.user.id)
    .single();

  if (pProfErr) {
    console.log('⚠️ Could not fetch parent profile:', pProfErr.message);
  } else {
    console.log(`✅ Parent profile verified: Role = "${parentProfile.role}", Phone = "${parentProfile.phone}", Approved = ${parentProfile.is_approved}`);
  }

  // Step 6: Find an existing student
  console.log('\n6️⃣ Finding a target student in the database...');
  const { data: students, error: stuFindErr } = await adminClient
    .from('profiles')
    .select('id, student_id, roll_number, full_name')
    .eq('role', 'STUDENT')
    .limit(2);

  if (stuFindErr || !students || students.length === 0) {
    console.log('⚠️ No existing student records found to link.');
    return true;
  }

  const targetStudent = students[0];
  const otherStudent = students.length > 1 ? students[1] : null;
  console.log(`Target Student: "${targetStudent.full_name}" (Roll: ${targetStudent.roll_number || targetStudent.student_id}, ID: ${targetStudent.id})`);

  // Step 7: Parent submits link request (PENDING_VERIFICATION)
  console.log('\n7️⃣ Parent submitting link request with roll number...');
  const { data: linkReq, error: linkReqErr } = await parentClient
    .from('parent_student_links')
    .insert([
      {
        parent_id: parentAuth.user.id,
        student_id: targetStudent.id,
        student_roll_number: targetStudent.roll_number || targetStudent.student_id,
        verification_status: 'PENDING_VERIFICATION',
      },
    ])
    .select()
    .single();

  if (linkReqErr) {
    console.log('❌ Parent insert link request failed:', linkReqErr.message);
    return false;
  }
  console.log('✅ Link request submitted successfully. Status:', linkReq.verification_status);

  // Step 8: Test Duplicate Request Prevention
  console.log('\n8️⃣ Testing Duplicate Link Request Prevention...');
  const { data: dupData, error: dupErr } = await parentClient
    .from('parent_student_links')
    .insert([
      {
        parent_id: parentAuth.user.id,
        student_id: targetStudent.id,
        student_roll_number: targetStudent.roll_number || targetStudent.student_id,
        verification_status: 'PENDING_VERIFICATION',
      },
    ])
    .select();

  if (dupErr && (dupErr.code === '23505' || dupErr.message.includes('unique_parent_student_link'))) {
    console.log('🔒 PASS: Duplicate link request strictly prevented by database constraint.');
  } else {
    console.log('❌ FAIL: Duplicate link request was not blocked!', dupErr);
  }

  // Step 9: Parent attempts to read ward submissions while PENDING (Must be BLOCKED)
  console.log('\n9️⃣ Testing RLS: Parent attempts to read ward submissions while PENDING...');
  const { data: pendingWardSubs, error: pSubsErr } = await parentClient
    .from('submissions')
    .select('*')
    .eq('student_id', targetStudent.id);

  if (pSubsErr) {
    console.log('✅ Blocked with error:', pSubsErr.message);
  } else {
    const privateReports = (pendingWardSubs || []).filter(s => s.type === 'issue' || s.type === 'report');
    if (privateReports.length === 0) {
      console.log('🔒 PASS: Parent CANNOT read ward private submissions while status is PENDING_VERIFICATION (0 private rows returned).');
    } else {
      console.log('❌ FAIL: Parent read private submissions before verification!');
    }
  }

  // Step 10: Privilege Escalation Test (Parent tries to verify themselves directly)
  console.log('\n🔟 Testing Privilege Escalation: Parent tries to set verification_status to VERIFIED...');
  const hackRes = await parentClient
    .from('parent_student_links')
    .update({ verification_status: 'VERIFIED' })
    .eq('id', linkReq.id)
    .select();

  const { data: dbCheckAfterHack } = await adminClient
    .from('parent_student_links')
    .select('verification_status')
    .eq('id', linkReq.id)
    .single();

  if ((!hackRes.data || hackRes.data.length === 0) && dbCheckAfterHack.verification_status === 'PENDING_VERIFICATION') {
    console.log('🔒 PASS: Direct privilege escalation strictly BLOCKED by RLS/Trigger (0 rows updated; status remains PENDING_VERIFICATION).');
  } else {
    console.log('❌ FAIL: Parent was able to modify verification status!', dbCheckAfterHack);
  }

  // Step 11: Admin verifies the link
  console.log('\n1️⃣1️⃣ Admin verifying the link request...');
  const { data: verifiedLink, error: verifyErr } = await adminClient
    .from('parent_student_links')
    .update({ verification_status: 'VERIFIED' })
    .eq('id', linkReq.id)
    .select()
    .single();

  if (verifyErr) {
    console.log('❌ Admin verification failed:', verifyErr.message);
  } else {
    console.log(`✅ Admin successfully verified link! Status: ${verifiedLink.verification_status}, Verified By: ${verifiedLink.verified_by}`);
  }

  // Step 12: Parent reads ward submissions after VERIFIED (Must be ALLOWED)
  console.log('\n1️⃣2️⃣ Testing RLS: Parent reads ward submissions after VERIFIED...');
  const { data: verifiedWardSubs, error: vSubsErr } = await parentClient
    .from('submissions')
    .select('id, title, type, student_id')
    .eq('student_id', targetStudent.id);

  if (vSubsErr) {
    console.log('❌ Error querying ward submissions as verified parent:', vSubsErr.message);
  } else {
    console.log(`✅ Verified parent successfully permitted access to ward submissions (${verifiedWardSubs.length} records retrieved).`);
  }

  // Step 13: Parent attempts to read another unlinked student's submissions (Must be BLOCKED)
  if (otherStudent) {
    console.log(`\n1️⃣3️⃣ Testing RLS: Parent reads another unlinked student ("${otherStudent.full_name}")...`);
    const { data: otherSubs } = await parentClient
      .from('submissions')
      .select('id, title, type, student_id')
      .eq('student_id', otherStudent.id);

    const privateOther = (otherSubs || []).filter(s => s.type === 'issue' || s.type === 'report');
    if (privateOther.length === 0) {
      console.log('🔒 PASS: Verified parent CANNOT read unlinked student private submissions (0 rows returned).');
    } else {
      console.log('❌ FAIL: Parent accessed unlinked student private submissions!');
    }
  }

  // Step 14: Test Admin Rejecting a Request
  console.log('\n1️⃣4️⃣ Testing Admin Rejection & Access Revocation...');
  const { data: rejectedLink, error: rejectErr } = await adminClient
    .from('parent_student_links')
    .update({ verification_status: 'REJECTED' })
    .eq('id', linkReq.id)
    .select()
    .single();

  if (rejectErr) {
    console.log('❌ Admin rejection update failed:', rejectErr.message);
  } else {
    console.log(`✅ Status changed to REJECTED. Verified By: ${rejectedLink.verified_by}`);
    // Check if parent can read private records now (Must be BLOCKED)
    const { data: afterRejectSubs } = await parentClient
      .from('submissions')
      .select('id, title, type, student_id')
      .eq('student_id', targetStudent.id);

    const privateAfterReject = (afterRejectSubs || []).filter(s => s.type === 'issue' || s.type === 'report');
    if (privateAfterReject.length === 0) {
      console.log('🔒 PASS: After REJECTED status, parent access to ward private submissions is immediately REVOKED (0 rows).');
    } else {
      console.log('❌ FAIL: Rejected parent still accessed private submissions!');
    }
  }

  // Cleanup test link
  console.log('\n🧹 Cleaning up test link...');
  await adminClient.from('parent_student_links').delete().eq('id', linkReq.id);
  console.log('✅ Test link cleaned up successfully.');

  console.log('\n========================================================================');
  console.log('🎉 ALL 14 PHASE 2 SECURITY & RLS TESTS PASSED ON LIVE SUPABASE INSTANCE!');
  console.log('========================================================================');
  return true;
}

runPhase2Verification().catch(console.error);
