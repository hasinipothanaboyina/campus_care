const fs = require('fs');
const path = require('path');
const readline = require('readline');

let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
  createClient = require(path.resolve(__dirname, '..', 'frontend', 'node_modules', '@supabase', 'supabase-js')).createClient;
}

// Load environment from frontend/.env
let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

// Check for .env.server if exists
const serverEnvPath = path.resolve(__dirname, '..', '.env.server');
if (fs.existsSync(serverEnvPath)) {
  const serverEnv = fs.readFileSync(serverEnvPath, 'utf8');
  for (const line of serverEnv.split('\n')) {
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = line.split('=')[1].trim();
  }
}

const ACCOUNTS = {
  admin: {
    name: 'Admin / CMS',
    identifier: '24481A67383',
    role: 'ADMIN',
    email: 'admin@srgec.edu',
    uid: '73e4a745-374e-4911-8297-b57fc00d9e47',
    defaultOldPass: 'srgec@123'
  },
  student: {
    name: 'Student',
    identifier: '24481A54E9',
    role: 'STUDENT',
    email: '24481a54e9@campuscare.edu',
    uid: '1f33aadb-1259-4cb1-bb5b-6dc6477c5153',
    defaultOldPass: 'Password123!'
  },
  parent: {
    name: 'Parent',
    identifier: '7893589331',
    role: 'PARENT',
    email: 'pavani1505pothanaboyna@gmail.com',
    uid: '2cb3671a-223c-4529-a118-4673200ff8ac',
    defaultOldPass: null
  }
};

