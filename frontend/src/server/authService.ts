import { createClient } from '@supabase/supabase-js';

// Load configuration from environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://brpdzkzkgfpdviarsbvj.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2jS41D_uYUn30iGNqKGoVw_kdXa38wW';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Server-side authoritative registry for core institutional accounts
// This mapping is held strictly server-side and never exposed to the frontend bundle
const CORE_ROLE_ACCOUNTS: Record<string, { email: string; primaryUid: string; expectedRole: 'ADMIN' | 'STUDENT' | 'PARENT' }> = {
  '24481A67383': {
    email: 'admin@srgec.edu',
    primaryUid: '73e4a745-374e-4911-8297-b57fc00d9e47',
    expectedRole: 'ADMIN',
  },
  '24481A54E9': {
    email: '24481a54e9@campuscare.edu',
    primaryUid: '1f33aadb-1259-4cb1-bb5b-6dc6477c5153',
    expectedRole: 'STUDENT',
  },
  '7893589331': {
    email: 'pavani1505pothanaboyna@gmail.com',
    primaryUid: '2cb3671a-223c-4529-a118-4673200ff8ac',
    expectedRole: 'PARENT',
  },
};

export interface LoginParams {
  identifier: string;
  password: string;
  role: 'ADMIN' | 'STUDENT' | 'PARENT' | 'CMC';
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    user: any;
  };
  profile?: any;
}

/**
 * Server-side resolver: maps login identifier (Admin ID, Student ID, or Phone)
 * to the corresponding Supabase Auth email address without exposing emails to frontend.
 */
export async function resolveIdentifierToEmail(
  identifier: string,
  role: 'ADMIN' | 'STUDENT' | 'PARENT' | 'CMC'
): Promise<string | null> {
  const cleanId = identifier.trim().toUpperCase();
  const digitsOnly = identifier.trim().replace(/[^0-9]/g, '');

  // 1. Check core institutional accounts
  if (CORE_ROLE_ACCOUNTS[cleanId]) {
    return CORE_ROLE_ACCOUNTS[cleanId].email;
  }
  if (digitsOnly && CORE_ROLE_ACCOUNTS[digitsOnly]) {
    return CORE_ROLE_ACCOUNTS[digitsOnly].email;
  }

  // 2. Query Supabase RPC (SECURITY DEFINER) for dynamically registered users
  const serverClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: rpcEmail, error: rpcErr } = await serverClient.rpc('get_auth_email_by_identifier', {
      p_identifier: cleanId,
    });
    if (!rpcErr && rpcEmail) {
      return rpcEmail;
    }
  } catch (e) {
    console.error('RPC lookup error:', e);
  }

  // 3. Fallback query with digits-only phone
  if (digitsOnly && digitsOnly !== cleanId) {
    try {
      const { data: phoneEmail } = await serverClient.rpc('get_auth_email_by_identifier', {
        p_identifier: digitsOnly,
      });
      if (phoneEmail) return phoneEmail;
    } catch {}
  }

  return null;
}

/**
 * Server-side Login Handler:
 * Authenticates user via Supabase Auth using identifier + password,
 * verifies database role authorization, and returns the session tokens.
 */
export async function authenticateWithIdentifier(params: LoginParams): Promise<AuthResponse> {
  const { identifier, password, role } = params;

  if (!identifier || !password) {
    return {
      success: false,
      error: 'Please provide both your login identifier and password.',
    };
  }

  // Step 1: Resolve identifier to email securely on server
  const email = await resolveIdentifierToEmail(identifier, role);
  if (!email) {
    const roleLabel =
      role === 'ADMIN' ? 'Admin ID' : role === 'PARENT' ? 'Phone Number' : 'Student ID';
    return {
      success: false,
      error: `No registered account found matching ${roleLabel} "${identifier}".`,
    };
  }

  // Step 2: Authenticate with Supabase Auth
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let authData: any = null;
  let authError: any = null;

  // Try authenticating with entered password
  const attempt1 = await authClient.auth.signInWithPassword({
    email,
    password,
  });
  authData = attempt1.data;
  authError = attempt1.error;

  // Graceful handling for optional angle bracket wrappers (e.g. <pass> vs pass)
  if (authError && password.startsWith('<') && password.endsWith('>')) {
    const unbracketed = password.slice(1, -1);
    const attempt2 = await authClient.auth.signInWithPassword({
      email,
      password: unbracketed,
    });
    if (!attempt2.error && attempt2.data.session) {
      authData = attempt2.data;
      authError = null;
    }
  } else if (authError && !password.startsWith('<') && !password.endsWith('>')) {
    const bracketed = `<${password}>`;
    const attempt3 = await authClient.auth.signInWithPassword({
      email,
      password: bracketed,
    });
    if (!attempt3.error && attempt3.data.session) {
      authData = attempt3.data;
      authError = null;
    }
  }

  if (authError || !authData?.session || !authData?.user) {
    return {
      success: false,
      error: 'Incorrect password. Please verify your credentials and try again.',
    };
  }

  // Step 3: Fetch profile with authenticated user client to verify database role
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`,
      },
    },
  });

  const { data: profile, error: profErr } = await userClient
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profErr || !profile) {
    return {
      success: false,
      error: 'User profile record not found in college database.',
    };
  }

  // Step 4: Verify role authorization
  const profileRole = (profile.role || '').toUpperCase();
  const requestedRole = (role || '').toUpperCase();

  if (requestedRole === 'ADMIN') {
    if (profileRole !== 'ADMIN' && profileRole !== 'CMC') {
      await authClient.auth.signOut();
      return {
        success: false,
        error: 'Access denied: This account does not possess administrator privileges.',
      };
    }
  } else if (requestedRole === 'PARENT') {
    if (profileRole !== 'PARENT') {
      await authClient.auth.signOut();
      return {
        success: false,
        error: 'Access denied: This account is not registered as a Parent / Guardian.',
      };
    }
  } else if (requestedRole === 'STUDENT') {
    if (profileRole !== 'STUDENT') {
      await authClient.auth.signOut();
      return {
        success: false,
        error: 'Access denied: This account is not registered as a Student.',
      };
    }
    // Check student approval
    if (!profile.is_approved || profile.approval_status === 'PENDING') {
      await authClient.auth.signOut();
      return {
        success: false,
        error: 'Your student registration is pending administrator approval.',
      };
    }
    if (profile.approval_status === 'REJECTED') {
      await authClient.auth.signOut();
      return {
        success: false,
        error: 'Your student registration was rejected. Please contact the administrator.',
      };
    }
  }

  // Step 5: Non-blocking last login timestamp update
  Promise.resolve(
    userClient
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', authData.user.id)
  ).catch(() => {});

  // Step 6: Return session and sanitized profile
  return {
    success: true,
    session: {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_at: authData.session.expires_at,
      user: authData.user,
    },
    profile: {
      id: profile.id,
      fullName: profile.full_name,
      role: profile.role,
      studentId: profile.student_id || profile.roll_number || '',
      phone: profile.phone || '',
      department: profile.department || '',
      year: profile.year || '',
      section: profile.section || '',
      avatarUrl: profile.avatar_url,
      isApproved: profile.is_approved,
      approvalStatus: profile.approval_status,
      createdAt: profile.created_at,
      lastLogin: new Date().toISOString(),
    },
  };
}
