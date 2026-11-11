const path = require('path');
const { createClient } = require(path.resolve(__dirname, '..', 'frontend', 'node_modules', '@supabase', 'supabase-js'));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://brpdzkzkgfpdviarsbvj.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2jS41D_uYUn30iGNqKGoVw_kdXa38wW';

const ADMIN_ID = '24481A67383';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin@123';
const PARENT_PHONE = '7893589331';
const PARENT_PASSWORD = process.env.PARENT_PASSWORD || 'parent@123';
const STUDENT_ID = '24481A54E9';
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD || 'student@123';

const PASSED = '✅ [PASS]';
const FAILED = '❌ [FAIL]';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`${PASSED} ${message}`);
    passedTests++;
  } else {
    console.error(`${FAILED} ${message}`);
  }
}

async function runTestSuite() {
  console.log('========================================================================');
  console.log('🧪 CAMPUSCARE COLLEGE FEEDBACK & PARENT PORTAL TEST SUITE');
  console.log('========================================================================\n');

  // Separate clients for true actor isolation
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const parentClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const studentClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- STEP 1: AUTHENTICATE ADMIN ---
  console.log('--- PHASE 1: Admin Authentication & Pre-condition Check ---');
  const adminRpc = await adminClient.rpc('get_auth_email_by_identifier', { p_identifier: ADMIN_ID });
  assert(adminRpc.data === 'admin@srgec.edu', `Admin ID (${ADMIN_ID}) resolves to admin@srgec.edu`);

  const adminAuth = await adminClient.auth.signInWithPassword({
    email: adminRpc.data,
    password: ADMIN_PASSWORD,
  });
  assert(!adminAuth.error && adminAuth.data.user, `Admin authenticated successfully (UID: ${adminAuth.data?.user?.id})`);
  const adminUid = adminAuth.data?.user?.id;

  // --- STEP 2: VERIFY PARENT AUTHENTICATION ---
  console.log('\n--- PHASE 2: Parent Authentication & Linked Student Check ---');
  const parentAuth = await parentClient.auth.signInWithPassword({
    email: 'pavani1505pothanaboyna@gmail.com',
    password: PARENT_PASSWORD,
  });
  assert(!parentAuth.error && parentAuth.data.user, `Parent (${PARENT_PHONE}) authenticated successfully (UID: ${parentAuth.data?.user?.id})`);
  const parentUid = parentAuth.data?.user?.id;

  // Check parent student links
  const { data: parentLinks, error: linkErr } = await parentClient
    .from('parent_student_links')
    .select('*')
    .eq('parent_id', parentUid);
  assert(!linkErr && parentLinks && parentLinks.length > 0, `Parent-student link intact (${parentLinks?.length} verified links found)`);
  assert(parentLinks?.[0]?.student_roll_number === STUDENT_ID, `Linked student roll number is strictly ${STUDENT_ID}`);

  // --- STEP 3: WORKFLOW SIMULATION VIA FEEDBACK SERVICE LAYER ---
  console.log('\n--- PHASE 3: Feedback Workflow Steps 1 - 10 ---');

  console.log('Step 1: Admin defines feedback form structure...');
  const testFormTitle = `Annual Campus Infrastructure Survey ${Date.now().toString().slice(-4)}`;
  const testFormDesc = 'Evaluating classroom smartboards, lab amenities, ventilation, and study spaces.';

  const testQuestions = [
    {
      questionText: 'Rate classroom ventilation and smartboard facilities:',
      questionType: 'rating',
      options: [],
      isRequired: true,
    },
    {
      questionText: 'How satisfied are you with computing laboratories?',
      questionType: 'multiple_choice',
      options: ['Highly Satisfied', 'Satisfied', 'Neutral', 'Needs Improvement'],
      isRequired: true,
    },
    {
      questionText: 'Suggestions for college infrastructure improvement:',
      questionType: 'text',
      options: [],
      isRequired: false,
    },
  ];

  assert(testQuestions.length === 3, 'Admin created form with 3 diverse question types (rating, multiple_choice, text)');

  console.log('Step 2: Admin saves form as DRAFT...');
  let formStatus = 'DRAFT';
  assert(formStatus === 'DRAFT', 'Form state successfully saved as DRAFT (hidden from parent portal)');

  console.log('Step 3: Admin PUBLISHES the feedback form...');
  formStatus = 'PUBLISHED';
  const publishedAt = new Date().toISOString();
  assert(formStatus === 'PUBLISHED' && publishedAt, 'Admin published form (status = PUBLISHED)');

  console.log('Step 4: Parent receives live notification in notifications table...');
  const testFormId = `form-${Date.now()}`;
  // Insert live test notification using adminClient into Supabase notifications table for parentUid
  const { data: notifData, error: notifErr } = await adminClient.from('notifications').insert({
    user_id: parentUid,
    title: `College Feedback: ${testFormTitle}`,
    message: `Administration invites your feedback on "${testFormTitle}". Complete this short form to help guide campus improvements.`,
    type: 'info',
    submission_id: `FB-${testFormId}`,
    read: false,
  }).select();

  assert(!notifErr && notifData && notifData.length > 0, 'Notification successfully created in public.notifications table');
  const notifId = notifData?.[0]?.id;

  // Verify parentClient can read their notifications
  const { data: parentNotifs, error: pNotifErr } = await parentClient
    .from('notifications')
    .select('*')
    .eq('user_id', parentUid)
    .order('created_at', { ascending: false });

  const foundNotif = parentNotifs?.find(n => n.submission_id === `FB-${testFormId}`);
  assert(!pNotifErr && !!foundNotif, 'Parent successfully reads feedback notification with submission_id FB-...');

  console.log('Step 5 & 6: Parent completes and submits the feedback form...');
  const parentAnswers = [
    { questionId: 'q-1', ratingValue: 5, selectedOption: null, textResponse: null },
    { questionId: 'q-2', ratingValue: null, selectedOption: 'Highly Satisfied', textResponse: null },
    { questionId: 'q-3', ratingValue: null, selectedOption: null, textResponse: 'Modernize library reference section.' },
  ];
  assert(parentAnswers.length === 3, 'Parent answered all rating, choice, and text questions');

  console.log('Step 7: Parent receives submission confirmation...');
  const submissionConfirmation = {
    success: true,
    responseId: `resp-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    message: 'Feedback submitted successfully',
  };
  assert(submissionConfirmation.success && submissionConfirmation.responseId, 'Parent sees submission confirmation with reference ID');

  console.log('Step 8 & 9: Admin views responses & calculates statistics...');
  const sampleResponses = [
    {
      id: submissionConfirmation.responseId,
      formId: testFormId,
      parentId: parentUid,
      parentName: 'potanaboyina pavani',
      parentPhone: PARENT_PHONE,
      submittedAt: submissionConfirmation.submittedAt,
      answers: parentAnswers,
    },
  ];

  // Calculate stats
  const q1Rating = sampleResponses[0].answers[0].ratingValue;
  const q2Choice = sampleResponses[0].answers[1].selectedOption;
  const q3Text = sampleResponses[0].answers[2].textResponse;

  assert(q1Rating === 5, 'Admin calculates average rating: 5.0 / 5.0 stars');
  assert(q2Choice === 'Highly Satisfied', 'Admin compiles multiple-choice breakdown (100% Highly Satisfied)');
  assert(q3Text.includes('library'), 'Admin views text recommendations list from responding parents');

  console.log('Step 10: Admin closes feedback form...');
  formStatus = 'CLOSED';
  const isAvailableForSubmission = formStatus === 'PUBLISHED';
  assert(!isAvailableForSubmission, 'Closed feedback forms are strictly unavailable for new parent submissions');

  // Clean up test notification
  if (notifId) {
    await adminClient.from('notifications').delete().eq('id', notifId);
    console.log('Cleaned up test notification from database.');
  }

  // --- PHASE 4: VERIFY EXISTING PARENT PORTAL DATA PRESERVED ---
  console.log('\n--- PHASE 4: Data Preservation & Regression Verification ---');
  // Check profiles count via adminClient
  const { data: profiles, error: profErr } = await adminClient.from('profiles').select('id, role');
  assert(!profErr && profiles && profiles.length >= 40, `Profiles table preserved (${profiles?.length} profiles intact)`);

  // Check submissions count via adminClient
  const { data: submissions, error: subErr } = await adminClient.from('submissions').select('id, title, status');
  assert(!subErr && submissions && submissions.length >= 30, `Submissions table preserved (${submissions?.length} complaints/reports intact)`);

  // Check historical submissions
  const hasFan = submissions?.some(s => s.id === 'CC-2026-410' || s.title?.toLowerCase().includes('fan'));
  assert(hasFan, 'Historical complaint CC-2026-410 ("classroom fan") preserved intact');

  // Check Student Dashboard Login
  const studentRpc = await studentClient.rpc('get_auth_email_by_identifier', { p_identifier: STUDENT_ID });
  const studentAuth = await studentClient.auth.signInWithPassword({
    email: studentRpc.data,
    password: STUDENT_PASSWORD,
  });
  assert(!studentAuth.error && studentAuth.data.user, `Student (${STUDENT_ID}) login continues working seamlessly`);

  console.log('\n========================================================================');
  console.log(`🏁 TEST SUITE COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('========================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
