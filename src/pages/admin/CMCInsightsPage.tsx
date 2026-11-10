import React from 'react';
import { useCampusCare } from '../../context/CampusCareContext';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Sparkles, Printer, FileText, CheckCircle2, AlertTriangle, Repeat, ThumbsUp, TrendingUp, Building2 } from 'lucide-react';

export const CMCInsightsPage: React.FC = () => {
  const { submissions, recurringIssues, insights } = useCampusCare();

  const handlePrint = () => {
    window.print();
  };

  const highPriority = submissions.filter(
    s => (s.priority === 'Critical' || s.priority === 'High') && s.status !== 'Resolved' && s.status !== 'Closed'
  );

  const topSupported = [...submissions]
    .filter(s => s.status !== 'Resolved' && s.status !== 'Closed')
    .sort((a, b) => b.supportCount - a.supportCount)
    .slice(0, 5);

  const resolvedRecent = submissions.filter(s => s.status === 'Resolved').slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header & Print Control */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
              Campus Management Cell (CMC) Executive Briefing
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            <span>CMC Meeting Intelligence & Insights Pack</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Organized, data-backed student concerns ready for presentation at physical CMC governance meetings.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-slate-600" />
          <span>Print CMC Agenda Brief</span>
        </button>
      </div>

      {/* Executive Summary Cards */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-300">Executive Summary for Agenda</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {insights.map(ins => (
            <div key={ins.id} className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-1">
              <span className="font-bold text-white block text-sm">{ins.title}</span>
              <p className="text-slate-300 leading-relaxed">{ins.description}</p>
              {ins.actionableSuggestion && (
                <p className="text-indigo-300 font-semibold pt-2 border-t border-slate-700/50">
                  💡 Recommendation: {ins.actionableSuggestion}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column Meeting Brief Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Highest Priority Unresolved Concerns */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Highest Priority Unresolved Concerns ({highPriority.length})</span>
            </h2>
          </div>

          <div className="space-y-3">
            {highPriority.map(item => (
              <div key={item.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900">{item.id}</span>
                  <PriorityBadge priority={item.priority} score={item.priorityScore} />
                </div>
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                  <span>Location: <strong>{item.location}</strong></span>
                  <span className="font-bold text-indigo-600">{item.supportCount} Student Supports</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Recurring Infrastructure Clusters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Repeat className="w-5 h-5 text-amber-600" />
              <span>Recurring Infrastructure Problem Clusters</span>
            </h2>
          </div>

          <div className="space-y-3">
            {recurringIssues.map(cluster => (
              <div key={cluster.id} className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900">{cluster.title}</span>
                  <span className="px-2 py-0.5 font-bold text-[10px] bg-amber-200 text-amber-900 rounded-full">
                    {cluster.totalReports} Related Reports
                  </span>
                </div>
                <p className="text-amber-800">
                  Multiple student reports logged for <strong>{cluster.location}</strong> with combined {cluster.totalSupports} student upvotes.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: Highly Supported Student Requests */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ThumbsUp className="w-5 h-5 text-indigo-600" />
          <span>Top Supported Student Requests for Decision</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topSupported.map(item => (
            <div key={item.id} className="p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-500">{item.id}</span>
                <span className="font-bold text-indigo-600 flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5" /> {item.supportCount} Upvotes
                </span>
              </div>
              <h3 className="font-bold text-slate-900">{item.title}</h3>
              <p className="text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
