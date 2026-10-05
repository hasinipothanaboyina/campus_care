import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Lock, ArrowRight, CheckCircle2, HelpCircle, BookOpen } from 'lucide-react';
import { UserRole } from '../types';

export const Login: React.FC = () => {
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError(role === 'ADMIN' ? 'Please enter your Admin ID and password.' : 'Please enter your Roll Number and password.');
      return;
    }

    setError('');
    setInfoMsg('');
    setLoading(true);

    try {
      const res = await login(identifier, password, role);
      if (res.success) {
        if (role === 'ADMIN' || role === 'CMC') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(res.error || 'Invalid credentials. Please check your details.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      setError(role === 'ADMIN' ? 'Please enter your Admin ID to reset password.' : 'Please enter your Roll Number to reset password.');
      return;
    }
    const res = await resetPassword(identifier);
    if (res.success) {
      setInfoMsg(res.message);
      setShowForgot(false);
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">CampusCare</h1>
          <p className="text-xs text-slate-500 mt-1">Student Voice & Campus Improvement Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
          {/* Role Toggle Switch */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setRole('STUDENT');
                setIdentifier('');
                setError('');
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                role === 'STUDENT'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Student Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('ADMIN');
                setIdentifier('');
                setError('');
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                role === 'ADMIN'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              CMC / Admin Sign In
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {infoMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {role === 'ADMIN' ? 'Admin ID' : 'Student Roll Number'}
              </label>
              <div className="relative">
                {role === 'ADMIN' ? (
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                ) : (
                  <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                )}
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value.replace(/\D/g, ''))}
                  maxLength={role === 'ADMIN' ? 12 : 10}
                  placeholder={role === 'ADMIN' ? 'Enter your 12-digit Admin ID' : 'Enter your 10-digit roll number'}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgot(!showForgot)}
                  className="text-[11px] text-indigo-600 font-semibold hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : role === 'ADMIN' ? 'Sign in to Admin Portal' : 'Sign in to Student Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Forgot Password Flow */}
          {showForgot && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                Reset Password
              </h3>
              <p className="text-[11px] text-slate-500">
                Enter your {role === 'ADMIN' ? 'Admin ID' : 'Student Roll Number'} above and click below to send reset instructions.
              </p>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="w-full py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200"
              >
                Send Password Reset Request
              </button>
            </div>
          )}

          {/* Registration link for students */}
          {role === 'STUDENT' && (
            <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
              New student?{' '}
              <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-800">
                Create a student profile
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
