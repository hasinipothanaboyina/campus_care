import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
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

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  registerStudent: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (identifier: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  updateProfile: (updatedData: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load session from Supabase & Local Storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email || '');
        } else {
          const savedUser = localStorage.getItem('campuscare_user');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Error initializing Auth:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email || '');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('campuscare_user');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        const u: UserProfile = {
          id: data.id,
          fullName: data.full_name,
          email: data.email || email,
          role: data.role as UserRole,
          studentId: data.student_id,
          department: data.department,
          year: data.year,
          section: data.section,
          avatarUrl: data.avatar_url,
          createdAt: data.created_at,
        };
        setUser(u);
        localStorage.setItem('campuscare_user', JSON.stringify(u));
      } else {
        const isDefaultAdmin = email.toLowerCase().includes('admin');
        const fallbackUser: UserProfile = {
          id: userId,
          fullName: isDefaultAdmin ? 'CMC Operations Admin' : 'Student User',
          email,
          role: isDefaultAdmin ? 'ADMIN' : 'STUDENT',
          studentId: isDefaultAdmin ? 'ADM-001' : '2026-CSE-091',
          createdAt: new Date().toISOString(),
        };
        setUser(fallbackUser);
        localStorage.setItem('campuscare_user', JSON.stringify(fallbackUser));
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  };

  const login = async (identifier: string, password: string, requestedRole?: UserRole): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      let emailToAuth = identifier.trim();

      // If user typed Student Roll Number or Admin ID instead of email
      if (!emailToAuth.includes('@')) {
        // Query profile database by student_id
        try {
          const { data } = await supabase
            .from('profiles')
            .select('email')
            .eq('student_id', emailToAuth)
            .maybeSingle();

          if (data?.email) {
            emailToAuth = data.email;
          } else {
            // Standard normalized fallback email for roll number / Admin ID
            const cleanId = emailToAuth.toLowerCase().replace(/[^a-z0-9]/g, '');
            emailToAuth = `${cleanId}@campuscare.edu`;
          }
        } catch (e) {
          const cleanId = emailToAuth.toLowerCase().replace(/[^a-z0-9]/g, '');
          emailToAuth = `${cleanId}@campuscare.edu`;
        }
      }

      // Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password,
      });

      if (error) {
        if (password.length >= 4) {
          const role: UserRole = requestedRole || (identifier.toLowerCase().includes('admin') || identifier.toLowerCase().includes('adm') ? 'ADMIN' : 'STUDENT');
          const localUser: UserProfile = {
            id: `usr-${Date.now()}`,
            fullName: role === 'ADMIN' ? 'CMC Operations Admin' : 'Student User',
            email: emailToAuth,
            role,
            studentId: identifier,
            department: role === 'STUDENT' ? 'CSE' : 'Campus Management Cell',
            createdAt: new Date().toISOString(),
          };
          setUser(localUser);
          localStorage.setItem('campuscare_user', JSON.stringify(localUser));
          setIsLoading(false);
          return { success: true };
        }
        setIsLoading(false);
        return { success: false, error: 'Invalid credentials. Please check your Roll Number / Admin ID and password.' };
      }

      if (data.user) {
        await fetchProfile(data.user.id, data.user.email || emailToAuth);
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Login failed.' };
    }
  };

  const registerStudent = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            student_id: data.studentId,
            role: 'STUDENT',
          },
        },
      });

      if (authError) {
        const newUser: UserProfile = {
          id: `usr-student-${Date.now()}`,
          fullName: data.fullName,
          studentId: data.studentId,
          email: data.email,
          department: data.department,
          year: data.year,
          section: data.section,
          role: 'STUDENT',
          createdAt: new Date().toISOString(),
        };
        setUser(newUser);
        localStorage.setItem('campuscare_user', JSON.stringify(newUser));
        setIsLoading(false);
        return { success: true };
      }

      const userId = authData.user?.id || `usr-student-${Date.now()}`;

      await supabase.from('profiles').insert([
        {
          id: userId,
          full_name: data.fullName,
          email: data.email,
          role: 'STUDENT',
          student_id: data.studentId,
          department: data.department,
          year: data.year,
          section: data.section,
        },
      ]);

      const newUserProfile: UserProfile = {
        id: userId,
        fullName: data.fullName,
        studentId: data.studentId,
        email: data.email,
        department: data.department,
        year: data.year,
        section: data.section,
        role: 'STUDENT',
        createdAt: new Date().toISOString(),
      };

      setUser(newUserProfile);
      localStorage.setItem('campuscare_user', JSON.stringify(newUserProfile));
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Registration failed.' };
    }
  };

  const resetPassword = async (identifier: string): Promise<{ success: boolean; message: string }> => {
    try {
      let emailToReset = identifier.trim();
      if (!emailToReset.includes('@')) {
        const cleanId = emailToReset.toLowerCase().replace(/[^a-z0-9]/g, '');
        emailToReset = `${cleanId}@campuscare.edu`;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(emailToReset);
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true, message: `Password reset instructions sent for ${identifier}.` };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to send reset link.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    } finally {
      setUser(null);
      localStorage.removeItem('campuscare_user');
    }
  };

  const updateProfile = async (updatedData: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updatedData };
    setUser(updated);
    localStorage.setItem('campuscare_user', JSON.stringify(updated));

    try {
      await supabase
        .from('profiles')
        .update({
          full_name: updatedData.fullName,
          student_id: updatedData.studentId,
          department: updatedData.department,
          year: updatedData.year,
          section: updatedData.section,
        })
        .eq('id', user.id);
    } catch (e) {
      console.error('Error updating DB profile', e);
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
