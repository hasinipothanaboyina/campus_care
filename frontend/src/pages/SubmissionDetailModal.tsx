import React from 'react';
import { Submission } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusTimeline } from '../components/common/StatusTimeline';
import { X, MapPin, Calendar, User, ThumbsUp, Wrench, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';
import { useCampusCare } from '../context/CampusCareContext';
import { useAuth } from '../context/AuthContext';

interface SubmissionDetailModalProps {
  submission: Submission | null;
  onClose: () => void;
}

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({
  submission,
  onClose,
}) => {
  const { supportSubmission } = useCampusCare();
  const { user } = useAuth();

  if (!submission) return null;

  const hasSupported = user ? submission.supportedUserIds.includes(user.id) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {submission.id}
            </span>
            <StatusBadge status={submission.status} size="md" />
            <PriorityBadge priority={submission.priority} score={submission.priorityScore} />
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Title & Metadata */}
          <div>
            <span className="text-[11px] font-bold text-indigo-600 tracking-wider uppercase">
              {submission.type.replace('_', ' ')} • {submission.category}
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-1">{submission.title}</h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                {submission.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                {new Date(submission.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                {submission.studentName} ({submission.studentRollNumber || 'Student'})
              </span>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-bold text-slate-900 mb-2">Live Progress Tracker</p>
            <StatusTimeline currentStatus={submission.status} />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Description</h3>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {submission.description}
            </p>
          </div>

          {/* Reason & Expected Benefit if improvement request */}
          {(submission.reason || submission.expectedBenefit) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {submission.reason && (
                <div className="p-3 bg-cyan-50/60 rounded-xl border border-cyan-100 text-xs">
                  <span className="font-bold text-cyan-900 block mb-1">Reason for Request:</span>
                  <p className="text-cyan-800">{submission.reason}</p>
                </div>
              )}
              {submission.expectedBenefit && (
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs">
                  <span className="font-bold text-emerald-900 block mb-1">Expected Benefit:</span>
                  <p className="text-emerald-800">{submission.expectedBenefit}</p>
                </div>
              )}
            </div>
          )}

          {/* Evidence Image */}
          {submission.imageUrl && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Attached Evidence</h3>
              <img
                src={submission.imageUrl}
                alt="Evidence"
                className="w-full max-h-64 object-cover rounded-xl border border-slate-200"
              />
            </div>
          )}

          {/* Assignment Information */}
          {(submission.assignedTo || submission.assignedTeam) && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-purple-900">Assigned Maintenance Handler</span>
                  <p className="text-purple-800 mt-0.5">
                    {submission.assignedTo} ({submission.assignedTeam || 'CMC Team'})
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Resolution Record Summary (Before/After) */}
          {submission.resolution && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Resolution Summary</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-bold text-emerald-900">Action Taken:</span>
                  <p className="text-emerald-800 mt-1">{submission.resolution.actionTaken}</p>
                </div>
                <div>
                  <span className="font-bold text-emerald-900">Resolved By:</span>
                  <p className="text-emerald-800 mt-1">{submission.resolution.responsiblePerson}</p>
                </div>
              </div>

              {/* Before / After Evidence Images Comparison */}
              {(submission.resolution.beforeImageUrl || submission.resolution.afterImageUrl) && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {submission.resolution.beforeImageUrl && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Before Repair</span>
                      <img
                        src={submission.resolution.beforeImageUrl}
                        alt="Before repair"
                        className="w-full h-32 object-cover rounded-lg border border-slate-300"
                      />
                    </div>
                  )}
                  {submission.resolution.afterImageUrl && (
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">After Repair</span>
                      <img
                        src={submission.resolution.afterImageUrl}
                        alt="After repair"
                        className="w-full h-32 object-cover rounded-lg border border-emerald-300"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => supportSubmission(submission.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all ${
              hasSupported
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${hasSupported ? 'fill-current' : ''}`} />
            <span>{submission.supportCount} Student Supports</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
