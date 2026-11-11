import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  Trash2,
  Send,
  Lock,
  Unlock,
  BarChart3,
  Star,
  Users,
  Sparkles,
  HelpCircle,
  X,
  ChevronRight,
  Eye,
  Check,
  Layers,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  FeedbackForm,
  FeedbackQuestion,
  FeedbackFormStatus,
  FeedbackQuestionType,
  FeedbackStats,
  FeedbackResponse,
  FEEDBACK_TEMPLATES,
  getFeedbackForms,
  createFeedbackForm,
  updateFeedbackFormStatus,
  getFormResponsesAndStats,
} from '../../services/feedbackService';

export const AdminFeedbackManagementPage: React.FC = () => {
  const { user } = useAuth();

  // Data State
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'PUBLISHED' | 'DRAFT' | 'CLOSED'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Create / Edit Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [targetAudience, setTargetAudience] = useState('ALL_PARENTS');
  const [questions, setQuestions] = useState<{
    questionText: string;
    questionType: FeedbackQuestionType;
    options: string[];
    isRequired: boolean;
  }[]>([
    {
      questionText: '',
      questionType: 'rating',
      options: [],
      isRequired: true,
    },
  ]);

  // Analytics / Responses View Modal State
  const [selectedFormForAnalytics, setSelectedFormForAnalytics] = useState<FeedbackForm | null>(null);
  const [analyticsData, setAnalyticsData] = useState<{
    form: FeedbackForm;
    responses: FeedbackResponse[];
    stats: FeedbackStats;
  } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<'summary' | 'responses'>('summary');

  // Load All Forms
  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFeedbackForms('ADMIN');
      setForms(data);
    } catch (err: any) {
      console.error('Error loading feedback forms:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  // Auto-dismiss action message after 4s
  useEffect(() => {
    if (actionMsg) {
      const timer = setTimeout(() => setActionMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionMsg]);

  // Filtered Forms List
  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
      const matchesSearch =
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [forms, statusFilter, searchQuery]);

  // KPI Metrics
  const statsCounts = useMemo(() => {
    const published = forms.filter(f => f.status === 'PUBLISHED').length;
    const drafts = forms.filter(f => f.status === 'DRAFT').length;
    const closed = forms.filter(f => f.status === 'CLOSED').length;
    const totalResponses = forms.reduce((acc, f) => acc + (f.responseCount || 0), 0);
    return { published, drafts, closed, totalResponses };
  }, [forms]);

  // Handle Quick Template Loading
  const handleLoadTemplate = (tplIndex: number) => {
    const tpl = FEEDBACK_TEMPLATES[tplIndex];
    if (!tpl) return;
    setFormTitle(tpl.title);
    setFormDesc(tpl.description);
    setQuestions(
      tpl.questions.map(q => ({
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options ? [...q.options] : [],
        isRequired: q.isRequired,
      }))
    );
  };

  // Add Question to Builder
  const handleAddQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        questionText: '',
        questionType: 'rating',
        options: [],
        isRequired: true,
      },
    ]);
  };

  // Remove Question
  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  // Add Option to Multiple Choice
  const handleAddOption = (qIdx: number) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[qIdx].options = [...copy[qIdx].options, `Option ${copy[qIdx].options.length + 1}`];
      return copy;
    });
  };

  // Update Option text
  const handleUpdateOption = (qIdx: number, optIdx: number, val: string) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[qIdx].options[optIdx] = val;
      return copy;
    });
  };

  // Remove Option
  const handleRemoveOption = (qIdx: number, optIdx: number) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[qIdx].options = copy[qIdx].options.filter((_, i) => i !== optIdx);
      return copy;
    });
  };

  // Reset Create Form
  const resetCreateForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormDeadline('');
    setTargetAudience('ALL_PARENTS');
    setQuestions([
      {
        questionText: '',
        questionType: 'rating',
        options: [],
        isRequired: true,
      },
    ]);
    setShowCreateModal(false);
  };

  // Submit New Form (Draft or Publish)
  const handleSaveForm = async (publishImmediately: boolean) => {
    if (!formTitle.trim()) {
      setActionMsg({ text: 'Please enter a feedback form title.', type: 'error' });
      return;
    }
    const emptyQuestions = questions.some(q => !q.questionText.trim());
    if (emptyQuestions) {
      setActionMsg({ text: 'Please ensure every question has a question prompt.', type: 'error' });
      return;
    }

    setSubmittingForm(true);
    setActionMsg(null);
    try {
      const res = await createFeedbackForm({
        title: formTitle,
        description: formDesc,
        deadline: formDeadline || null,
        targetAudience,
        publishImmediately,
        adminId: user?.id,
        questions,
      });

      if (res.success) {
        setActionMsg({
          text: publishImmediately
            ? 'Feedback form published successfully! Notification broadcast to all parent accounts.'
            : 'Feedback form saved as Draft.',
          type: 'success',
        });
        resetCreateForm();
        loadForms();
      } else {
        setActionMsg({ text: res.error || 'Failed to save feedback form.', type: 'error' });
      }
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Error saving form.', type: 'error' });
    } finally {
      setSubmittingForm(false);
    }
  };

  // Status Change (Publish / Close / Reopen)
  const handleStatusChange = async (form: FeedbackForm, newStatus: FeedbackFormStatus) => {
    try {
      const res = await updateFeedbackFormStatus(form.id, newStatus);
      if (res.success) {
        setActionMsg({
          text:
            newStatus === 'PUBLISHED'
              ? `"${form.title}" published! Parents notified.`
              : newStatus === 'CLOSED'
              ? `"${form.title}" closed for submissions.`
              : `Status updated to ${newStatus}.`,
          type: 'success',
        });
        loadForms();
      } else {
        setActionMsg({ text: res.error || 'Failed to update form status.', type: 'error' });
      }
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Error updating status.', type: 'error' });
    }
  };

  // Open Analytics / Responses Modal
  const handleOpenAnalytics = async (form: FeedbackForm) => {
    setSelectedFormForAnalytics(form);
    setLoadingAnalytics(true);
    setAnalyticsTab('summary');
    try {
      const data = await getFormResponsesAndStats(form.id);
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Notification Banner */}
      {actionMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-sm transition-all ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header with Title & Primary Action */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">College Feedback Management</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Publish institutional feedback forms to gather parent perspectives on campus infrastructure, safety,
              hostels, transport, and overall student welfare. Review real-time response analytics and satisfaction ratings.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadForms}
              disabled={loading}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              title="Refresh feedback forms"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Feedback Form</span>
            </button>
          </div>
        </div>

        {/* KPI Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Forms</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{forms.length}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
            <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">Active / Published</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{statsCounts.published}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100">
            <p className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">Draft Forms</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{statsCounts.drafts}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100">
            <p className="text-[11px] font-medium text-indigo-700 uppercase tracking-wider">Parent Responses</p>
            <p className="text-xl font-bold text-indigo-700 mt-1">{statsCounts.totalResponses}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Forms ({forms.length})
          </button>
          <button
            onClick={() => setStatusFilter('PUBLISHED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'PUBLISHED'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Published ({statsCounts.published})
          </button>
          <button
            onClick={() => setStatusFilter('DRAFT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'DRAFT'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Drafts ({statsCounts.drafts})
          </button>
          <button
            onClick={() => setStatusFilter('CLOSED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'CLOSED'
                ? 'bg-white text-slate-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Closed ({statsCounts.closed})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search forms by topic..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-500">Loading college feedback forms...</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Feedback Forms Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No forms match "${searchQuery}". Try a different keyword.`
              : 'Create a new feedback form to start collecting parent opinions on college operations.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Form</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredForms.map(form => {
            const isPublished = form.status === 'PUBLISHED';
            const isDraft = form.status === 'DRAFT';
            const isClosed = form.status === 'CLOSED';

            return (
              <div
                key={form.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Status & Audience Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        isPublished
                          ? 'bg-emerald-100 text-emerald-700'
                          : isDraft
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {form.status}
                    </span>

                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{form.responseCount || 0} Responses</span>
                    </span>
                  </div>

                  {/* Form Title */}
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                    {form.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-3 leading-relaxed">
                    {form.description}
                  </p>

                  {/* Metadata: Questions Count & Deadline */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Layers className="w-3 h-3" />
                        <span>Questions:</span>
                      </span>
                      <span className="font-semibold text-slate-700">
                        {form.questions?.length || 0} items
                      </span>
                    </div>

                    {form.deadline && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3 h-3" />
                          <span>Deadline:</span>
                        </span>
                        <span className="font-semibold text-slate-700">
                          {new Date(form.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* View Responses / Stats */}
                  <button
                    onClick={() => handleOpenAnalytics(form)}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>View Analytics</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Draft -> Publish */}
                    {isDraft && (
                      <button
                        onClick={() => handleStatusChange(form, 'PUBLISHED')}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1 transition-colors"
                        title="Publish and notify all parents"
                      >
                        <Send className="w-3 h-3" />
                        <span>Publish</span>
                      </button>
                    )}

                    {/* Published -> Close */}
                    {isPublished && (
                      <button
                        onClick={() => handleStatusChange(form, 'CLOSED')}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1 transition-colors"
                        title="Close form for submissions"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Close</span>
                      </button>
                    )}

                    {/* Closed -> Re-open */}
                    {isClosed && (
                      <button
                        onClick={() => handleStatusChange(form, 'PUBLISHED')}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1 transition-colors"
                        title="Re-open form for parent submissions"
                      >
                        <Unlock className="w-3 h-3" />
                        <span>Re-open</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE NEW FORM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Create College Feedback Form</h2>
                  <p className="text-[11px] text-slate-500">
                    Draft a custom institutional survey or start from a pre-configured template.
                  </p>
                </div>
              </div>
              <button onClick={resetCreateForm} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Templates Selector */}
            <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Quick-Load Institutional Template:</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {FEEDBACK_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadTemplate(idx)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                  >
                    {tpl.category}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="mt-5 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Form Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Campus Cleanliness & Sanitation Feedback 2026"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Context
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the purpose of this feedback form and instructions for parents..."
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  >
                    <option value="ALL_PARENTS">All Verified Parents</option>
                    <option value="HOSTELLERS_PARENTS">Hostel Residents' Parents</option>
                    <option value="DAY_SCHOLARS_PARENTS">Day Scholars' Parents (Transport Users)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Submission Deadline (Optional)
                  </label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={e => setFormDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Questions Section */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Survey Questions ({questions.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {questions.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 relative space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-indigo-700">Question {qIdx + 1}</span>
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIdx)}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                            title="Remove Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Question Text */}
                      <input
                        type="text"
                        placeholder="Enter your question here..."
                        value={q.questionText}
                        onChange={e => {
                          const val = e.target.value;
                          setQuestions(prev => {
                            const copy = [...prev];
                            copy[qIdx].questionText = val;
                            return copy;
                          });
                        }}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />

                      {/* Question Type & Required */}
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">Type:</span>
                          <select
                            value={q.questionType}
                            onChange={e => {
                              const t = e.target.value as FeedbackQuestionType;
                              setQuestions(prev => {
                                const copy = [...prev];
                                copy[qIdx].questionType = t;
                                if (t === 'multiple_choice' && copy[qIdx].options.length === 0) {
                                  copy[qIdx].options = ['Satisfied', 'Neutral', 'Dissatisfied'];
                                }
                                return copy;
                              });
                            }}
                            className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                          >
                            <option value="rating">Rating (1 to 5 Stars)</option>
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="text">Text Response</option>
                          </select>
                        </div>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.isRequired}
                            onChange={e => {
                              const chk = e.target.checked;
                              setQuestions(prev => {
                                const copy = [...prev];
                                copy[qIdx].isRequired = chk;
                                return copy;
                              });
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-slate-600 font-medium text-[11px]">Required field</span>
                        </label>
                      </div>

                      {/* Options builder for multiple choice */}
                      {q.questionType === 'multiple_choice' && (
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <p className="text-[11px] font-semibold text-slate-600">Choice Options:</p>
                          <div className="space-y-1.5">
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={e => handleUpdateOption(qIdx, optIdx, e.target.value)}
                                  className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                                />
                                {q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(qIdx, optIdx)}
                                    className="text-slate-400 hover:text-rose-500"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddOption(qIdx)}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Option</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={resetCreateForm}
                disabled={submittingForm}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveForm(false)}
                disabled={submittingForm}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveForm(true)}
                disabled={submittingForm}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
              >
                {submittingForm ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish & Notify Parents</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS & RESPONSES MODAL */}
      {selectedFormForAnalytics && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedFormForAnalytics.status === 'PUBLISHED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedFormForAnalytics.status}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">{selectedFormForAnalytics.title}</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">{selectedFormForAnalytics.description}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedFormForAnalytics(null);
                  setAnalyticsData(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tab switcher */}
            <div className="flex items-center gap-2 mt-4 pb-3 border-b border-slate-100">
              <button
                onClick={() => setAnalyticsTab('summary')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  analyticsTab === 'summary'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Response Summary & Statistics</span>
              </button>
              <button
                onClick={() => setAnalyticsTab('responses')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  analyticsTab === 'responses'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Parent Submissions ({analyticsData?.responses.length || 0})</span>
              </button>
            </div>

            {loadingAnalytics ? (
              <div className="py-16 text-center">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Compiling survey analytics...</p>
              </div>
            ) : !analyticsData || analyticsData.responses.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No Responses Submitted Yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When parents submit feedback for this form, their ratings, choices, and recommendations will be
                  compiled here automatically.
                </p>
              </div>
            ) : analyticsTab === 'summary' ? (
              /* TAB 1: SUMMARY & QUESTION STATS */
              <div className="mt-5 space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                {analyticsData.stats.questionStats.map((qs, idx) => (
                  <div key={qs.questionId} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-900 mb-2">
                      Q{idx + 1}. {qs.questionText}
                    </p>

                    {/* Rating Question Analytics */}
                    {qs.questionType === 'rating' && (
                      <div className="mt-3 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-amber-500">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= Math.round(qs.averageRating || 0)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-lg font-bold text-slate-900">{qs.averageRating} / 5.0</span>
                          <span className="text-xs text-slate-400">Average Rating</span>
                        </div>

                        {/* Breakdown Bars */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-200">
                          {[5, 4, 3, 2, 1].map(stars => {
                            const count = qs.ratingCounts ? qs.ratingCounts[stars] || 0 : 0;
                            const total = analyticsData.stats.totalResponses || 1;
                            const pct = Math.round((count / total) * 100);
                            return (
                              <div key={stars} className="flex items-center gap-2 text-xs">
                                <span className="w-12 font-medium text-slate-600">{stars} Stars</span>
                                <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                                  <div
                                    className="h-full bg-amber-400 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-14 text-right text-slate-500 text-[11px]">
                                  {count} ({pct}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Multiple Choice Analytics */}
                    {qs.questionType === 'multiple_choice' && (
                      <div className="mt-3 space-y-2">
                        {Object.entries(qs.optionCounts || {}).map(([opt, count]) => {
                          const total = analyticsData.stats.totalResponses || 1;
                          const pct = Math.round((count / total) * 100);
                          return (
                            <div key={opt} className="space-y-1 text-xs">
                              <div className="flex justify-between font-medium text-slate-700">
                                <span>{opt}</span>
                                <span>
                                  {count} responses ({pct}%)
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Text Suggestions Analytics */}
                    {qs.questionType === 'text' && (
                      <div className="mt-3 space-y-2">
                        {qs.textResponses && qs.textResponses.length > 0 ? (
                          qs.textResponses.map((tr, trIdx) => (
                            <div
                              key={trIdx}
                              className="p-3 rounded-lg bg-white border border-slate-200 text-xs"
                            >
                              <p className="text-slate-800 font-medium leading-relaxed">"{tr.text}"</p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-slate-100">
                                <span className="font-semibold text-slate-600">{tr.parentName}</span>
                                <span>{new Date(tr.date).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic">No text comments submitted.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* TAB 2: DETAILED PARENT SUBMISSIONS LIST */
              <div className="mt-5 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {analyticsData.responses.map((resp, rIdx) => (
                  <div key={resp.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-900">{resp.parentName || 'Parent'}</span>
                        {resp.parentPhone && (
                          <span className="text-[11px] text-slate-400 ml-2">Phone: {resp.parentPhone}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        Submitted: {new Date(resp.submittedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {resp.answers.map((ans, aIdx) => {
                        const qObj = selectedFormForAnalytics.questions?.find(q => q.id === ans.questionId);
                        return (
                          <div key={aIdx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <p className="font-semibold text-slate-700 text-[11px]">
                              {qObj?.questionText || `Question ${aIdx + 1}`}
                            </p>
                            <p className="text-slate-900 font-medium mt-0.5">
                              {ans.ratingValue ? (
                                <span className="inline-flex items-center gap-1 text-amber-600">
                                  <span>{ans.ratingValue} / 5</span>
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                </span>
                              ) : ans.selectedOption ? (
                                <span className="text-indigo-700 font-semibold">{ans.selectedOption}</span>
                              ) : ans.textResponse ? (
                                <span className="italic">"{ans.textResponse}"</span>
                              ) : (
                                <span className="text-slate-400">No response</span>
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setSelectedFormForAnalytics(null);
                  setAnalyticsData(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
