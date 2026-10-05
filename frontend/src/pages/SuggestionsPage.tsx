import React, { useState } from 'react';
import { useCampusCare } from '../context/CampusCareContext';
import { SuggestionCategory } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Lightbulb, ThumbsUp, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SUGGESTION_CATEGORIES: SuggestionCategory[] = [
  'Library',
  'Study spaces',
  'Campus facilities',
  'Student activities',
  'Digital services',
  'Sustainability',
  'Other',
];

export const SuggestionsPage: React.FC = () => {
  const { submissions, createSuggestion, supportSubmission } = useCampusCare();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SuggestionCategory>('Library');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestions = submissions.filter(s => s.type === 'suggestion');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setLoading(true);
    await createSuggestion({
      title,
      description,
      category,
      imageUrl: imageUrl || undefined,
    });
    setLoading(false);
    setTitle('');
    setDescription('');
    setImageUrl('');
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-amber-500" />
            <span>Campus Suggestions & Ideas</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Share ideas to enrich student life, academic spaces, sustainability, and campus facilities.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Cancel Form' : 'Submit New Suggestion'}</span>
        </button>
      </div>

      {/* Suggestion Form Modal / Collapsible */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-slate-900">Propose a Campus Improvement Idea</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Suggestion Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Install Solar-Powered Charging Benches near Student Union"
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as SuggestionCategory)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 bg-white"
              >
                {SUGGESTION_CATEGORIES.map(c => (
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Expected Impact *</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Explain how this suggestion benefits the campus community..."
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow"
          >
            {loading ? 'Submitting...' : 'Post Suggestion'}
          </button>
        </form>
      )}

      {/* Suggestion Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestions.map(sugg => {
          const hasSupported = user ? sugg.supportedUserIds.includes(user.id) : false;

          return (
            <div key={sugg.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 font-mono">{sugg.id}</span>
                  <StatusBadge status={sugg.status} size="sm" />
                </div>

                <h3 className="text-sm font-bold text-slate-900">{sugg.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{sugg.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                  {sugg.category}
                </span>

                <button
                  onClick={() => supportSubmission(sugg.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all ${
                    hasSupported
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${hasSupported ? 'fill-current' : ''}`} />
                  <span>{sugg.supportCount} Upvotes</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
