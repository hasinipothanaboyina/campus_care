import React, { useState } from 'react';
import { useCampusCare } from '../../context/CampusCareContext';
import { CheckCircle2, Wrench, Image, Calendar, User, Search } from 'lucide-react';

export const ResolutionManagementPage: React.FC = () => {
  const { submissions, resolveSubmission } = useCampusCare();

  const [selectedId, setSelectedId] = useState<string>('');
  const [actionTaken, setActionTaken] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [beforeImage, setBeforeImage] = useState('');
  const [afterImage, setAfterImage] = useState('');
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const openSubmissions = submissions.filter(s => s.status !== 'Resolved' && s.status !== 'Closed');
  const resolvedSubmissions = submissions.filter(s => s.status === 'Resolved');

  const handleSelectSubmission = (id: string) => {
    setSelectedId(id);
    const item = submissions.find(s => s.id === id);
    if (item) {
      setBeforeImage(item.imageUrl || '');
    }
  };

  const handleSubmitResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !actionTaken || !responsiblePerson) {
      alert('Please select a submission and fill in action taken and responsible person.');
      return;
    }

    resolveSubmission(selectedId, {
      actionTaken,
      responsiblePerson,
      resolvedDate: new Date().toISOString(),
      notes,
      beforeImageUrl: beforeImage || undefined,
      afterImageUrl: afterImage || undefined,
    });

    setSuccessMsg(`Resolution successfully recorded for ${selectedId}!`);
    setSelectedId('');
    setActionTaken('');
    setResponsiblePerson('');
    setBeforeImage('');
    setAfterImage('');
    setNotes('');

    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          <span>Resolution Management & Evidence Records</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Record completed repair work, responsible maintenance personnel, and upload Before/After evidence images.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2 Columns: Form & History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Record Form */}
        <form onSubmit={handleSubmitResolution} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Record New Resolution</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Unresolved Concern *</label>
            <select
              value={selectedId}
              onChange={e => handleSelectSubmission(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 bg-white"
            >
              <option value="">-- Choose an open issue or request --</option>
              {openSubmissions.map(item => (
                <option key={item.id} value={item.id}>
                  {item.id} - {item.title} ({item.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Action Taken *</label>
            <textarea
              rows={3}
              required
              value={actionTaken}
              onChange={e => setActionTaken(e.target.value)}
              placeholder="e.g. Replaced burnt HDMI cable module and re-mounted projector unit."
              className="w-full px-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Responsible Engineer / Team *</label>
            <input
              type="text"
              required
              value={responsiblePerson}
              onChange={e => setResponsiblePerson(e.target.value)}
              placeholder="e.g. Marcus Vance (Chief AV Technician)"
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Before Image URL</label>
              <input
                type="text"
                value={beforeImage}
                onChange={e => setBeforeImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">After Image URL</label>
              <input
                type="text"
                value={afterImage}
                onChange={e => setAfterImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Notes</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Warranty registration renewed."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Complete & Publish Resolution</span>
          </button>
        </form>

        {/* Resolved Showcase */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Recently Resolved Concerns ({resolvedSubmissions.length})</h2>

          <div className="space-y-4">
            {resolvedSubmissions.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded">
                    {item.id} • RESOLVED
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {item.resolution ? new Date(item.resolution.resolvedDate).toLocaleDateString() : ''}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>

                {item.resolution && (
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs space-y-2">
                    <p><strong>Action Taken:</strong> {item.resolution.actionTaken}</p>
                    <p><strong>Resolved By:</strong> {item.resolution.responsiblePerson}</p>

                    {(item.resolution.beforeImageUrl || item.resolution.afterImageUrl) && (
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {item.resolution.beforeImageUrl && (
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block mb-1">BEFORE</span>
                            <img src={item.resolution.beforeImageUrl} alt="Before" className="w-full h-24 object-cover rounded-lg border" />
                          </div>
                        )}
                        {item.resolution.afterImageUrl && (
                          <div>
                            <span className="text-[10px] font-bold text-emerald-700 block mb-1">AFTER</span>
                            <img src={item.resolution.afterImageUrl} alt="After" className="w-full h-24 object-cover rounded-lg border border-emerald-300" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
