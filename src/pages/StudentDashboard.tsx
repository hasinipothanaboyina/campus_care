import React, { useState, useEffect } from 'react';
import { useCampusCare } from '../context/CampusCareContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { EmptyState } from '../components/common/EmptyState';
import { SubmissionDetailModal } from './SubmissionDetailModal';
import { Submission } from '../types';
import {
  AlertCircle,
  Lightbulb,
  Sparkles,
  ThumbsUp,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Bell,
  MapPin,
  ChevronRight,
  GraduationCap,
  Search,
  Filter,
  Wrench,
  CheckCheck,
  Building2,
  ShieldCheck,
  Eye,
  RefreshCw,
  User,
  Zap,
  Droplet,
  Wifi,
  Bus,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { submissions, notifications, supportSubmission, refreshData, markNotificationRead } = useCampusCare();

  // Selected Submission for Detailed Modal
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Active Tab: My Submissions vs Campus Community Feed
  const [activeTab, setActiveTab] = useState<'my_reports' | 'community'>('my_reports');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'issue' | 'suggestion' | 'improvement_request'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  // My Submissions - matching student ID or verified roll number
  const mySubmissions = submissions.filter(
    s => s.studentId === user?.id || (user?.studentId && s.studentRollNumber === user.studentId)
  );

  // Metrics based on student's own reports
  const totalCount = mySubmissions.length;
  const openCount = mySubmissions.filter(
    s => s.status === 'Submitted' || s.status === 'Under Review' || s.status === 'Verified'
  ).length;
  const inProgressCount = mySubmissions.filter(
    s => s.status === 'Assigned' || s.status === 'In Progress'
  ).length;
  const resolvedCount = mySubmissions.filter(
    s => s.status === 'Resolved' || s.status === 'Approved' || s.status === 'Closed'
  ).length;

  // Filtered My Submissions
  const filteredMySubmissions = mySubmissions.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchId = item.id.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchLoc = item.location ? item.location.toLowerCase().includes(q) : false;
      return matchTitle || matchDesc || matchId || matchCat || matchLoc;
    }
    return true;
  });

  // Community Feed (Public suggestions and improvements)
  const communitySubmissions = submissions
    .filter(s => s.type === 'suggestion' || s.type === 'improvement_request' || s.studentId === user?.id)
    .slice(0, 10);

  // Notifications for this student
  const myNotifications = notifications.filter(n => n.userId === user?.id).slice(0, 5);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-8">
      {/* 1. Student Profile & Welcome Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle Background Accent */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Student Profile Details */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg border border-indigo-400/30 shrink-0">
              {user?.fullName?.charAt(0) || 'S'}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Student Portal
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCheck className="w-3 h-3 text-emerald-400" />
                  <span>Approved Account</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {user?.fullName || 'Student'}
              </h1>
              {/* Profile Credentials Row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 font-medium">
                <span className="font-mono text-indigo-300 font-bold bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  Roll: {user?.studentId || 'N/A'}
                </span>
                <span>•</span>
                <span>{user?.department || 'Department'}</span>
                {user?.year && (
                  <>
                    <span>•</span>
                    <span>{user.year}</span>
                  </>
                )}
                {user?.section && (
                  <>
                    <span>•</span>
                    <span>Sec {user.section}</span>
                  </>
                )}
                <span>•</span>
                <span className="text-slate-400">SRGEC Autonomous</span>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Hub */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <Link
              to="/report-issue"
              className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </Link>
            <Link
              to="/suggestions"
              className="px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur transition-all flex items-center gap-1.5"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
              <span>Suggest Idea</span>
            </Link>
            <Link
              to="/improvement-requests"
              className="px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Facility Upgrade</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Real Stat Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Submissions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Submissions</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Total items submitted by you</p>
        </div>

        {/* Open & Under Review */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Under Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{openCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting CMC review & assignment</p>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Progress</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-2">{inProgressCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Assigned to maintenance teams</p>
        </div>

        {/* Resolved / Approved */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resolved</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{resolvedCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Successfully completed & closed</p>
        </div>
      </div>

      {/* 3. Main Dashboard Layout: Submissions Tracker + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Submissions Tracker Feed */}
        <div className="lg:col-span-2 space-y-5">
          {/* Feed Header & Tab Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('my_reports')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'my_reports'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>My Submissions ({mySubmissions.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('community')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'community'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Community Feed</span>
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                title="Refresh latest updates"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Filter & Search Bar for My Submissions */}
            {activeTab === 'my_reports' && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by title, ID, or category..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  >
                    <option value="all">All Types</option>
                    <option value="issue">Issues</option>
                    <option value="suggestion">Suggestions</option>
                    <option value="improvement_request">Improvements</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* TAB 1 CONTENT: MY SUBMISSIONS & TRACKERS */}
          {activeTab === 'my_reports' && (
            <div className="space-y-3">
              {filteredMySubmissions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                  <EmptyState
                    title={mySubmissions.length === 0 ? 'No Submissions Yet' : 'No Matching Submissions'}
                    description={
                      mySubmissions.length === 0
                        ? 'You have not submitted any campus reports or suggestions yet. Click below to voice your concern!'
                        : 'No submissions matched your search and filter criteria.'
                    }
                    actionLabel={mySubmissions.length === 0 ? 'Report an Issue' : undefined}
                    onAction={() => {}}
                  />
                </div>
              ) : (
                filteredMySubmissions.map(item => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      {/* Meta Pills */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {item.id}
                        </span>
                        <StatusBadge status={item.status} size="sm" />
                        <PriorityBadge priority={item.priority} score={item.priorityScore} />
                        <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {item.category}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {item.type.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.description}</p>

                      {/* Location & Assigned Team */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {item.location}
                        </span>
                        <span>•</span>
                        <span>Reported: {new Date(item.createdAt).toLocaleDateString()}</span>
                        {item.assignedTo && (
                          <>
                            <span>•</span>
                            <span className="text-purple-700 font-semibold flex items-center gap-1">
                              <Wrench className="w-3 h-3" />
                              Assigned: {item.assignedTo} {item.assignedTeam ? `(${item.assignedTeam})` : ''}
                            </span>
                          </>
                        )}
                        {item.resolution && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Resolution Available
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Track Progress Action Button */}
                    <div className="sm:self-center shrink-0">
                      <button
                        onClick={() => setSelectedSubmission(item)}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Track Progress</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2 CONTENT: CAMPUS COMMUNITY FEED */}
          {activeTab === 'community' && (
            <div className="space-y-3">
              {communitySubmissions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                  <EmptyState
                    title="No Community Suggestions Yet"
                    description="Be the first student to suggest a campus upgrade or share an improvement idea!"
                  />
                </div>
              ) : (
                communitySubmissions.map(item => {
                  const hasSupported = user ? item.supportedUserIds.includes(user.id) : false;

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400">{item.id}</span>
                          <StatusBadge status={item.status} size="sm" />
                          <PriorityBadge priority={item.priority} score={item.priorityScore} />
                          <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {item.category}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h3>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.description}</p>

                        <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {item.location}
                          </span>
                          <span>•</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Action Buttons: Support / Upvote + Details */}
                      <div className="sm:self-center flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => supportSubmission(item.id)}
                          className={`px-3.5 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all ${
                            hasSupported
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${hasSupported ? 'fill-current' : ''}`} />
                          <span>{item.supportCount} Supports</span>
                        </button>

                        <button
                          onClick={() => setSelectedSubmission(item)}
                          className="p-2 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                          title="View resolution details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Notifications Feed + Quick Directory */}
        <div className="space-y-6">
          {/* Notifications Side Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                <span>My Notifications</span>
              </h2>
              <Link
                to="/notifications"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                See all
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {myNotifications.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No notifications. You are all caught up!
                </div>
              ) : (
                myNotifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`py-3 first:pt-0 last:pb-0 space-y-1 cursor-pointer hover:bg-slate-50/80 p-2 rounded-xl transition-colors ${
                      !n.read ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${!n.read ? 'bg-indigo-600' : 'bg-slate-300'}`}></span>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pl-3.5">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Issue Reporting Category Directory */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Quick Issue Directory
            </h3>
            <p className="text-[11px] text-slate-500">
              Click a category to immediately start reporting a problem:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { label: 'Classrooms', icon: Building2, path: '/report-issue' },
                { label: 'Electrical', icon: Zap, path: '/report-issue' },
                { label: 'Water Supply', icon: Droplet, path: '/report-issue' },
                { label: 'Campus Wi-Fi', icon: Wifi, path: '/report-issue' },
                { label: 'Transport', icon: Bus, path: '/report-issue' },
                { label: 'Facilities', icon: Wrench, path: '/report-issue' },
              ].map(cat => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.label}
                    to={cat.path}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center gap-2 text-xs font-semibold text-slate-700"
                  >
                    <Icon className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="truncate">{cat.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Transparent Support Policy Information Card */}
          <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Priority Scoring System</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              When students upvote an issue, CampusCare increases its priority score. Critical and high-demand issues are automatically escalated to the Campus Management Cell (CMC) for prompt resolution.
            </p>
          </div>
        </div>
      </div>

      {/* Submission Detail Modal (Live Progress Tracker & Resolution Record) */}
      {selectedSubmission && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </div>
  );
};
