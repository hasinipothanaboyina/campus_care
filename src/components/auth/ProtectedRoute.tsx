import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Authenticating CampusCare session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Enforce approval check for student role
  if ((user.role === 'STUDENT' || user.role === 'student') && !user.isApproved) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole) {
    const isStudentTarget = allowedRole === 'STUDENT' || allowedRole === 'student';
    const isParentTarget = allowedRole === 'PARENT' || allowedRole === 'parent';
    const isAdminTarget = allowedRole === 'ADMIN' || allowedRole === 'admin';

    const isUserAdminOrCmc =
      user.role === 'ADMIN' ||
      user.role === 'admin' ||
      user.role === 'CMC' ||
      user.role === 'cmc';
    const isUserParent = user.role === 'PARENT' || user.role === 'parent';
    const isUserStudent = user.role === 'STUDENT' || user.role === 'student';

    const getRoleDefaultPath = () => {
      if (isUserAdminOrCmc) return '/admin';
      if (isUserParent) return '/parent';
      return '/dashboard';
    };

    if (isAdminTarget && !isUserAdminOrCmc) {
      return <Navigate to={getRoleDefaultPath()} replace />;
    }

    if (isParentTarget && !isUserParent) {
      return <Navigate to={getRoleDefaultPath()} replace />;
    }

    if (isStudentTarget && !isUserStudent) {
      return <Navigate to={getRoleDefaultPath()} replace />;
    }

    if (!isAdminTarget && !isParentTarget && !isStudentTarget && user.role !== allowedRole) {
      return <Navigate to={getRoleDefaultPath()} replace />;
    }
  }

  return <>{children}</>;
};