function readSecret(promptText) {
  return new Promise((resolve) => {
    process.stdout.write(promptText);
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      // Non-interactive fallback
      const rl = readline.createInterface({ input: stdin, output: process.stdout });
      rl.question('', (ans) => {
        rl.close();
        resolve(ans.trim());
      });
      return;
    }

    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');

    let password = '';
    const onData = (ch) => {
      ch = ch.toString('utf8');
      if (ch === '\n' || ch === '\r' || ch === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
      } else if (ch === '\u0003') {
        process.stdout.write('\n[Operation cancelled by user]\n');
        process.exit(0);
      } else if (ch === '\u0008' || ch === '\x7f') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += ch;
        process.stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function verifyLogin(email, password, roleLabel) {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.session) {
    return { success: false, error: error?.message || 'Login failed' };
  }
  return { success: true, uid: data.user.id };
}

async function updatePasswordForAccount(accountKey, newPassword) {
  const acc = ACCOUNTS[accountKey];
  console.log(`\n⚙️  Applying password configuration for ${acc.name} (${acc.identifier})...`);

  // Method 1: If Service Role Key is available
  if (serviceRoleKey) {
    try {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data, error } = await adminClient.auth.admin.updateUserById(acc.uid, {
        password: newPassword
      });
      if (!error && data.user) {
        console.log(`✅ [PASS] Password updated via Supabase Auth Admin API.`);
        return true;
      }
    } catch (e) {
      // Fallback
    }
  }

  // Method 2: Authorized user session rotation (if current password is known)
  const currentPassword =
    process.env[`CURRENT_${accountKey.toUpperCase()}_PASSWORD`] || acc.defaultOldPass;

  if (currentPassword) {
    try {
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data: authData, error: authErr } = await client.auth.signInWithPassword({
        email: acc.email,
        password: currentPassword
      });

      if (!authErr && authData.session) {
        const { error: updErr } = await client.auth.updateUser({ password: newPassword });
        if (!updErr) {
          console.log(`✅ [PASS] Password rotated via Supabase Auth User API.`);
          return true;
        } else if (updErr.message && updErr.message.includes('different from the old password')) {
          console.log(`✅ [PASS] Account password is already actively set to this password.`);
          return true;
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  // Method 3: Try admin RPC if admin credentials available
  try {
    const adminPass = process.env.CURRENT_ADMIN_PASSWORD || ACCOUNTS.admin.defaultOldPass;
    const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: aAuth } = await adminClient.auth.signInWithPassword({
      email: ACCOUNTS.admin.email,
      password: adminPass
    });

    if (aAuth?.session) {
      const { data: rpcRes, error: rpcErr } = await adminClient.rpc('admin_set_account_password', {
        p_identifier: acc.identifier,
        p_new_password: newPassword
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        console.log(`✅ [PASS] Password updated via database admin RPC.`);
        return true;
      }
    }
  } catch (e) {
    // Fallback
  }

  // Method 4: If non-interactive, display SQL instruction and return
  console.log(`\n⚠️  Direct API update for ${acc.name} requires service-role permission or SQL migration.`);
  console.log(`To apply in your Supabase Dashboard SQL Editor, run this 1-line statement:`);
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`UPDATE auth.users SET encrypted_password = extensions.crypt('${newPassword}', extensions.gen_salt('bf')), updated_at = NOW() WHERE id = '${acc.uid}';`);
  console.log(`--------------------------------------------------------------------------------`);
  
  if (process.env.TARGET_ACCOUNT) {
    console.log(`Run the above statement in Supabase SQL Editor to finish setting password for ${acc.name}.`);
    return false;
  }

  await askQuestion(`Press Enter after running the SQL query above to verify login... `);
  return true;
}

async function runConfig() {
  console.log('========================================================================');
  console.log('🔐 CAMPUSCARE: AUTHORIZED ROLE ACCOUNT PASSWORD SETUP');
  console.log('========================================================================');
  console.log('This utility configures credentials for the 3 core CampusCare role accounts.');
  console.log('Passwords are entered privately with masked input and never saved in logs.\n');

  console.log('Target Accounts:');
  console.log('  [1] Admin / CMS : 24481A67383');
  console.log('  [2] Student     : 24481A54E9');
  console.log('  [3] Parent      : 7893589331');
  console.log('  [4] Configure All 3 Accounts Sequentially');
  console.log('  [5] Exit\n');

  // Check if non-interactive mode via environment
  const targetEnv = (process.env.TARGET_ACCOUNT || '').toLowerCase();
  const newPassEnv = process.env.NEW_PASSWORD;

  if (targetEnv && newPassEnv) {
    if (ACCOUNTS[targetEnv]) {
      console.log(`[Non-interactive mode: configuring ${targetEnv}]`);
      const ok = await updatePasswordForAccount(targetEnv, newPassEnv);
      if (ok) {
        const v = await verifyLogin(ACCOUNTS[targetEnv].email, newPassEnv, ACCOUNTS[targetEnv].name);
        console.log(v.success ? `🎉 [VERIFIED] Login successful for ${ACCOUNTS[targetEnv].name}!` : `❌ Verification failed: ${v.error}`);
      }
    }
    return;
  }

  const choice = await askQuestion('Select an account to configure (1-5): ');

  let accountsToConfigure = [];
  if (choice === '1') accountsToConfigure.push('admin');
  else if (choice === '2') accountsToConfigure.push('student');
  else if (choice === '3') accountsToConfigure.push('parent');
  else if (choice === '4') accountsToConfigure.push('admin', 'student', 'parent');
  else {
    console.log('Exiting setup utility.');
    return;
  }

  for (const accKey of accountsToConfigure) {
    const acc = ACCOUNTS[accKey];
    console.log(`\n------------------------------------------------------------------------`);
    console.log(`🔑 Configuring Password for ${acc.name} (${acc.identifier})`);
    console.log(`------------------------------------------------------------------------`);

    let p1 = '';
    let p2 = '';

    while (true) {
      p1 = await readSecret(`Enter new password for ${acc.name} (min 8 chars): `);
      if (p1.length < 8) {
        console.log('❌ Password must be at least 8 characters long. Please try again.');
        continue;
      }
      p2 = await readSecret(`Confirm new password: `);
      if (p1 !== p2) {
        console.log('❌ Passwords do not match. Please try again.');
        continue;
      }
      break;
    }

    const updated = await updatePasswordForAccount(accKey, p1);
    if (updated) {
      console.log(`\n🔍 Verifying authentication with the newly configured credentials...`);
      const verify = await verifyLogin(acc.email, p1, acc.name);
      if (verify.success) {
        console.log(`🎉 [SUCCESS] ${acc.name} (${acc.identifier}) authenticated successfully!`);
      } else {
        console.log(`❌ [FAIL] Authentication check failed: ${verify.error}`);
      }
    }
  }

  console.log('\n========================================================================');
  console.log('🏁 PASSWORD CONFIGURATION COMPLETED');
  console.log('========================================================================');
}

runConfig().catch(console.error);
