import React from 'react';
import { useCampusCare } from '../context/CampusCareContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { EmptyState } from '../components/common/EmptyState';
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
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { submissions, notifications, supportSubmission } = useCampusCare();

  const mySubmissions = submissions.filter(s => s.studentId === user?.id);

  // Real database calculated metrics
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

  const recentSubmissions = [...submissions].slice(0, 5);
  const myNotifications = notifications.filter(n => n.userId === user?.id).slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Student Voice Active
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-3">
            Welcome back, {user?.fullName || 'Student'} 👋
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Report issues, suggest campus upgrades, or support your fellow students' concerns to improve our campus environment together.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              to="/report-issue"
              className="px-4 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Report an Issue</span>
            </Link>
            <Link
              to="/suggestions"
              className="px-4 py-2.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur transition-all flex items-center gap-2"
            >
              <Lightbulb className="w-4 h-4 text-amber-300" />
              <span>Give Suggestion</span>
            </Link>
            <Link
              to="/improvement-requests"
              className="px-4 py-2.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>Request Improvement</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Real Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">My Submissions</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Total items submitted by you</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Open & Under Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{openCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting review / verification</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">In Progress</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-2">{inProgressCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Assigned & actively being worked on</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Resolved / Approved</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{resolvedCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Successfully completed</p>
        </div>
      </div>

      {/* Main Grid: Campus Submissions + Notifications Side Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Campus Submissions (Supports + Status) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recent Campus Concerns</h2>
              <p className="text-xs text-slate-500">Support active concerns to raise priority score for CMC review.</p>
            </div>
            <Link
              to="/my-reports"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentSubmissions.length === 0 ? (
            <EmptyState
              title="No Submissions Yet"
              description="Be the first student to report an issue or suggest a campus improvement!"
              actionLabel="Report Issue"
              onAction={() => {}}
            />
          ) : (
            <div className="space-y-3">
              {recentSubmissions.map(item => {
                const hasSupported = user ? item.supportedUserIds.includes(user.id) : false;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start justify-between gap-4"
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
                      <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {item.location}
                        </span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Upvote / Support Button */}
                    <div className="sm:self-center flex items-center gap-2">
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications & Announcements Side Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
            <Link
              to="/notifications"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              See all
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 divide-y divide-slate-100">
            {myNotifications.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">No notifications.</div>
            ) : (
              myNotifications.map(n => (
                <div key={n.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-indigo-600" />
                      {n.title}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                </div>
              ))
            )}
          </div>

          {/* Platform Info Note */}
          <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>How Support System Works</span>
            </div>
            <p className="leading-relaxed">
              When multiple students support a concern, CampusCare automatically increases its priority score. This alerts the Campus Management Cell (CMC) to address high-demand issues faster.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
