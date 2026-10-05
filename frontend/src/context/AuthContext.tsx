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

  const fetchProfile = async (userId: string, email: string): Promise<UserProfile | null> => {
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
          isApproved: data.is_approved,
          lastLogin: data.last_login,
          createdAt: data.created_at,
        };
        setUser(u);
        localStorage.setItem('campuscare_user', JSON.stringify(u));
        return u;
      } else {
        const isDefaultAdmin = email.toLowerCase().includes('admin');
        const fallbackUser: UserProfile = {
          id: userId,
          fullName: isDefaultAdmin ? 'CMC Operations Admin' : 'Student User',
          email,
          role: isDefaultAdmin ? 'ADMIN' : 'STUDENT',
          studentId: isDefaultAdmin ? 'ADM-001' : '2026-CSE-091',
          isApproved: true,
          createdAt: new Date().toISOString(),
        };
        setUser(fallbackUser);
        localStorage.setItem('campuscare_user', JSON.stringify(fallbackUser));
        return fallbackUser;
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
      return null;
    }
  };

  const login = async (identifier: string, password: string, requestedRole?: UserRole): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      let emailToAuth = identifier.trim();

      if (!emailToAuth.includes('@')) {
        try {
          const { data } = await supabase.from('profiles').select('email').eq('student_id', emailToAuth).maybeSingle();
          if (data?.email) emailToAuth = data.email;
          else {
            const cleanId = emailToAuth.toLowerCase().replace(/[^a-z0-9]/g, '');
            emailToAuth = `${cleanId}@campuscare.edu`;
          }
        } catch (e) {
          const cleanId = emailToAuth.toLowerCase().replace(/[^a-z0-9]/g, '');
          emailToAuth = `${cleanId}@campuscare.edu`;
        }
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailToAuth, password });

      if (error) {
        setIsLoading(false);
        return { success: false, error: 'Invalid credentials. Please check your Roll Number / Admin ID and password.' };
      }

      if (data.user) {
        await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', data.user.id);
        const profile = await fetchProfile(data.user.id, data.user.email || emailToAuth);
        
        if (profile && profile.role === 'STUDENT' && profile.isApproved === false) {
           await supabase.auth.signOut();
           setUser(null);
           localStorage.removeItem('campuscare_user');
           setIsLoading(false);
           return { success: false, error: 'Your account is pending admin approval. Please wait for authorization.' };
        }
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
        setIsLoading(false);
        return { success: false, error: authError.message };
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
          is_approved: false, // Explicitly pending
        },
      ]);

      // Sign out immediately because they must be approved by admin before logging in
      await supabase.auth.signOut();
      
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
