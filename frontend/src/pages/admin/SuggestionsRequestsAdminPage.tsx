import React, { useState } from 'react';
import { useCampusCare } from '../../context/CampusCareContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Lightbulb, Sparkles, ThumbsUp, Check, X, CheckCircle2 } from 'lucide-react';
import { SubmissionStatus } from '../../types';

export const SuggestionsRequestsAdminPage: React.FC = () => {
  const { submissions, updateSubmissionStatus } = useCampusCare();
  const [activeTab, setActiveTab] = useState<'suggestions' | 'requests'>('suggestions');

  const suggestions = submissions.filter(s => s.type === 'suggestion');
  const requests = submissions.filter(s => s.type === 'improvement_request');

  const list = activeTab === 'suggestions' ? suggestions : requests;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Suggestions & Facility Requests Governance</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review, evaluate, prioritize, and approve student-submitted suggestions and infrastructure upgrade requests.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'suggestions'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          <span>Student Suggestions ({suggestions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'requests'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Improvement Requests ({requests.length})</span>
        </button>
      </div>

      {/* Item List */}
      <div className="space-y-4">
        {list.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400">{item.id}</span>
                <StatusBadge status={item.status} size="sm" />
                <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-full">
                  {item.category}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-xs font-bold bg-amber-50 text-amber-800 rounded-full border border-amber-200 flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {item.supportCount} Student Upvotes
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900">{item.title}</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>

              {item.reason && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
                  <p><strong>Reason:</strong> {item.reason}</p>
                  {item.expectedBenefit && <p><strong>Expected Benefit:</strong> {item.expectedBenefit}</p>}
                </div>
              )}
            </div>

            {/* Admin Decision Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">Submitted by {item.studentName} ({item.studentDepartment || 'Student'})</span>

              <div className="flex items-center gap-2">
                {item.status !== 'Approved' && (
                  <button
                    onClick={() => updateSubmissionStatus(item.id, 'Approved', 'Approved by CMC for implementation.')}
                    className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Idea</span>
                  </button>
                )}

                {item.status !== 'Closed' && (
                  <button
                    onClick={() => updateSubmissionStatus(item.id, 'Closed', 'Reviewed by CMC - deferred for future budget cycles.')}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Defer / Close</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
