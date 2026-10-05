import React from 'react';
import { useCampusCare } from '../../context/CampusCareContext';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { AlertTriangle, ThumbsUp, Clock, ShieldCheck, MapPin, Info } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';

export const PriorityQueuePage: React.FC = () => {
  const { submissions, updateSubmissionStatus } = useCampusCare();

  // Active Unresolved Submissions sorted by rule-based priority score descending
  const priorityQueue = [...submissions]
    .filter(s => s.status !== 'Resolved' && s.status !== 'Closed')
    .sort((a, b) => b.priorityScore - a.priorityScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-rose-600" />
          <span>Transparent Priority Queue</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Automated rule-based prioritization calculated using: <strong>Urgency Level + Student Supports + Similar Report Frequency + Issue Age</strong>.
        </p>
      </div>

      {/* Formula Explanation Card */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md text-xs space-y-2">
        <div className="font-bold flex items-center gap-1.5 text-indigo-300">
          <Info className="w-4 h-4" />
          <span>Priority Scoring Formula (Rule-Based Algorithm)</span>
        </div>
        <p className="text-slate-300 leading-relaxed font-mono">
          Score = (Urgency: Critical=100 / High=70 / Med=40) + (Supports × 15) + (Recurring Reports × 25) + (Days Open × 5)
        </p>
        <div className="flex flex-wrap gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
          <span>Critical: ≥120 pts</span>
          <span>High: ≥80 pts</span>
          <span>Medium: ≥45 pts</span>
          <span>Low: &lt;45 pts</span>
        </div>
      </div>

      {/* Priority Queue List */}
      {priorityQueue.length === 0 ? (
        <EmptyState
          title="Priority Queue Clear"
          description="All submitted concerns have been resolved or verified."
        />
      ) : (
        <div className="space-y-4">
          {priorityQueue.map((item, index) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm space-y-3 transition-all ${
                item.priority === 'Critical'
                  ? 'border-rose-300 bg-rose-50/20'
                  : item.priority === 'High'
                  ? 'border-orange-200'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                    #{index + 1}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">{item.id}</span>
                  <PriorityBadge priority={item.priority} score={item.priorityScore} />
                  <StatusBadge status={item.status} size="sm" />
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {item.supportCount} Supports
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {item.location}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">
                    Age: {Math.max(0, Math.floor((new Date().getTime() - new Date(item.createdAt).getTime()) / (1000 * 3600 * 24)))} days
                  </span>

                  {item.status === 'Submitted' && (
                    <button
                      onClick={() => updateSubmissionStatus(item.id, 'Verified')}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow"
                    >
                      Verify Concern
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
