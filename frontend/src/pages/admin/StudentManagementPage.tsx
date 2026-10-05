import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types';
import { ShieldCheck, UserX, Clock, CheckCircle2, Users } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';

export const StudentManagementPage: React.FC = () => {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'STUDENT')
        .order('created_at', { ascending: false });

      if (data && !error) {
        const mapped: UserProfile[] = data.map(d => ({
          id: d.id,
          fullName: d.full_name,
          email: d.email,
          role: 'STUDENT',
          studentId: d.student_id,
          department: d.department,
          year: d.year,
          section: d.section,
          isApproved: d.is_approved,
          lastLogin: d.last_login,
          createdAt: d.created_at,
        }));
        setStudents(mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approveStudent = async (id: string) => {
    try {
      await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
      fetchStudents(); // Refresh
    } catch (err) {
      console.error(err);
    }
  };

  const pendingStudents = students.filter(s => !s.isApproved);
  const approvedStudents = students.filter(s => s.isApproved);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Management</h1>
        <p className="text-xs text-slate-500 mt-1">Review new registrations and monitor student logins.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            Pending Approvals ({pendingStudents.length})
          </h2>
        </div>
        <div className="p-0">
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-500">Loading...</div>
          ) : pendingStudents.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No pending approvals" description="All student accounts have been approved." />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="px-6 py-3 font-semibold">Student Name</th>
                  <th className="px-6 py-3 font-semibold">Roll Number</th>
                  <th className="px-6 py-3 font-semibold">Department</th>
                  <th className="px-6 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-semibold text-slate-900">{student.fullName}</td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-mono">{student.studentId}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{student.department} - {student.year}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => approveStudent(student.id)}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Active Students ({approvedStudents.length})
          </h2>
        </div>
        <div className="p-0">
          {approvedStudents.length === 0 && !loading ? (
            <div className="p-6">
              <EmptyState title="No approved students" description="Approved students will appear here." />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="px-6 py-3 font-semibold">Student Name</th>
                  <th className="px-6 py-3 font-semibold">Roll Number</th>
                  <th className="px-6 py-3 font-semibold">Department</th>
                  <th className="px-6 py-3 font-semibold text-right">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {approvedStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-semibold text-slate-900">{student.fullName}</td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-mono">{student.studentId}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{student.department}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 text-right flex items-center justify-end gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {student.lastLogin ? new Date(student.lastLogin).toLocaleString() : 'Never logged in'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
