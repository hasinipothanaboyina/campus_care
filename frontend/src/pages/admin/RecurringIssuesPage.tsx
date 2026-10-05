import React from 'react';
import { useCampusCare } from '../../context/CampusCareContext';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Repeat, MapPin, ThumbsUp, Layers, Calendar, ChevronRight } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';

export const RecurringIssuesPage: React.FC = () => {
  const { recurringIssues } = useCampusCare();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Repeat className="w-6 h-6 text-amber-600" />
          <span>Recurring & Cluster Issue Identification</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          CampusCare intelligence automatically clusters duplicate and recurring reports in the same location to identify chronic infrastructure bottlenecks.
        </p>
      </div>

      {/* Recurring Clusters Feed */}
      {recurringIssues.length === 0 ? (
        <EmptyState
          title="No Recurring Issue Clusters Detected"
          description="Submissions are currently spread across distinct campus locations."
        />
      ) : (
        <div className="space-y-4">
          {recurringIssues.map(cluster => (
            <div key={cluster.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {cluster.id}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">{cluster.title}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <PriorityBadge priority={cluster.priority} />
                  <StatusBadge status={cluster.status} size="sm" />
                </div>
              </div>

              {/* Cluster Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Location</span>
                  <span className="font-bold text-slate-900">{cluster.building} {cluster.room}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Total Related Reports</span>
                  <span className="font-bold text-indigo-600">{cluster.totalReports} Student Reports</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Total Upvotes / Supports</span>
                  <span className="font-bold text-amber-600">{cluster.totalSupports} Supports</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Timeline</span>
                  <span className="font-bold text-slate-900">
                    {new Date(cluster.firstReportedAt).toLocaleDateString()} – {new Date(cluster.latestReportedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Related Submissions List */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Linked Student Reports ({cluster.relatedSubmissions.length})
                </p>

                <div className="space-y-2 divide-y divide-slate-100 border border-slate-100 rounded-xl p-3 bg-white">
                  {cluster.relatedSubmissions.map(sub => (
                    <div key={sub.id} className="pt-2 first:pt-0 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">{sub.id} • {sub.studentName}</span>
                        <StatusBadge status={sub.status} size="sm" />
                      </div>
                      <p className="text-slate-600">{sub.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
