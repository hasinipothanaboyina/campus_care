import React from 'react';
import { SubmissionStatus } from '../../types';
import { CheckCircle2, Clock, ShieldCheck, UserCheck, Wrench, CheckCheck } from 'lucide-react';

interface StatusTimelineProps {
  currentStatus: SubmissionStatus;
}

const STAGES: { status: SubmissionStatus; label: string; icon: any }[] = [
  { status: 'Submitted', label: 'Submitted', icon: Clock },
  { status: 'Under Review', label: 'Under Review', icon: Clock },
  { status: 'Verified', label: 'Verified', icon: ShieldCheck },
  { status: 'Assigned', label: 'Assigned', icon: UserCheck },
  { status: 'In Progress', label: 'In Progress', icon: Wrench },
  { status: 'Resolved', label: 'Resolved', icon: CheckCircle2 },
  { status: 'Closed', label: 'Closed', icon: CheckCheck },
];

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ currentStatus }) => {
  const getStageIndex = (st: SubmissionStatus) => {
    switch (st) {
      case 'Submitted': return 0;
      case 'Under Review': return 1;
      case 'Verified': return 2;
      case 'Assigned': return 3;
      case 'In Progress': return 4;
      case 'Resolved':
      case 'Approved': return 5;
      case 'Closed': return 6;
      case 'Rejected': return 1;
      default: return 0;
    }
  };

  const currentIndex = getStageIndex(currentStatus);

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Background track line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 z-0"></div>
        {/* Progress track line */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 transition-all duration-500 z-0"
          style={{ width: `${(currentIndex / (STAGES.length - 1)) * 100}%` }}
        ></div>

        {STAGES.map((stage, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = stage.icon;

          return (
            <div key={stage.status} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  isCurrent
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md scale-110'
                    : isCompleted
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-400 border-2 border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`mt-2 text-[11px] font-medium hidden sm:block ${
                  isCurrent ? 'text-indigo-900 font-bold' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
