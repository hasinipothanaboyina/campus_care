import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Lock, Mail, BookOpen, ArrowRight, Users, Phone } from 'lucide-react';

export const Register: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'parent' ? 'PARENT' : 'STUDENT';
  const [roleType, setRoleType] = useState<'STUDENT' | 'PARENT'>(initialRole);

  // Student Form State
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    studentId: '',
    email: '',
    department: 'CSE',
    year: '3rd Year',
    section: 'Section A',
    password: '',
    confirmPassword: '',
  });

  // Parent Form State
  const [parentForm, setParentForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    studentRollNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { registerStudent, registerParent } = useAuth();
  const navigate = useNavigate();

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentForm.fullName || !studentForm.studentId || !studentForm.email || !studentForm.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (studentForm.password !== studentForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await registerStudent({
        fullName: studentForm.fullName,
        studentId: studentForm.studentId,
        email: studentForm.email,
        department: studentForm.department,
        year: studentForm.year,
        section: studentForm.section,
        password: studentForm.password,
      });

      if (res.success) {
        alert('Registration submitted successfully. Please wait for admin approval.');
        navigate('/login');
      } else {
        setError(res.error || 'Registration failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!parentForm.fullName || !parentForm.email || !parentForm.phone || !parentForm.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (parentForm.password !== parentForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await registerParent({
        fullName: parentForm.fullName,
        email: parentForm.email,
        phone: parentForm.phone,
        password: parentForm.password,
        studentRollNumber: parentForm.studentRollNumber,
      });

      if (res.success) {
        alert(
          parentForm.studentRollNumber
            ? `Parent account registered successfully. Your request to link with student (${parentForm.studentRollNumber.toUpperCase()}) has been submitted for college administration verification.`
            : 'Parent account registered successfully. You can now log in and link your student.'
        );
        navigate('/login');
      } else {
        setError(res.error || 'Parent registration failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-8">
      <div className="max-w-xl w-full">
        {/* Branding */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Join CampusCare</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create your verified profile to participate in campus improvements and track student concerns.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
          {/* Account Role Selector */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setRoleType('STUDENT');
                setError('');
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                roleType === 'STUDENT'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Student Registration
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleType('PARENT');
                setError('');
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                roleType === 'PARENT'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Parent / Guardian Registration
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Student Form */}
          {roleType === 'STUDENT' && (
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={studentForm.fullName}
                      onChange={e => setStudentForm({ ...studentForm, fullName: e.target.value })}
                      placeholder="e.g. Alex Johnson"
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                {/* Student Roll Number / ID */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Student Roll Number / ID *</label>
                  <div className="relative">
                    <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={studentForm.studentId}
                      onChange={e => setStudentForm({ ...studentForm, studentId: e.target.value.toUpperCase() })}
                      maxLength={12}
                      placeholder="e.g. 2024CSE042"
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Student Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={studentForm.email}
                    onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                    placeholder="student@campuscare.edu"
                    className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Department */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={studentForm.department}
                    onChange={e => setStudentForm({ ...studentForm, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  >
                    <option value="CSE">CSE</option>
                    <option value="AIML">AIML</option>
                    <option value="AIDS">AIDS</option>
                    <option value="IT">IT</option>
                    <option value="IOT">IOT</option>
                    <option value="EEE">EEE</option>
                    <option value="ECE">ECE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
                </div>

                {/* Year */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Year</label>
                  <select
                    value={studentForm.year}
                    onChange={e => setStudentForm({ ...studentForm, year: e.target.value })}
                    className="w-full px-3 py-2 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                {/* Section */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Section</label>
                  <select
                    value={studentForm.section}
                    onChange={e => setStudentForm({ ...studentForm, section: e.target.value })}
                    className="w-full px-3 py-2 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  >
                    <option value="Section A">Section A</option>
                    <option value="Section B">Section B</option>
                    <option value="Section C">Section C</option>
                    <option value="Section D">Section D</option>
                  </select>
                </div>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={studentForm.password}
                      onChange={e => setStudentForm({ ...studentForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={studentForm.confirmPassword}
                      onChange={e => setStudentForm({ ...studentForm, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow transition-all flex items-center justify-center gap-2 mt-4"
              >
                <span>{loading ? 'Submitting Registration...' : 'Complete Student Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Parent Form */}
          {roleType === 'PARENT' && (
            <form onSubmit={handleParentSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Parent / Guardian Full Name *</label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={parentForm.fullName}
                    onChange={e => setParentForm({ ...parentForm, fullName: e.target.value })}
                    placeholder="e.g. Robert Johnson"
                    className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Parent Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={parentForm.email}
                      onChange={e => setParentForm({ ...parentForm, email: e.target.value })}
                      placeholder="parent@example.com"
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                {/* Mobile Phone */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Phone Number *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={parentForm.phone}
                      onChange={e => setParentForm({ ...parentForm, phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Ward's Roll Number */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Student Roll Number (Ward to Link)
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={parentForm.studentRollNumber}
                    onChange={e => setParentForm({ ...parentForm, studentRollNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. 2024CSE042 (can also be linked after login)"
                    className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Access to your ward's records requires verification by the college administration against admission records.
                </p>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={parentForm.password}
                      onChange={e => setParentForm({ ...parentForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={parentForm.confirmPassword}
                      onChange={e => setParentForm({ ...parentForm, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-all flex items-center justify-center gap-2 mt-4"
              >
                <span>{loading ? 'Creating Parent Account...' : 'Complete Parent Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-800">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
