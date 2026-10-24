import React, { useState, useEffect } from 'react';
import { useCampusCare } from '../../context/CampusCareContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Link } from 'react-router-dom';
import {
  Layers,
  AlertTriangle,
  Repeat,
  CheckCircle2,
  Clock,
  ThumbsUp,
  ArrowRight,
  TrendingUp,
  Sparkles,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Users,
  GraduationCap,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { submissions, recurringIssues, insights, refreshData, isLoadingData, updateSubmissionStatus } = useCampusCare();
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const totalCount = submissions.length;
  const parentCount = submissions.filter(
    s => s.studentName?.toLowerCase().includes('parent') || s.id.startsWith('CC-PAR') || s.title.startsWith('[Faculty Feedback]')
  ).length;
  const studentCount = totalCount - parentCount;

  const openCount = submissions.filter(
    s => s.status === 'Submitted' || s.status === 'Under Review' || s.status === 'Verified'
  ).length;
  const highPriorityCount = submissions.filter(
    s => (s.priority === 'Critical' || s.priority === 'High') && s.status !== 'Resolved' && s.status !== 'Closed'
  ).length;
  const inProgressCount = submissions.filter(
    s => s.status === 'Assigned' || s.status === 'In Progress'
  ).length;
  const resolvedCount = submissions.filter(
    s => s.status === 'Resolved' || s.status === 'Approved' || s.status === 'Closed'
  ).length;

  const topSupported = [...submissions]
    .filter(s => s.status !== 'Resolved' && s.status !== 'Closed')
    .sort((a, b) => b.supportCount - a.supportCount)
    .slice(0, 4);

  const recent = [...submissions].slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Admin Welcome Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            CMC Operations & Governance
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold">Campus Management Control Center</h1>
          <p className="text-slate-300 text-xs sm:text-sm">
            Review, verify, prioritize, assign, and resolve student & parent concerns backed by live Supabase database sync.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoadingData}
            className="px-3.5 py-2.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all flex items-center gap-2 border border-slate-700 shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing || isLoadingData ? 'animate-spin' : ''}`} />
            <span>{isRefreshing || isLoadingData ? 'Syncing...' : 'Sync Live DB'}</span>
          </button>
          <Link
            to="/admin/cmc-insights"
            className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>CMC Meeting Report</span>
          </Link>
          <Link
            to="/admin/priority-queue"
            className="px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Priority Queue</span>
          </Link>
        </div>
      </div>

      {/* Real DB Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Logged</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Total DB records</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Parent Reports</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-2">{parentCount}</div>
          <p className="text-[11px] text-purple-600 mt-1">Concerns & Feedback</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Open & Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{openCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Require verification</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>High / Critical</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">{highPriorityCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Immediate action</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>In Progress</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-2">{inProgressCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Assigned to team</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{resolvedCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Completed</p>
        </div>
      </div>

      {/* Intelligence & Recurring Alert Banners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recurring Issues Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Repeat className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-900">
                {recurringIssues.length} Recurring Concern Clusters Identified
              </h3>
              <Link to="/admin/recurring-issues" className="text-xs font-bold text-amber-800 hover:underline">
                View All →
              </Link>
            </div>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              {recurringIssues.length > 0
                ? `Multiple reports recorded for ${recurringIssues[0].title} with ${recurringIssues[0].totalSupports} student supports.`
                : 'No recurring issue clusters detected in the database.'}
            </p>
          </div>
        </div>

        {/* Intelligence Insight Highlight */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-indigo-900">Campus Intelligence Summary</h3>
            <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
              {insights[0]?.description || 'System continuously groups location trends and priority scores to assist decision making.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Admin Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* All Submissions Table Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Recent Campus Submissions</h2>
            <Link
              to="/admin/submissions"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Manage All Submissions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              title="No Campus Submissions Yet"
              description="No student concerns recorded in database."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {recent.map(item => {
                  const isParent = Boolean(
                    item.studentName?.toLowerCase().includes('parent') ||
                    item.id.startsWith('CC-PAR') ||
                    item.title.startsWith('[Faculty Feedback]')
                  );

                  return (
                    <div key={item.id} className="p-4 hover:bg-slate-50/50 transition-colors space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">{item.id}</span>
                          <StatusBadge status={item.status} size="sm" />
                          <PriorityBadge priority={item.priority} score={item.priorityScore} />
                          {isParent ? (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              👨‍👩‍👧 Parent Report
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                              🎓 Student: {item.studentRollNumber || 'Student'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400 font-medium">{new Date(item.createdAt).toLocaleDateString()}</span>
                          {item.status === 'Submitted' && (
                            <button
                              onClick={() => handleQuickVerify(item.id)}
                              className="px-2 py-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-all flex items-center gap-1"
                              title="Verify Concern"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>Verify</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {item.location}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-500">
                            By: {item.studentName || 'Campus User'}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-indigo-600">
                            <ThumbsUp className="w-3.5 h-3.5" /> {item.supportCount} Supports
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Top Supported Concerns Side Column */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Top Supported Student Concerns</h2>

          {topSupported.length === 0 ? (
            <EmptyState
              title="No Supported Concerns"
              description="Student concerns will rank here as upvotes are submitted."
            />
          ) : (
            <div className="space-y-3">
              {topSupported.map(item => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400">{item.id}</span>
                    <span className="px-2 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> {item.supportCount} Supports
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 leading-snug">{item.title}</h3>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>{item.location}</span>
                    <PriorityBadge priority={item.priority} showIcon={false} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
