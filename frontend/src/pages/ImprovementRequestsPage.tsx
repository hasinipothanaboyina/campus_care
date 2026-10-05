import React, { useState } from 'react';
import { useCampusCare } from '../context/CampusCareContext';
import { ImprovementCategory } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Sparkles, MapPin, ThumbsUp, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const IMPROVEMENT_CATEGORIES: ImprovementCategory[] = [
  'Water Facility',
  'Classroom Equipment',
  'Study Area',
  'Lighting & Power',
  'Accessibility',
  'Infrastructure',
  'Safety & Security',
  'Other',
];

export const ImprovementRequestsPage: React.FC = () => {
  const { submissions, createImprovementRequest, supportSubmission } = useCampusCare();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<ImprovementCategory>('Water Facility');
  const [reason, setReason] = useState('');
  const [expectedBenefit, setExpectedBenefit] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const improvementRequests = submissions.filter(s => s.type === 'improvement_request');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !location) return;

    setLoading(true);
    await createImprovementRequest({
      title,
      description,
      location,
      category,
      reason,
      expectedBenefit,
      imageUrl: imageUrl || undefined,
    });
    setLoading(false);
    setTitle('');
    setDescription('');
    setLocation('');
    setReason('');
    setExpectedBenefit('');
    setImageUrl('');
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-600" />
            <span>Campus Improvement Requests</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Request specific physical or technological facility upgrades (water purifiers, lighting, quiet zones, ramps).
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Cancel Form' : 'Request Facility Upgrade'}</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-slate-900">Request a Campus Facility Improvement</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Request Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Install UV Water Purifier in Science Block 3rd Floor"
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Specific Location *</label>
              <input
                type="text"
                required
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Science Block 3rd Floor Corridor"
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ImprovementCategory)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 bg-white"
              >
                {IMPROVEMENT_CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Image URL (Optional)</label>
              <input
                type="text"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Description *</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what facility upgrade is needed..."
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Request</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Over 200 students take labs here with no water point"
                className="w-full px-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Benefit</label>
              <input
                type="text"
                value={expectedBenefit}
                onChange={e => setExpectedBenefit(e.target.value)}
                placeholder="e.g. Saves study time between back-to-back classes"
                className="w-full px-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      )}

      {/* List */}
      <div className="space-y-4">
        {improvementRequests.map(req => {
          const hasSupported = user ? req.supportedUserIds.includes(user.id) : false;

          return (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400">{req.id}</span>
                  <StatusBadge status={req.status} size="sm" />
                  <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-cyan-50 text-cyan-800 rounded-full border border-cyan-200">
                    {req.category}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {req.location}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900">{req.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{req.description}</p>

              {(req.reason || req.expectedBenefit) && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                  {req.reason && <p><strong>Reason:</strong> {req.reason}</p>}
                  {req.expectedBenefit && <p><strong>Expected Benefit:</strong> {req.expectedBenefit}</p>}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Submitted by {req.studentName}</span>
                <button
                  onClick={() => supportSubmission(req.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all ${
                    hasSupported
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${hasSupported ? 'fill-current' : ''}`} />
                  <span>{req.supportCount} Supports</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
