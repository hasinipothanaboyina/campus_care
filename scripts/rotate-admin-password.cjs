const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Load Supabase URL and Anon Key from .env
let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = line.split('=')[1].trim();
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[ERROR] Supabase configuration (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) not found in .env');
  process.exit(1);
}

const adminEmail = process.env.ADMIN_EMAIL || 'admin@srgec.edu';
const currentPassword = process.env.CURRENT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
const newPassword = process.env.NEW_ADMIN_PASSWORD;

async function rotatePassword() {
  console.log('================================================================');
  console.log('🔐 CampusCare: Authorized Admin Password Rotation Utility');
  console.log('================================================================');
  console.log(`Target Administrative Account: ${adminEmail}`);

  // Guard: Check if new password is provided
  if (!newPassword) {
    console.log('\n[STATUS] NEW_ADMIN_PASSWORD environment variable is NOT set.');
    console.log('To securely rotate the admin password using this authorized process:');
    console.log('\n  In PowerShell:');
    console.log('    $env:CURRENT_ADMIN_PASSWORD="<current_password>"');
    console.log('    $env:NEW_ADMIN_PASSWORD="<your_new_secure_password>"');
    console.log('    node scripts/rotate-admin-password.cjs');
    console.log('    Remove-Item env:CURRENT_ADMIN_PASSWORD, env:NEW_ADMIN_PASSWORD\n');
    console.log('No modifications were made to the database or admin account.');
    return { success: false, reason: 'NEW_ADMIN_PASSWORD_NOT_SET' };
  }

  // Guard: Validate password strength
  if (newPassword.length < 8) {
    console.error('\n[ERROR] New password must be at least 8 characters long.');
    return { success: false, reason: 'WEAK_PASSWORD' };
  }

  if (!currentPassword) {
    console.error('\n[ERROR] CURRENT_ADMIN_PASSWORD (or ADMIN_PASSWORD) environment variable is required to authenticate rotation.');
    return { success: false, reason: 'CURRENT_PASSWORD_NOT_SET' };
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // Step 1: Authenticate with existing credentials
  console.log('\n1️⃣ Authenticating with current admin credentials...');
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: adminEmail,
    password: currentPassword
  });

  if (authError || !authData.user) {
    console.error(`[ERROR] Authentication failed: ${authError?.message || 'Invalid credentials'}`);
    return { success: false, reason: 'AUTH_FAILED' };
  }

  console.log(`[PASS] Authenticated successfully as UID: ${authData.user.id}`);

  // Step 2: Rotate password via Supabase Auth updateUser API
  console.log('\n2️⃣ Updating password via Supabase Auth API...');
  const { data: updateData, error: updateError } = await client.auth.updateUser({
    password: newPassword
  });

  if (updateError) {
    console.error(`[ERROR] Failed to update password: ${updateError.message}`);
    return { success: false, reason: 'UPDATE_FAILED' };
  }

  console.log('[PASS] Password updated successfully in auth.users.');

  // Step 3: Sign out old session
  await client.auth.signOut();

  // Step 4: Verify authentication with NEW password
  console.log('\n3️⃣ Verifying login with the new password...');
  const verifyClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: verifyData, error: verifyError } = await verifyClient.auth.signInWithPassword({
    email: adminEmail,
    password: newPassword
  });

  if (verifyError || !verifyData.user) {
    console.error(`[ERROR] Verification login failed: ${verifyError?.message}`);
    return { success: false, reason: 'VERIFICATION_FAILED' };
  }

  console.log(`[PASS] Successfully logged in with new password (UID: ${verifyData.user.id})`);

  // Step 5: Verify ADMIN role and permissions are intact
  console.log('\n4️⃣ Verifying administrative role and profile permissions...');
  const { data: profile, error: profError } = await verifyClient
    .from('profiles')
    .select('id, full_name, email, role, is_approved, approval_status')
    .eq('id', verifyData.user.id)
    .single();

  if (profError || !profile) {
    console.error(`[ERROR] Failed to retrieve admin profile: ${profError?.message}`);
    return { success: false, reason: 'PROFILE_CHECK_FAILED' };
  }

  if (profile.role !== 'ADMIN' || !profile.is_approved || profile.approval_status !== 'APPROVED') {
    console.error(`[ERROR] Account permissions check failed. Profile:`, profile);
    return { success: false, reason: 'PERMISSIONS_INVALID' };
  }

  console.log(`[PASS] Admin profile verified: Role = "${profile.role}", is_approved = ${profile.is_approved}, approval_status = "${profile.approval_status}".`);

  await verifyClient.auth.signOut();

  console.log('\n================================================================');
  console.log('✅ SUCCESS: Admin password rotated and verified successfully.');
  console.log('================================================================');
  return { success: true };
}

rotatePassword()
  .then(res => {
    if (!res.success && res.reason !== 'NEW_ADMIN_PASSWORD_NOT_SET') {
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
  });
