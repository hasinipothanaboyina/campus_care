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
      let emailToAuth = identifier.trim();

      // If user supplied a Roll Number / Admin ID / Mobile Phone instead of an email, look up the email
      if (!emailToAuth.includes('@')) {
        const cleanInput = emailToAuth.toUpperCase();

        // 1. Direct institutional ID mappings
        if (cleanInput === '24481A67383' || ((requestedRole === 'ADMIN' || requestedRole === 'admin') && cleanInput === 'ADMIN')) {
          emailToAuth = 'admin@srgec.edu';
        } else if (cleanInput === '24481A54E9') {
          emailToAuth = '24481a54e9@campuscare.edu';
        } else {
          try {
            // 2. Try RPC function (SECURITY DEFINER lookup that bypasses RLS for unauthenticated login)
            const { data: rpcEmail } = await supabase.rpc('get_auth_email_by_identifier', {
              p_identifier: cleanInput,
            });

            if (rpcEmail) {
              emailToAuth = rpcEmail;
            } else {
              // 3. Fallback: check phone or construct student email format
              if (requestedRole === 'PARENT' || requestedRole === 'parent') {
                const { data: phoneMatch } = await supabase
                  .from('profiles')
                  .select('email')
                  .eq('phone', emailToAuth)
                  .maybeSingle();

                if (phoneMatch?.email) {
                  emailToAuth = phoneMatch.email;
                }
              }

              if (!emailToAuth.includes('@')) {
                const cleanSub = cleanInput.toLowerCase().replace(/[^a-z0-9]/g, '');
                emailToAuth = `${cleanSub}@campuscare.edu`;
              }
            }
          } catch {
            const cleanSub = cleanInput.toLowerCase().replace(/[^a-z0-9]/g, '');
            emailToAuth = `${cleanSub}@campuscare.edu`;
          }
        }
      }

      // Real Supabase Auth authentication with timeout guard
      const authPromise = supabase.auth.signInWithPassword({
        email: emailToAuth,
        password,
      });
      const authTimeout = new Promise<{ data: any; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('Authentication timed out. Please check your connection and try again.')), 15000)
      );

      const { data: authData, error: authError } = await Promise.race([authPromise, authTimeout]);

      if (authError || !authData.user) {
        setIsLoading(false);
        const roleLabel =
          requestedRole === 'ADMIN'
            ? 'Admin ID'
            : requestedRole === 'PARENT'
            ? 'Parent Email / Phone'
            : 'Roll Number';
        return {
          success: false,
          error: authError?.message || `Invalid credentials. Please verify your ${roleLabel} and password.`,
        };
      }

      // Fetch authentic database profile
      const profilePromise = fetchProfile(authData.user.id, authData.user.email || emailToAuth);
      const profileTimeout = new Promise<UserProfile | null>((_, reject) =>
        setTimeout(() => reject(new Error('Loading profile timed out. Please try again.')), 8000)
      );
      const profile = await Promise.race([profilePromise, profileTimeout]);

      if (!profile) {
        await supabase.auth.signOut();
        setUser(null);
        setIsLoading(false);
        return {
          success: false,
          error: 'User profile record not found in database. Please contact the administrator.',
        };
      }

      // Check Admin / CMC authorization
      const isAdminOrCmc =
        profile.role === 'ADMIN' ||
        profile.role === 'CMC' ||
        profile.role === 'admin' ||
        profile.role === 'cmc';

      if (requestedRole === 'ADMIN' && !isAdminOrCmc) {
        await supabase.auth.signOut();
        setUser(null);
        setIsLoading(false);
        return {
          success: false,
          error: 'Access denied. This account does not possess Admin or CMC privileges.',
        };
      }

      // Check Parent role authorization
      if ((requestedRole === 'PARENT' || requestedRole === 'parent') && profile.role !== 'PARENT' && profile.role !== 'parent') {
        await supabase.auth.signOut();
        setUser(null);
        setIsLoading(false);
        return {
          success: false,
          error: 'Access denied. This account is not registered as a Parent / Guardian.',
        };
      }

      // Check Student approval status
      if (profile.role === 'STUDENT' || profile.role === 'student') {
        if (profile.approvalStatus === 'REJECTED') {
          await supabase.auth.signOut();
          setUser(null);
          setIsLoading(false);
          return {
            success: false,
            error: 'Your registration was rejected. Please contact the administrator.',
          };
        }

        if (!profile.isApproved || profile.approvalStatus === 'PENDING') {
          await supabase.auth.signOut();
          setUser(null);
          setIsLoading(false);
          return {
            success: false,
            error: 'Your registration is waiting for admin approval.',
          };
        }
      }

      // Non-blocking update of last login timestamp
      Promise.resolve(
        supabase
          .from('profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', authData.user.id)
      ).catch(() => {});

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
    try {
      let emailToReset = identifier.trim();
      if (!emailToReset.includes('@')) {
        const cleanId = emailToReset.toUpperCase();
        const { data } = await supabase
          .from('profiles')
          .select('email')
          .or(`student_id.eq.${cleanId},roll_number.eq.${cleanId}`)
          .maybeSingle();

        if (data?.email) {
          emailToReset = data.email;
        } else {
          const cleanSub = cleanId.toLowerCase().replace(/[^a-z0-9]/g, '');
          emailToReset = `${cleanSub}@campuscare.edu`;
        }
      }

      // Check if target is an administrative account with an institutional placeholder email
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', emailToReset)
        .maybeSingle();

      const isAdminAccount =
        emailToReset.toLowerCase() === 'admin@srgec.edu' ||
        identifier.trim().toUpperCase() === '24481A67383' ||
        profile?.role === 'ADMIN' ||
        profile?.role === 'CMC' ||
        profile?.role === 'admin' ||
        profile?.role === 'cmc';

      if (isAdminAccount) {
        return {
          success: false,
          message:
            'Administrative accounts use an institutional placeholder domain without inbound email recovery. Please rotate credentials using the authorized server-side rotation process.',
        };
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
        redirectTo: origin ? `${origin}/login` : undefined,
      });
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true, message: `Password reset instructions sent to ${emailToReset}.` };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to send reset link.' };
    }
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
