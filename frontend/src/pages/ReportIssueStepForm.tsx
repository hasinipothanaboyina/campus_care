import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCampusCare } from '../context/CampusCareContext';
import { IssueCategory, Urgency, Submission } from '../types';
import {
  AlertCircle,
  Building2,
  MapPin,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  ThumbsUp,
  Layers,
} from 'lucide-react';

const CATEGORIES: { name: IssueCategory; desc: string; icon: string }[] = [
  { name: 'Classroom', desc: 'Desks, whiteboards, podiums, seating', icon: '🏫' },
  { name: 'Electrical', desc: 'Wiring, switches, power outlets, lights', icon: '⚡' },
  { name: 'Water', desc: 'Drinking fountains, plumbing, taps, restrooms', icon: '💧' },
  { name: 'Cleanliness', desc: 'Waste bins, washroom hygiene, floor sanitization', icon: '🧹' },
  { name: 'Internet / Network', desc: 'Campus Wi-Fi, Ethernet jacks, router offline', icon: '📶' },
  { name: 'Equipment', desc: 'Projectors, sound systems, lab instruments', icon: '🖥️' },
  { name: 'Infrastructure', desc: 'Doors, windows, air conditioning, ramps', icon: '🏢' },
  { name: 'Safety', desc: 'Fire extinguishers, dark walkways, hazards', icon: '🚨' },
  { name: 'Transport', desc: 'Campus shuttle, parking slots, bicycle racks', icon: '🚌' },
  { name: 'Other', desc: 'General campus facility issues', icon: '📦' },
];

export const ReportIssueStepForm: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const { createIssue, checkDuplicates, supportSubmission } = useCampusCare();
  const navigate = useNavigate();

  // Form State
  const [category, setCategory] = useState<IssueCategory>('Classroom');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('Medium');
  const [building, setBuilding] = useState('Block B');
  const [room, setRoom] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdSubmission, setCreatedSubmission] = useState<Submission | null>(null);

  // Duplicate detection
  const duplicates = checkDuplicates(category, building, room);

  const sampleImageOptions = [
    { label: 'Projector Issue', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80' },
    { label: 'Lighting Fixture', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80' },
    { label: 'Water Dispenser', url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80' },
  ];

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await createIssue({
        title,
        description,
        category,
        building,
        room,
        urgency,
        imageUrl: imageUrl || undefined,
      });
      setCreatedSubmission(res);
      setStep(6); // Step 6 Confirmation
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Report a Campus Issue</h1>
        <p className="text-xs text-slate-500 mt-1">
          Follow the step-by-step process to report broken equipment or campus facility problems.
        </p>
      </div>

      {/* Stepper Progress Bar */}
      {step <= 5 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span>Step {step} of 5</span>
            <span className="text-indigo-600">
              {step === 1 && '1. Select Category'}
              {step === 2 && '2. Issue Details'}
              {step === 3 && '3. Location & Duplicate Check'}
              {step === 4 && '4. Upload Evidence'}
              {step === 5 && '5. Review & Submit'}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-900 transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* STEP 1: CATEGORY */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Step 1: Select Issue Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setCategory(cat.name)}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  category === cat.name
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">{cat.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{cat.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-2"
            >
              <span>Next: Issue Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DETAILS */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Step 2: Enter Issue Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issue Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Projector HDMI Port Loose in Room 204"
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detailed Description *
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what is broken, how it affects classes, and any relevant details..."
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Urgency Level</label>
              <div className="grid grid-cols-4 gap-2">
                {(['Low', 'Medium', 'High', 'Critical'] as Urgency[]).map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUrgency(u)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      urgency === u
                        ? u === 'Critical'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : u === 'High'
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => {
                if (!title || !description) {
                  alert('Please enter a title and description.');
                  return;
                }
                setStep(3);
              }}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-2"
            >
              <span>Next: Location & Check</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: LOCATION & DUPLICATE CHECK */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Step 3: Select Location</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Building / Block *</label>
              <select
                value={building}
                onChange={e => setBuilding(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
              >
                <option value="Block B">Block B (Engineering)</option>
                <option value="Central Library">Central Library</option>
                <option value="Science Block">Science & Humanities Block</option>
                <option value="Main Administration">Main Admin Building</option>
                <option value="Auditorium">Main Auditorium</option>
                <option value="Student Amenities Center">Student Amenities Center</option>
                <option value="Sports Complex">Sports Complex & Gymnasium</option>
                <option value="West Campus Walkway">West Campus Walkway</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Room / Specific Spot</label>
              <input
                type="text"
                value={room}
                onChange={e => setRoom(e.target.value)}
                placeholder="e.g. Room 204 or 2nd Floor Restroom"
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Similar Concern / Duplicate Detection Alert Banner */}
          {duplicates.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Similar Concern Detected in {building} {room}!</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                Another student has already reported an issue in this location. You can support their report to increase its priority instead of creating a duplicate item!
              </p>
              <div className="space-y-2">
                {duplicates.map(dup => (
                  <div key={dup.id} className="p-3 bg-white rounded-lg border border-amber-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{dup.title}</span>
                      <p className="text-[11px] text-slate-500">{dup.supportCount} students supported this concern</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        supportSubmission(dup.id);
                        alert(`You supported ${dup.id}! Priority has been updated.`);
                        navigate('/dashboard');
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Support Instead</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-2"
            >
              <span>Next: Upload Evidence</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: EVIDENCE */}
      {step === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Step 4: Evidence Photo (Optional)</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Image URL</label>
            <input
              type="text"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Or select sample image preset:</p>
            <div className="grid grid-cols-3 gap-3">
              {sampleImageOptions.map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setImageUrl(opt.url)}
                  className={`p-2 border rounded-xl overflow-hidden text-left transition-all ${
                    imageUrl === opt.url ? 'border-indigo-600 ring-2 ring-indigo-600/20' : 'border-slate-200'
                  }`}
                >
                  <img src={opt.url} alt={opt.label} className="w-full h-16 object-cover rounded-lg mb-1" />
                  <span className="text-[10px] font-medium text-slate-700 block text-center truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(5)}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-2"
            >
              <span>Next: Review Submission</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW */}
      {step === 5 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Step 5: Review & Confirm Submission</h2>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 text-xs font-bold bg-indigo-100 text-indigo-800 rounded-full">
                {category}
              </span>
              <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                Urgency: {urgency}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{description}</p>

            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-200">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>Location: <strong>{building} {room && `- ${room}`}</strong></span>
            </div>

            {imageUrl && (
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Attached Photo:</p>
                <img src={imageUrl} alt="Evidence preview" className="w-48 h-28 object-cover rounded-xl border border-slate-200" />
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(4)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md flex items-center gap-2"
            >
              <span>{submitting ? 'Submitting to Database...' : 'Confirm & Submit Issue'}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: CONFIRMATION */}
      {step === 6 && createdSubmission && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="text-xl font-bold text-slate-900">Issue Submitted Successfully!</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Your issue has been logged with ID <strong className="font-mono text-indigo-600">{createdSubmission.id}</strong> and sent to the Campus Management Cell.
          </p>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-w-md mx-auto text-left text-xs space-y-1">
            <p><strong>Status:</strong> Submitted</p>
            <p><strong>Category:</strong> {createdSubmission.category}</p>
            <p><strong>Location:</strong> {createdSubmission.location}</p>
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => navigate('/my-reports')}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow"
            >
              Go to My Submissions
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
