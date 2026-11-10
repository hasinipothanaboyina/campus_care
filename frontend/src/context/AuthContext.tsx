import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, ParentStudentLink } from '../types';
import { supabase } from '../lib/supabase';

interface RegisterData {
  fullName: string;
  studentId: string;
  email: string;
  department: string;
  year: string;
  section: string;
  password: string;
}

export interface RegisterParentData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  studentRollNumber?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, requestedRole?: UserRole) => Promise<{ success: boolean; error?: string }>;
  registerStudent: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  registerParent: (data: RegisterParentData) => Promise<{ success: boolean; error?: string }>;
  requestStudentLink: (studentRollNumber: string) => Promise<{ success: boolean; error?: string }>;
  fetchMyParentLinks: () => Promise<ParentStudentLink[]>;
  resetPassword: (identifier: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  updateProfile: (updatedData: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async (userId: string, email: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) {
        const u: UserProfile = {
          id: data.id,
          fullName: data.full_name || '',
          email: data.email || email,
          phone: data.phone || '',
          role: (data.role || 'STUDENT') as UserRole,
          studentId: data.student_id || data.roll_number || '',
          department: data.department || '',
          year: data.year || '',
          section: data.section || '',
          avatarUrl: data.avatar_url,
          isApproved: data.is_approved ?? false,
          approvalStatus: data.approval_status || (data.is_approved ? 'APPROVED' : 'PENDING'),
          lastLogin: data.last_login,
          createdAt: data.created_at || new Date().toISOString(),
        };
        setUser(u);
        return u;
      }

      // Profile does not exist in the database
      setUser(null);
      return null;
    } catch (e) {
      console.error('Error fetching profile from Supabase:', e);
      setUser(null);
      return null;
    }
  };

  // Load session from Supabase Auth
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        // Safe timeout guard: never leave UI hanging if browser lock or network stalls
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: any }; error: any }>(resolve =>
          setTimeout(() => resolve({ data: { session: null }, error: null }), 6000)
        );

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);

        if (error || !session?.user) {
          if (isMounted) setUser(null);
          return;
        }

        if (isMounted) {
          await fetchProfile(session.user.id, session.user.email || '');
        }
      } catch (err) {
        console.error('Error initializing Auth session:', err);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (isMounted) setUser(null);
      } else if (session?.user && event !== 'SIGNED_IN') {
        // Asynchronously fetch profile for background events (e.g. TOKEN_REFRESHED, USER_UPDATED)
        // Decoupled via setTimeout from the GoTrue lock callback to prevent Web Locks deadlocks
        setTimeout(() => {
          if (isMounted) {
            fetchProfile(session.user.id, session.user.email || '');
          }
        }, 0);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (
    identifier: string,
    password: string,
    requestedRole?: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      const cleanIdentifier = identifier.trim();
      const roleToUse = requestedRole || 'STUDENT';

      // 1. Primary path: Trusted server-side authentication endpoint
      let authResponse: any = null;
      let usedServer = false;

      try {
        const resp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: cleanIdentifier,
            password,
            role: roleToUse,
          }),
        });

        if (resp.status === 200 || resp.status === 401 || resp.status === 403) {
          authResponse = await resp.json();
          usedServer = true;
        }
      } catch (netErr) {
        // Fallback to direct RPC lookup
      }

      // If server handled the authentication request
      if (usedServer && authResponse) {
        if (!authResponse.success) {
          setIsLoading(false);
          return { success: false, error: authResponse.error || 'Invalid credentials.' };
        }

        // Establish live Supabase session with returned tokens
        if (authResponse.session?.access_token && authResponse.session?.refresh_token) {
          const { error: sessionErr } = await supabase.auth.setSession({
            access_token: authResponse.session.access_token,
            refresh_token: authResponse.session.refresh_token,
          });
          if (sessionErr) {
            console.error('Error establishing Supabase session:', sessionErr);
          }
        }

        if (authResponse.profile) {
          const p = authResponse.profile;
          const u: UserProfile = {
            id: p.id,
            fullName: p.fullName || p.full_name || '',
            email: p.email || '',
            phone: p.phone || '',
            role: (p.role || roleToUse) as UserRole,
            studentId: p.studentId || p.student_id || '',
            department: p.department || '',
            year: p.year || '',
            section: p.section || '',
            avatarUrl: p.avatarUrl || p.avatar_url,
            isApproved: p.isApproved ?? p.is_approved ?? true,
            approvalStatus: p.approvalStatus || p.approval_status || 'APPROVED',
            lastLogin: new Date().toISOString(),
            createdAt: p.createdAt || p.created_at || new Date().toISOString(),
          };
          setUser(u);
        } else if (authResponse.session?.user) {
          await fetchProfile(authResponse.session.user.id, authResponse.session.user.email || '');
        }

        setIsLoading(false);
        return { success: true };
      }

      // 2. Direct RPC fallback if server endpoint is offline
      // Resolves email via PostgreSQL SECURITY DEFINER RPC without any hardcoded institutional emails in frontend!
      const { data: resolvedEmail, error: rpcErr } = await supabase.rpc('get_auth_email_by_identifier', {
        p_identifier: cleanIdentifier.toUpperCase(),
      });

      if (rpcErr || !resolvedEmail) {
        setIsLoading(false);
        const roleLabel =
          roleToUse === 'ADMIN' ? 'Admin ID' : roleToUse === 'PARENT' ? 'Phone Number' : 'Student ID';
        return {
          success: false,
          error: `No registered account found matching ${roleLabel} "${cleanIdentifier}".`,
        };
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password,
      });

      if (authError || !authData.user) {
        setIsLoading(false);
        return {
          success: false,
          error: 'Incorrect password. Please verify your credentials and try again.',
        };
      }

      const profile = await fetchProfile(authData.user.id, authData.user.email || resolvedEmail);
      if (!profile) {
        await supabase.auth.signOut();
        setUser(null);
        setIsLoading(false);
        return {
          success: false,
          error: 'User profile record not found in database.',
        };
      }

      // Verify role authorization
      const isAdminOrCmc =
        profile.role === 'ADMIN' ||
        profile.role === 'CMC' ||
        profile.role === 'admin' ||
        profile.role === 'cmc';

      if (roleToUse === 'ADMIN' && !isAdminOrCmc) {
        await supabase.auth.signOut();
        setUser(null);
        setIsLoading(false);
        return {
          success: false,
          error: 'Access denied: This account does not possess administrator privileges.',
        };
      }

      if (roleToUse === 'PARENT' && profile.role !== 'PARENT' && profile.role !== 'parent') {
        await supabase.auth.signOut();
        setUser(null);
        setIsLoading(false);
        return {
          success: false,
          error: 'Access denied: This account is not registered as a Parent / Guardian.',
        };
      }

      if (roleToUse === 'STUDENT' && (profile.role === 'STUDENT' || profile.role === 'student')) {
        if (!profile.isApproved || profile.approvalStatus === 'PENDING') {
          await supabase.auth.signOut();
          setUser(null);
          setIsLoading(false);
          return {
            success: false,
            error: 'Your student registration is pending administrator approval.',
          };
        }
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Login failed due to a network error.' };
    }
  };

  const registerStudent = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      const cleanStudentId = data.studentId.trim().toUpperCase();

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          emailRedirectTo: origin ? `${origin}/login` : undefined,
          data: {
            full_name: data.fullName.trim(),
            student_id: cleanStudentId,
            roll_number: cleanStudentId,
            role: 'STUDENT',
            department: data.department,
            year: data.year,
            section: data.section,
          },
        },
      });

      if (authError) {
        setIsLoading(false);
        return { success: false, error: authError.message };
      }

      // Unapproved student must not retain an active authenticated session
      try {
        await supabase.auth.signOut();
      } catch {
        // non-fatal
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Registration failed.' };
    }
  };

  const registerParent = async (data: RegisterParentData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          emailRedirectTo: origin ? `${origin}/login` : undefined,
          data: {
            full_name: data.fullName.trim(),
            phone: data.phone.trim(),
            role: 'PARENT',
          },
        },
      });

      if (authError || !authData.user) {
        setIsLoading(false);
        return { success: false, error: authError?.message || 'Parent registration failed.' };
      }

      // If ward's roll number was provided, submit an initial pending link request using the secure RPC
      if (data.studentRollNumber?.trim()) {
        const cleanRoll = data.studentRollNumber.trim().toUpperCase();
        try {
          await supabase.rpc('request_student_link', {
            p_roll_number: cleanRoll,
          });
        } catch (linkErr) {
          console.warn('Initial student link deferral:', linkErr);
        }
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Parent registration failed.' };
    }
  };

  const requestStudentLink = async (studentRollNumber: string): Promise<{ success: boolean; error?: string }> => {
    if (!user || (user.role !== 'PARENT' && user.role !== 'parent')) {
      return { success: false, error: 'Only authenticated parent accounts can submit student link requests.' };
    }

    const cleanRoll = studentRollNumber.trim().toUpperCase();
    if (!cleanRoll) {
      return { success: false, error: 'Please enter a valid student roll number.' };
    }

    try {
      // 1. Try secure RPC function first (bypasses RLS to securely look up student and insert PENDING link)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('request_student_link', {
        p_roll_number: cleanRoll,
      });

      if (!rpcError && rpcResult) {
        if (rpcResult.success) {
          return { success: true };
        }
        return { success: false, error: rpcResult.error || 'Failed to submit link request.' };
      }

      // 2. Direct database query fallback
      const { data: student, error: stuErr } = await supabase
        .from('profiles')
        .select('id, student_id, roll_number, full_name')
        .or(`student_id.eq.${cleanRoll},roll_number.eq.${cleanRoll}`)
        .maybeSingle();

      if (stuErr || !student) {
        return {
          success: false,
          error: `Student with Roll Number "${cleanRoll}" was not found in college records. Please verify the roll number.`,
        };
      }

      // Check for existing link request
      const { data: existing } = await supabase
        .from('parent_student_links')
        .select('id, verification_status')
        .eq('parent_id', user.id)
        .eq('student_id', student.id)
        .maybeSingle();

      if (existing) {
        const statusText =
          existing.verification_status === 'VERIFIED'
            ? 'already verified'
            : existing.verification_status === 'REJECTED'
            ? 'previously rejected'
            : 'currently pending verification';
        return {
          success: false,
          error: `A link request for Roll Number "${cleanRoll}" is ${statusText}.`,
        };
      }

      // Insert link request
      const { error: insErr } = await supabase.from('parent_student_links').insert([
        {
          parent_id: user.id,
          student_id: student.id,
          student_roll_number: cleanRoll,
          verification_status: 'PENDING_VERIFICATION',
        },
      ]);

      if (insErr) {
        return { success: false, error: insErr.message || 'Failed to submit link request.' };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error submitting link request.' };
    }
  };

  const fetchMyParentLinks = async (): Promise<ParentStudentLink[]> => {
    if (!user) return [];
    try {
      const { data, error } = await supabase
        .from('parent_student_links')
        .select(`
          id,
          parent_id,
          student_id,
          student_roll_number,
          verification_status,
          verified_by,
          verified_at,
          created_at,
          updated_at
        `)
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      // Fetch student details for display
      const studentIds = data.map((d: any) => d.student_id);
      const studentMap = new Map<string, any>();
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from('profiles')
          .select('id, full_name, department, year, student_id')
          .in('id', studentIds);

        if (students) {
          students.forEach(s => studentMap.set(s.id, s));
        }
      }

      return data.map((d: any) => {
        const stu = studentMap.get(d.student_id);
        return {
          id: d.id,
          parentId: d.parent_id,
          studentId: d.student_id,
          studentRollNumber: d.student_roll_number,
          verificationStatus: d.verification_status,
          verifiedBy: d.verified_by,
          verifiedAt: d.verified_at,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          studentName: stu?.full_name || 'Student',
          studentDepartment: stu?.department,
          studentYear: stu?.year,
        };
      });
    } catch (e) {
      console.error('Error fetching parent links:', e);
      return [];
    }
  };

  const resetPassword = async (identifier: string): Promise<{ success: boolean; message: string }> => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      return { success: false, message: 'Please enter your login identifier.' };
    }
    return {
      success: true,
      message: 'Password reset request received. For student and parent accounts, please contact college administration or use the authorized credentials configuration utility.',
    };
  };

  const logout = async () => {
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error signing out:', e);
    }
  };

  const updateProfile = async (updatedData: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updatedData };
    setUser(updated);

    try {
      await supabase
        .from('profiles')
        .update({
          full_name: updatedData.fullName,
          student_id: updatedData.studentId,
          roll_number: updatedData.studentId,
          department: updatedData.department,
          year: updatedData.year,
          section: updatedData.section,
        })
        .eq('id', user.id);
    } catch (e) {
      console.error('Error updating DB profile:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        registerStudent,
        registerParent,
        requestStudentLink,
        fetchMyParentLinks,
        resetPassword,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
