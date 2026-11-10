import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserProfile, ParentStudentLink } from '../../types';
import {
  ShieldCheck,
  UserX,
  Clock,
  CheckCircle2,
  Users,
  AlertCircle,
  RefreshCw,
  UserCheck,
  Phone,
  Mail,
} from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';

export const StudentManagementPage: React.FC = () => {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [parentLinks, setParentLinks] = useState<ParentStudentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'parent_verifications'>('pending');

  useEffect(() => {
    fetchStudents();
    fetchParentLinks();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'STUDENT')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped: UserProfile[] = data.map(d => ({
          id: d.id,
          fullName: d.full_name || 'Student',
          email: d.email,
          role: 'STUDENT',
          studentId: d.student_id || d.roll_number || 'N/A',
          department: d.department || 'N/A',
          year: d.year || '',
          section: d.section || '',
          isApproved: d.is_approved ?? false,
          approvalStatus: d.approval_status || (d.is_approved ? 'APPROVED' : 'PENDING'),
          lastLogin: d.last_login,
          createdAt: d.created_at,
        }));
        setStudents(mapped);
      }
    } catch (err: any) {
      console.error('Error fetching students:', err);
      setErrorMsg(err.message || 'Failed to load students from database.');
    } finally {
      setLoading(false);
    }
  };

  const fetchParentLinks = async () => {
    setLoadingLinks(true);
    try {
      const { data, error } = await supabase
        .from('parent_student_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not be queried if migration pending
        console.warn('Parent links fetch status:', error.message);
        setParentLinks([]);
        return;
      }

      if (data && data.length > 0) {
        const parentIds = [...new Set(data.map(d => d.parent_id))];
        const studentIds = [...new Set(data.map(d => d.student_id))];
        const allIds = [...new Set([...parentIds, ...studentIds])];

        const profileMap = new Map<string, any>();
        if (allIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, student_id, department, year')
            .in('id', allIds);
          if (profs) profs.forEach(p => profileMap.set(p.id, p));
        }

        const mapped: ParentStudentLink[] = data.map(d => {
          const parent = profileMap.get(d.parent_id);
          const student = profileMap.get(d.student_id);
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
            parentName: parent?.full_name || 'Parent',
            parentEmail: parent?.email || '',
            parentPhone: parent?.phone || 'N/A',
            studentName: student?.full_name || 'Student on file',
            studentDepartment: student?.department || 'N/A',
            studentYear: student?.year || '',
          };
        });

        setParentLinks(mapped);
      } else {
        setParentLinks([]);
      }
    } catch (err: any) {
      console.warn('Error fetching parent links:', err);
    } finally {
      setLoadingLinks(false);
    }
  };

  const approveStudent = async (id: string, studentName: string) => {
    try {
      setActionFeedback(null);
      const { error } = await supabase
        .from('profiles')
        .update({
          is_approved: true,
          approval_status: 'APPROVED',
        })
        .eq('id', id);

      if (error) throw error;

      setActionFeedback({
        type: 'success',
        message: `Account for ${studentName} was approved successfully.`,
      });
      await fetchStudents();
    } catch (err: any) {
      console.error('Error approving student:', err);
      setActionFeedback({
        type: 'error',
        message: `Failed to approve student: ${err.message || 'Database error'}`,
      });
    }
  };

  const rejectStudent = async (id: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to reject the registration for ${studentName}?`)) {
      return;
    }

    try {
      setActionFeedback(null);
      const { error } = await supabase
        .from('profiles')
        .update({
          is_approved: false,
          approval_status: 'REJECTED',
        })
        .eq('id', id);

      if (error) throw error;

      setActionFeedback({
        type: 'success',
        message: `Registration for ${studentName} was rejected.`,
      });
      await fetchStudents();
    } catch (err: any) {
      console.error('Error rejecting student:', err);
      setActionFeedback({
        type: 'error',
        message: `Failed to reject student: ${err.message || 'Database error'}`,
      });
    }
  };

  const verifyParentLink = async (linkId: string, parentName: string, studentRoll: string) => {
    try {
      setActionFeedback(null);
      const { error } = await supabase
        .from('parent_student_links')
        .update({
          verification_status: 'VERIFIED',
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', linkId);

      if (error) throw error;

      setActionFeedback({
        type: 'success',
        message: `Successfully verified link between ${parentName} and student (${studentRoll}).`,
      });
      await fetchParentLinks();
    } catch (err: any) {
      console.error('Error verifying parent link:', err);
      setActionFeedback({
        type: 'error',
        message: `Failed to verify parent link: ${err.message || 'Database error'}`,
      });
    }
  };

  const rejectParentLink = async (linkId: string, parentName: string, studentRoll: string) => {
    if (!window.confirm(`Are you sure you want to reject the link request between ${parentName} and student (${studentRoll})?`)) {
      return;
    }

    try {
      setActionFeedback(null);
      const { error } = await supabase
        .from('parent_student_links')
        .update({
          verification_status: 'REJECTED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', linkId);

      if (error) throw error;

      setActionFeedback({
        type: 'success',
        message: `Link request between ${parentName} and student (${studentRoll}) was rejected.`,
      });
      await fetchParentLinks();
    } catch (err: any) {
      console.error('Error rejecting parent link:', err);
      setActionFeedback({
        type: 'error',
        message: `Failed to reject parent link: ${err.message || 'Database error'}`,
      });
    }
  };

  const pendingStudents = students.filter(
    s => s.approvalStatus === 'PENDING' || (!s.isApproved && s.approvalStatus !== 'REJECTED')
  );
  const approvedStudents = students.filter(
    s => s.isApproved === true || s.approvalStatus === 'APPROVED'
  );
  const rejectedStudents = students.filter(
    s => s.approvalStatus === 'REJECTED'
  );

  const pendingLinks = parentLinks.filter(l => l.verificationStatus === 'PENDING_VERIFICATION');
  const verifiedLinks = parentLinks.filter(l => l.verificationStatus === 'VERIFIED');
  const rejectedLinks = parentLinks.filter(l => l.verificationStatus === 'REJECTED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student & Parent Account Governance</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review student registrations, verify official parent-student linkages, and monitor active sessions.
          </p>
        </div>
        <button
          onClick={() => {
            fetchStudents();
            fetchParentLinks();
          }}
          disabled={loading || loadingLinks}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingLinks ? 'animate-spin' : ''}`} />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Action Feedback Alerts */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{actionFeedback.message}</span>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Pending Approvals ({pendingStudents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('parent_verifications')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'parent_verifications'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Parent Verifications ({pendingLinks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'approved'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Students ({approvedStudents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'rejected'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>Rejected Students ({rejectedStudents.length})</span>
        </button>
      </div>

      {/* Tab Panel: Parent Verifications */}
      {activeTab === 'parent_verifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Authorized Parent-Student Link Verification Queue
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {pendingLinks.length} Pending
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {verifiedLinks.length} Verified
                </span>
                <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {rejectedLinks.length} Rejected
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Verify parent identities against official college admission records before granting ward access.
              </p>
            </div>
          </div>

          <div className="p-0">
            {loadingLinks ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading parent verification queue...</div>
            ) : parentLinks.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Parent Link Requests"
                  description="Parent requests to link with student roll numbers will appear here for verification."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="px-6 py-3 font-semibold">Parent Details</th>
                      <th className="px-6 py-3 font-semibold">Requested Student</th>
                      <th className="px-6 py-3 font-semibold">Department & Year</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold text-right">Verification Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parentLinks.map(link => (
                      <tr key={link.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-xs">
                          <p className="font-semibold text-slate-900">{link.parentName}</p>
                          <div className="text-[11px] text-slate-500 space-y-0.5 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" /> {link.parentEmail}
                            </span>
                            {link.parentPhone && link.parentPhone !== 'N/A' && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" /> {link.parentPhone}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-xs">
                          <p className="font-semibold text-slate-900">{link.studentName}</p>
                          <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px] font-bold inline-block mt-0.5">
                            {link.studentRollNumber}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-600">
                          {link.studentDepartment} {link.studentYear ? `• ${link.studentYear}` : ''}
                        </td>

                        <td className="px-6 py-4 text-xs">
                          {link.verificationStatus === 'PENDING_VERIFICATION' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Pending Verification
                            </span>
                          )}
                          {link.verificationStatus === 'VERIFIED' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified Link
                            </span>
                          )}
                          {link.verificationStatus === 'REJECTED' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                              <UserX className="w-3 h-3" />
                              Rejected
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          {link.verificationStatus === 'PENDING_VERIFICATION' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => verifyParentLink(link.id, link.parentName || 'Parent', link.studentRollNumber)}
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                title="Confirm relationship and grant ward access"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verify & Link</span>
                              </button>
                              <button
                                onClick={() => rejectParentLink(link.id, link.parentName || 'Parent', link.studentRollNumber)}
                                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                title="Reject link request"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : link.verificationStatus === 'REJECTED' ? (
                            <button
                              onClick={() => verifyParentLink(link.id, link.parentName || 'Parent', link.studentRollNumber)}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Re-verify Link</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-semibold">Active Authorized Link</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Panel: Pending Student Approvals */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Pending Student Approvals ({pendingStudents.length})
            </h2>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading registrations...</div>
            ) : pendingStudents.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Pending Approvals"
                  description="All submitted student registrations have been reviewed."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="px-6 py-3 font-semibold">Student Name</th>
                      <th className="px-6 py-3 font-semibold">Roll Number</th>
                      <th className="px-6 py-3 font-semibold">Department & Year</th>
                      <th className="px-6 py-3 font-semibold">Email</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingStudents.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-xs font-semibold text-slate-900">{student.fullName}</td>
                        <td className="px-6 py-4 text-xs text-slate-600 font-mono font-bold">{student.studentId}</td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          {student.department} {student.year ? `• ${student.year}` : ''}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 truncate max-w-xs">{student.email}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => approveStudent(student.id, student.fullName)}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Approve student access"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => rejectStudent(student.id, student.fullName)}
                              className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Reject registration"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Panel: Active Students */}
      {activeTab === 'approved' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Active Approved Students ({approvedStudents.length})
            </h2>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading approved accounts...</div>
            ) : approvedStudents.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Approved Students"
                  description="Approved student accounts will appear here once verified."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="px-6 py-3 font-semibold">Student Name</th>
                      <th className="px-6 py-3 font-semibold">Roll Number</th>
                      <th className="px-6 py-3 font-semibold">Department</th>
                      <th className="px-6 py-3 font-semibold">Email</th>
                      <th className="px-6 py-3 font-semibold text-right">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {approvedStudents.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-xs font-semibold text-slate-900">{student.fullName}</td>
                        <td className="px-6 py-4 text-xs text-slate-600 font-mono">{student.studentId}</td>
                        <td className="px-6 py-4 text-xs text-slate-600">{student.department}</td>
                        <td className="px-6 py-4 text-xs text-slate-500 truncate max-w-xs">{student.email}</td>
                        <td className="px-6 py-4 text-xs text-slate-500 text-right">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {student.lastLogin ? new Date(student.lastLogin).toLocaleString() : 'Never logged in'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Panel: Rejected Students */}
      {activeTab === 'rejected' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <UserX className="w-4 h-4 text-rose-600" />
              Rejected Student Registrations ({rejectedStudents.length})
            </h2>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading rejected accounts...</div>
            ) : rejectedStudents.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Rejected Registrations"
                  description="No registrations have been marked as rejected."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="px-6 py-3 font-semibold">Student Name</th>
                      <th className="px-6 py-3 font-semibold">Roll Number</th>
                      <th className="px-6 py-3 font-semibold">Department</th>
                      <th className="px-6 py-3 font-semibold">Email</th>
                      <th className="px-6 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rejectedStudents.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-xs font-semibold text-slate-900">{student.fullName}</td>
                        <td className="px-6 py-4 text-xs text-slate-600 font-mono">{student.studentId}</td>
                        <td className="px-6 py-4 text-xs text-slate-600">{student.department}</td>
                        <td className="px-6 py-4 text-xs text-slate-500 truncate max-w-xs">{student.email}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => approveStudent(student.id, student.fullName)}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                            title="Re-evaluate and approve"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Re-approve</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
