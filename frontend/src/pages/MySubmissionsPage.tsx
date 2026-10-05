import React, { useState } from 'react';
import { useCampusCare } from '../context/CampusCareContext';
import { useAuth } from '../context/AuthContext';
import { Submission, SubmissionStatus, SubmissionType } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { SubmissionDetailModal } from './SubmissionDetailModal';
import { Search, Filter, ThumbsUp, MapPin, ExternalLink, Calendar } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';

export const MySubmissionsPage: React.FC = () => {
  const { submissions, supportSubmission } = useCampusCare();
  const { user } = useAuth();

  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'issue' | 'suggestion' | 'improvement_request'>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const mySubmissions = submissions.filter(s => s.studentId === user?.id);

  const filtered = mySubmissions.filter(item => {
    if (activeTab !== 'all' && item.type !== activeTab) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchId = item.id.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchId || matchCat;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Submissions & Trackers</h1>
        <p className="text-xs text-slate-500 mt-1">
          Track real-time resolution progress for your reported issues, suggestions, and improvement requests.
        </p>
      </div>

      {/* Tabs & Search Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
          {[
            { id: 'all', label: 'All Submissions' },
            { id: 'issue', label: 'Issues' },
            { id: 'suggestion', label: 'Suggestions' },
            { id: 'improvement_request', label: 'Improvement Requests' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, ID, category, or keywords..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Status Select */}
          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Verified">Verified</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Approved">Approved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No Matching Submissions Found"
          description={search ? "No submissions match your search query." : "You haven't created any submissions in this view."}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const hasSupported = user ? item.supportedUserIds.includes(user.id) : false;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedSubmission(item)}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col sm:flex-row items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">{item.id}</span>
                    <StatusBadge status={item.status} size="sm" />
                    <PriorityBadge priority={item.priority} score={item.priorityScore} />
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-slate-100 text-slate-700 rounded">
                      {item.type.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{item.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {item.location}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div
                  className="sm:self-center flex items-center gap-2"
                  onClick={e => e.stopPropagation()}
                >
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

      {/* Detail Modal */}
      <SubmissionDetailModal
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
      />
    </div>
  );
};
