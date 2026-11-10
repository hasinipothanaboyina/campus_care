import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Lock, ArrowRight, CheckCircle2, HelpCircle, BookOpen, Phone, KeyRound } from 'lucide-react';
import { UserRole } from '../types';

export const Login: React.FC = () => {
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();

    if (!cleanId || !password) {
      setError(
        role === 'ADMIN'
          ? 'Please enter your Admin ID and password.'
          : role === 'PARENT'
          ? 'Please enter your registered Phone Number and password.'
          : 'Please enter your Student ID and password.'
      );
      return;
    }

    // Role-specific format validation
    if (role === 'PARENT') {
      const digits = cleanId.replace(/[^0-9]/g, '');
      if (digits.length < 10) {
        setError('Please enter a valid 10-digit mobile phone number.');
        return;
      }
    }

    setError('');
    setInfoMsg('');
    setLoading(true);

    try {
      const res = await login(cleanId, password, role);
      if (res.success) {
        if (role === 'ADMIN' || role === 'CMC') {
          navigate('/admin');
        } else if (role === 'PARENT') {
          navigate('/parent');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(res.error || 'Invalid credentials. Please check your details and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotHelp = () => {
    setShowForgot(!showForgot);
    setError('');
    setInfoMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CampusCare</h1>
          <p className="text-xs text-slate-500 mt-1">Student Voice & Campus Improvement Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
          {/* 3-Way Role Switch */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setRole('STUDENT');
                setIdentifier('');
                setPassword('');
                setError('');
                setInfoMsg('');
                setShowForgot(false);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                role === 'STUDENT'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('PARENT');
                setIdentifier('');
                setPassword('');
                setError('');
                setInfoMsg('');
                setShowForgot(false);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                role === 'PARENT'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Parent
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('ADMIN');
                setIdentifier('');
                setPassword('');
                setError('');
                setInfoMsg('');
                setShowForgot(false);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                role === 'ADMIN'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Admin
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {infoMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {role === 'ADMIN'
                    ? 'Admin ID'
                    : role === 'PARENT'
                    ? 'Phone Number'
                    : 'Student ID / Roll Number'}
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {role === 'ADMIN'
                    ? 'e.g. 24481A67383'
                    : role === 'PARENT'
                    ? '10-digit mobile'
                    : 'e.g. 24481A54E9'}
                </span>
              </div>
              <div className="relative">
                {role === 'ADMIN' ? (
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                ) : role === 'PARENT' ? (
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                ) : (
                  <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                )}
                <input
                  type={role === 'PARENT' ? 'tel' : 'text'}
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={e => {
                    const val = e.target.value;
                    if (role === 'PARENT') {
                      setIdentifier(val.replace(/[^0-9]/g, ''));
                    } else if (role === 'STUDENT') {
                      setIdentifier(val.toUpperCase());
                    } else {
                      setIdentifier(val);
                    }
                  }}
                  maxLength={role === 'STUDENT' ? 12 : role === 'PARENT' ? 10 : 30}
                  placeholder={
                    role === 'ADMIN'
                      ? 'Enter your Admin ID'
                      : role === 'PARENT'
                      ? 'Enter your 10-digit phone number'
                      : 'Enter your Student Roll Number'
                  }
                  className="w-full pl-9 pr-4 py-2.5 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={handleForgotHelp}
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
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>
                {loading
                  ? 'Authenticating...'
                  : role === 'ADMIN'
                  ? 'Sign in to Admin Portal'
                  : role === 'PARENT'
                  ? 'Sign in to Parent Portal'
                  : 'Sign in to Student Portal'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Help / Password Reset Guidance */}
          {showForgot && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                Password Reset Assistance
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {role === 'ADMIN'
                  ? 'Administrative credentials can be securely reset using the authorized admin rotation process or server environment configuration.'
                  : role === 'PARENT'
                  ? 'To reset your parent access password, please contact the college administration office or use the secure credentials setup utility.'
                  : 'To reset your student password, please contact the CampusCare Administrator or department coordinator.'}
              </p>
            </div>
          )}

          {/* Registration Links */}
          {role === 'STUDENT' && (
            <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
              New student?{' '}
              <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-800">
                Create a student profile
              </Link>
            </div>
          )}

          {role === 'PARENT' && (
            <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
              New parent or guardian?{' '}
              <Link to="/register?role=parent" className="font-semibold text-indigo-600 hover:text-indigo-800">
                Register Parent Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
