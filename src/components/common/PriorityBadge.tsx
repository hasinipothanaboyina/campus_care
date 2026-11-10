import React from 'react';
import { Priority } from '../../types';
import { AlertCircle, AlertTriangle, Info, ArrowDown } from 'lucide-react';

interface PriorityBadgeProps {
  priority: Priority;
  score?: number;
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, score, showIcon = true }) => {
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let Icon = Info;

  switch (priority) {
    case 'Critical':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
      Icon = AlertCircle;
      break;
    case 'High':
      colorClasses = 'bg-orange-50 text-orange-700 border-orange-200 font-semibold';
      Icon = AlertTriangle;
      break;
    case 'Medium':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      Icon = Info;
      break;
    case 'Low':
      colorClasses = 'bg-slate-50 text-slate-600 border-slate-200';
      Icon = ArrowDown;
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border ${colorClasses}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>{priority}</span>
      {score !== undefined && (
        <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-white/70 border border-current/20 font-mono">
          {score} pts
        </span>
      )}
    </span>
  );
};
