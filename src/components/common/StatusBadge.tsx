import React from 'react';
import { SubmissionStatus } from '../../types';

interface StatusBadgeProps {
  status: SubmissionStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (status) {
    case 'Submitted':
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'Under Review':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'Verified':
      colorClasses = 'bg-cyan-50 text-cyan-700 border-cyan-200';
      break;
    case 'Assigned':
      colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
      break;
    case 'In Progress':
      colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse';
      break;
    case 'Resolved':
    case 'Approved':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'Closed':
    case 'Rejected':
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-300';
      break;
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs font-medium'
      : size === 'lg'
      ? 'px-3.5 py-1 text-sm font-semibold'
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${colorClasses} ${sizeClasses} transition-all`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
      {status}
    </span>
  );
};
