import React, { useState, useEffect } from 'react';
import { useCampusCare } from '../../context/CampusCareContext';
import { Submission, SubmissionStatus, Priority } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { SubmissionDetailModal } from '../SubmissionDetailModal';
import { Search, Filter, ShieldCheck, UserCheck, Wrench, CheckCircle2, Edit3, MapPin, X, RefreshCw, Users, GraduationCap } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';

export const AllSubmissionsPage: React.FC = () => {
  const { submissions, updateSubmissionStatus, assignSubmission, resolveSubmission, refreshData, isLoadingData } = useCampusCare();

  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [editingItem, setEditingItem] = useState<Submission | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [reporterFilter, setReporterFilter] = useState<'all' | 'students' | 'parents' | 'faculty'>('all');

  // Form states inside Action Modal
  const [newStatus, setNewStatus] = useState<SubmissionStatus>('Under Review');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedTeam, setAssignedTeam] = useState('Facilities Maintenance');
  const [internalNotes, setInternalNotes] = useState('');

  // Resolution Form states
  const [actionTaken, setActionTaken] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [beforeImg, setBeforeImg] = useState('');
  const [afterImg, setAfterImg] = useState('');

  useEffect(() => {
    refreshData();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleQuickVerify = async (id: string) => {
    await updateSubmissionStatus(id, 'Verified', 'Verified by CMC Admin. Queued for team assignment.');
  };

  const filtered = submissions.filter(s => {
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && s.priority !== priorityFilter) return false;

    const isParent = Boolean(
      s.studentName?.toLowerCase().includes('parent') ||
      s.id.startsWith('CC-PAR') ||
      s.title.startsWith('[Faculty Feedback]')
    );
    const isFacultyFeedback = Boolean(
      s.title.startsWith('[Faculty Feedback]') ||
      s.description?.includes('Faculty Feedback')
    );

    if (reporterFilter === 'parents' && !isParent) return false;
    if (reporterFilter === 'students' && isParent) return false;
    if (reporterFilter === 'faculty' && !isFacultyFeedback) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        (s.studentName && s.studentName.toLowerCase().includes(q)) ||
        (s.studentRollNumber && s.studentRollNumber.toLowerCase().includes(q)) ||
        (s.category && s.category.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenEdit = (sub: Submission) => {
    setEditingItem(sub);
    setNewStatus(sub.status);
    setAssignedTo(sub.assignedTo || '');
    setAssignedTeam(sub.assignedTeam || 'Facilities Maintenance');
    setInternalNotes(sub.internalNotes || '');
    if (sub.resolution) {
      setActionTaken(sub.resolution.actionTaken);
      setResponsiblePerson(sub.resolution.responsiblePerson);
      setBeforeImg(sub.resolution.beforeImageUrl || '');
      setAfterImg(sub.resolution.afterImageUrl || '');
    } else {
      setActionTaken('');
      setResponsiblePerson('');
      setBeforeImg(sub.imageUrl || '');
      setAfterImg('');
    }
  };

  const handleSaveAdminUpdates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      if (assignedTo || assignedTeam) {
        await assignSubmission(editingItem.id, assignedTo, assignedTeam);
      }

      if (newStatus === 'Resolved' && actionTaken) {
        await resolveSubmission(editingItem.id, {
          actionTaken,
          responsiblePerson: responsiblePerson || assignedTo || 'CMC Team',
          resolvedDate: new Date().toISOString(),
          notes: internalNotes,
          beforeImageUrl: beforeImg || undefined,
          afterImageUrl: afterImg || undefined,
        });
      } else if (newStatus !== editingItem.status || internalNotes !== editingItem.internalNotes) {
        await updateSubmissionStatus(editingItem.id, newStatus, internalNotes);
      }
    } catch (err) {
      console.error('Error saving admin updates:', err);
    } finally {
      setEditingItem(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Campus Submissions Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review, verify, assign responsibility, update status, and record resolutions for all student & parent submissions.
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing || isLoadingData}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm flex items-center gap-2 self-start sm:self-auto transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isRefreshing || isLoadingData ? 'animate-spin' : ''}`} />
          <span>{isRefreshing || isLoadingData ? 'Syncing...' : 'Sync with Database'}</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search title, roll, reporter..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Reporter Filter */}
          <div>
            <select
              value={reporterFilter}
              onChange={e => setReporterFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 bg-white font-medium text-slate-800"
            >
              <option value="all">All Sources (Students & Parents)</option>
              <option value="students">🎓 Student Reports Only</option>
              <option value="parents">👨‍👩‍👧 Parent Concerns Only</option>
              <option value="faculty">👨‍🏫 Faculty Feedback</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 bg-white"
            >
              <option value="all">All Types</option>
              <option value="issue">Issues Only</option>
              <option value="suggestion">Suggestions Only</option>
              <option value="improvement_request">Improvement Requests Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="Submitted">Submitted (Needs Verification)</option>
              <option value="Under Review">Under Review</option>
              <option value="Verified">Verified</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 bg-white"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No Submissions Match Filters"
          description="Try clearing filters to view all recorded student and parent submissions."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="p-4">ID & Type</th>
                  <th className="p-4">Title & Location</th>
                  <th className="p-4">Reported By</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Assigned To</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(item => {
                  const isParent = Boolean(
                    item.studentName?.toLowerCase().includes('parent') ||
                    item.id.startsWith('CC-PAR') ||
                    item.title.startsWith('[Faculty Feedback]')
                  );

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-bold text-slate-900 block">{item.id}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{item.type.replace('_', ' ')}</span>
                      </td>

                      <td className="p-4 max-w-xs">
                        <span
                          onClick={() => setSelectedSubmission(item)}
                          className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer block truncate"
                        >
                          {item.title}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {item.location}
                        </span>
                      </td>

                      <td className="p-4 max-w-[200px]">
                        {isParent ? (
                          <div>
                            <span className="font-semibold text-purple-900 block truncate">{item.studentName}</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 mt-0.5">
                              👨‍👩‍👧 Parent {item.studentRollNumber ? `(Ward: ${item.studentRollNumber})` : ''}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold text-slate-900 block truncate">{item.studentName || 'Student'}</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 mt-0.5">
                              🎓 {item.studentRollNumber || 'Student'} {item.studentDepartment ? `• ${item.studentDepartment}` : ''}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-4 font-medium text-slate-700">{item.category}</td>

                      <td className="p-4">
                        <StatusBadge status={item.status} size="sm" />
                      </td>

                      <td className="p-4">
                        <PriorityBadge priority={item.priority} score={item.priorityScore} />
                      </td>

                      <td className="p-4 text-slate-600 font-medium">
                        {item.assignedTo || item.resolution?.responsiblePerson ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{item.assignedTo || item.resolution?.responsiblePerson}</span>
                            <span className="text-[10px] text-slate-400">{item.assignedTeam || (item.resolution ? 'Facilities Maintenance' : 'CMC Team')}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === 'Submitted' && (
                            <button
                              onClick={() => handleQuickVerify(item.id)}
                              className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all flex items-center gap-1"
                              title="Verify submission"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Manage</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal View */}
      <SubmissionDetailModal
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
      />

      {/* Admin Action / Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Manage Submission {editingItem.id}</h2>
                <p className="text-xs text-slate-500 truncate">{editingItem.title}</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdminUpdates} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Update Status</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as SubmissionStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Verified">Verified</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Approved">Approved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Department/Team</label>
                  <input
                    type="text"
                    value={assignedTeam}
                    onChange={e => setAssignedTeam(e.target.value)}
                    placeholder="e.g. IT & AV Support"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Maintenance Person</label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  placeholder="e.g. Marcus Vance (Chief AV Specialist)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Internal CMC Notes</label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  placeholder="Internal notes regarding parts ordered, technician schedule..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              {/* Resolution Section if marking as Resolved */}
              {newStatus === 'Resolved' && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Record Resolution Information</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-emerald-800 mb-1">Action Taken *</label>
                    <input
                      type="text"
                      required
                      value={actionTaken}
                      onChange={e => setActionTaken(e.target.value)}
                      placeholder="e.g. Replaced faulty transmitter and tested audio output."
                      className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-emerald-800 mb-1">Before Image URL</label>
                      <input
                        type="text"
                        value={beforeImg}
                        onChange={e => setBeforeImg(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-emerald-800 mb-1">After Image URL</label>
                      <input
                        type="text"
                        value={afterImg}
                        onChange={e => setAfterImg(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-slate-900 hover:bg-slate-800 font-bold rounded-xl shadow"
                >
                  Save Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
