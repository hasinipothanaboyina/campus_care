import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ParentStudentLink } from '../../types';
import { Users, BookOpen, Clock, CheckCircle2, XCircle, AlertCircle, LogOut, Plus, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ParentLinkStatusPage: React.FC = () => {
  const { user, logout, requestStudentLink, fetchMyParentLinks } = useAuth();
  const [links, setLinks] = useState<ParentStudentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollInput, setRollInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();

  const loadLinks = useCallback(async () => {
    setLoading(true);
    const data = await fetchMyParentLinks();
    setLinks(data);
    setLoading(false);
  }, [fetchMyParentLinks]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollInput.trim()) return;

    setSubmitting(true);
    setMsg(null);

    const res = await requestStudentLink(rollInput.trim());
    if (res.success) {
      setMsg({
        type: 'success',
        text: `Link request for roll number "${rollInput.trim().toUpperCase()}" submitted for college verification.`,
      });
      setRollInput('');
      await loadLinks();
    } else {
      setMsg({
        type: 'error',
        text: res.error || 'Failed to submit link request.',
      });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-md">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">CampusCare</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                  Parent / Guardian
                </span>
              </div>
              <p className="text-xs text-slate-500">Student Voice & Campus Improvement Platform</p>
            </div>
          </div>

          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Welcome Card */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Verified Parent Relationship System
            </span>
            <h1 className="text-xl sm:text-2xl font-bold mt-1">Welcome, {user?.fullName}</h1>
            <p className="text-slate-300 text-xs max-w-xl">
              To protect student privacy, parent accounts must be verified against official college admission records before ward data can be accessed.
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono bg-slate-800/80 p-3 rounded-xl border border-slate-700 self-start sm:self-auto">
            <div>Email: <span className="text-slate-200">{user?.email}</span></div>
            {user?.phone && <div>Phone: <span className="text-slate-200">{user.phone}</span></div>}
          </div>
        </div>

        {/* Action Message Alert */}
        {msg && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              msg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {msg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Request New Link Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Request to Link a Student (Ward)</h2>
          </div>
          <p className="text-xs text-slate-500">
            Enter your student's official college Roll Number / ID. The college administration will verify your relationship against admission files.
          </p>

          <form onSubmit={handleLinkSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={rollInput}
                onChange={e => setRollInput(e.target.value.toUpperCase())}
                placeholder="e.g. 2024CSE042"
                maxLength={15}
                className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-900 font-mono font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-all flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'Submitting...' : 'Submit Link Request'}</span>
            </button>
          </form>
        </div>

        {/* Current Links List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Your Student Link Requests ({links.length})
            </h2>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading student link requests...</div>
            ) : links.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">No student links requested yet.</p>
                <p>Use the form above to submit your student's roll number for college verification.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {links.map(item => (
                  <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                          {item.studentRollNumber}
                        </span>
                        {item.verificationStatus === 'VERIFIED' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Officially Verified
                          </span>
                        )}
                        {item.verificationStatus === 'PENDING_VERIFICATION' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pending College Verification
                          </span>
                        )}
                        {item.verificationStatus === 'REJECTED' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Verification Rejected
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-slate-900 mt-1">
                        Student: {item.studentName || 'Student on file'} {item.studentDepartment ? `(${item.studentDepartment})` : ''}
                      </p>

                      <p className="text-[11px] text-slate-500">
                        Requested on {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-xs sm:text-right max-w-sm">
                      {item.verificationStatus === 'VERIFIED' && (
                        <p className="text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-[11px] font-medium leading-relaxed">
                          ✓ Access granted! In Phase 3, you will be able to review attendance, marks, fees, and campus issues for this student.
                        </p>
                      )}
                      {item.verificationStatus === 'PENDING_VERIFICATION' && (
                        <p className="text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] leading-relaxed">
                          Your request is being reviewed by the college office against official admission records. Student records remain protected.
                        </p>
                      )}
                      {item.verificationStatus === 'REJECTED' && (
                        <p className="text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-[11px] leading-relaxed">
                          The college office was unable to verify this relationship. Please contact administration.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
