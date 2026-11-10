import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCampusCare } from '../../context/CampusCareContext';
import {
  ParentStudentLink,
  Submission,
  SubmissionStatus,
  SubmissionType,
  ResolutionRecord,
  Category,
  Urgency,
  Priority,
  NotificationItem,
  CAMPUS_BUILDINGS,
} from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { SubmissionDetailModal } from '../SubmissionDetailModal';
import { supabase } from '../../lib/supabase';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LogOut,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  FileText,
  Lightbulb,
  Sparkles,
  RefreshCw,
  GraduationCap,
  Building,
  CheckCheck,
  ChevronRight,
  BookOpen,
  AlertTriangle,
  Eye,
  Send,
  MessageSquare,
  Award,
  CalendarCheck,
  CalendarX,
  UserCheck,
  Info,
  Lock,
  Bell,
  HeartHandshake,
  HelpCircle,
  Bus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ParentDashboardTab =
  | 'overview'
  | 'academics'
  | 'attendance'
  | 'faculty_feedback'
  | 'college_concerns'
  | 'notifications'
  | 'ward_reports';

export const ParentDashboard: React.FC = () => {
  const { user, logout, requestStudentLink, fetchMyParentLinks } = useAuth();
  const { refreshData } = useCampusCare();
  const navigate = useNavigate();

  // Navigation State
  const [activeTab, setActiveTab] = useState<ParentDashboardTab>('overview');

  // Links & Selected Ward State
  const [links, setLinks] = useState<ParentStudentLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [selectedLinkId, setSelectedLinkId] = useState<string>('');

  // Parent's Own Submissions (Faculty Feedback + College Concerns)
  const [parentSubmissions, setParentSubmissions] = useState<Submission[]>([]);
  const [loadingParentSubmissions, setLoadingParentSubmissions] = useState(false);

  // Ward's Own Submissions (Secondary Reference)
  const [wardSubmissions, setWardSubmissions] = useState<Submission[]>([]);
  const [loadingWardSubmissions, setLoadingWardSubmissions] = useState(false);

  // Parent Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Modal / Detail State
  const [selectedSubmissionForModal, setSelectedSubmissionForModal] = useState<Submission | null>(null);

  // Link Form Modal State
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [rollInput, setRollInput] = useState('');
  const [submittingLink, setSubmittingLink] = useState(false);
  const [linkMsg, setLinkMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State: Faculty Feedback
  const [facultySubTab, setFacultySubTab] = useState<'history' | 'new'>('new');
  const [facultySubject, setFacultySubject] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [facultyDept, setFacultyDept] = useState('');
  const [facultyCategory, setFacultyCategory] = useState('Teaching Quality & Clarity');
  const [facultyConfidentiality, setFacultyConfidentiality] = useState<'Standard' | 'Urgent' | 'Confidential'>('Standard');
  const [facultyTitle, setFacultyTitle] = useState('');
  const [facultyDescription, setFacultyDescription] = useState('');
  const [submittingFaculty, setSubmittingFaculty] = useState(false);
  const [facultyFeedbackMsg, setFacultyFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State: College Suggestion / Complaint
  const [collegeSubTab, setCollegeSubTab] = useState<'history' | 'new'>('new');
  const [collegeType, setCollegeType] = useState<'issue' | 'suggestion'>('issue');
  const [collegeCategory, setCollegeCategory] = useState<string>('Campus Facilities');
  const [collegeLocation, setCollegeLocation] = useState('');
  const [collegeUrgency, setCollegeUrgency] = useState<Urgency>('Medium');
  const [collegeTitle, setCollegeTitle] = useState('');
  const [collegeDescription, setCollegeDescription] = useState('');
  const [submittingCollege, setSubmittingCollege] = useState(false);
  const [collegeFeedbackMsg, setCollegeFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filter States for Submission Lists
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [parentStatusFilter, setParentStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');

  // Load Parent's Linked Wards
  const loadLinks = useCallback(async () => {
    setLoadingLinks(true);
    try {
      const data = await fetchMyParentLinks();
      setLinks(data);
      if (data.length > 0) {
        setSelectedLinkId(prev => {
          if (prev && data.some(d => d.id === prev)) return prev;
          const firstVerified = data.find(d => d.verificationStatus === 'VERIFIED');
          return firstVerified ? firstVerified.id : data[0].id;
        });
      } else {
        setSelectedLinkId('');
      }
    } catch (err) {
      console.error('Error loading parent links:', err);
    } finally {
      setLoadingLinks(false);
    }
  }, [fetchMyParentLinks]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  // Selected Ward
  const selectedWard = useMemo(() => {
    return links.find(l => l.id === selectedLinkId) || null;
  }, [links, selectedLinkId]);

  // Auto-set department when ward changes
  useEffect(() => {
    if (selectedWard?.studentDepartment) {
      setFacultyDept(selectedWard.studentDepartment);
    }
  }, [selectedWard]);

  // Load Parent's Own Submissions (Faculty Feedback + College Concerns)
  const loadParentSubmissions = useCallback(async () => {
    if (!user) return;
    setLoadingParentSubmissions(true);
    try {
      const { data: subsData, error: subsErr } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (subsErr) {
        console.error('Error fetching parent submissions:', subsErr);
        setParentSubmissions([]);
        return;
      }

      if (!subsData || subsData.length === 0) {
        setParentSubmissions([]);
        return;
      }

      // Fetch resolution records for parent's submissions
      const subIds = subsData.map((s: any) => s.id);
      const resolutionsMap = new Map<string, ResolutionRecord>();

      if (subIds.length > 0) {
        const { data: resData } = await supabase
          .from('resolution_records')
          .select('submission_id, action_taken, responsible_person, resolved_date, notes, before_image_url, after_image_url')
          .in('submission_id', subIds);

        if (resData) {
          resData.forEach((r: any) => {
            resolutionsMap.set(r.submission_id, {
              actionTaken: r.action_taken,
              responsiblePerson: r.responsible_person,
              resolvedDate: r.resolved_date,
              notes: r.notes,
              beforeImageUrl: r.before_image_url,
              afterImageUrl: r.after_image_url,
            });
          });
        }
      }

      const mapped: Submission[] = subsData.map((item: any) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        category: item.category,
        building: item.building,
        room: item.room,
        location: item.location || 'Campus Area',
        urgency: item.urgency || 'Medium',
        priority: item.priority || 'Medium',
        priorityScore: item.priority_score || 30,
        status: item.status,
        imageUrl: item.image_url,
        studentId: item.student_id,
        studentName: item.student_name || user.fullName,
        studentRollNumber: item.student_roll_number || '',
        studentDepartment: item.student_department || '',
        supportCount: item.support_count || 0,
        supportedUserIds: [],
        assignedTo: item.assigned_to || resolutionsMap.get(item.id)?.responsiblePerson,
        assignedTeam: item.assigned_team || (resolutionsMap.get(item.id) ? 'Facilities Maintenance' : undefined),
        internalNotes: item.internal_notes,
        verifiedBy: item.verified_by,
        verifiedAt: item.verified_at,
        reason: item.reason,
        expectedBenefit: item.expected_benefit,
        resolution: resolutionsMap.get(item.id),
        createdAt: item.created_at,
        updatedAt: item.updated_at || item.created_at,
      }));

      setParentSubmissions(mapped);
    } catch (err) {
      console.error('Error querying parent submissions:', err);
      setParentSubmissions([]);
    } finally {
      setLoadingParentSubmissions(false);
    }
  }, [user]);

  // Load Ward's Own Submissions (Secondary Reference Tab)
  const loadWardSubmissions = useCallback(async () => {
    if (!selectedWard || selectedWard.verificationStatus !== 'VERIFIED') {
      setWardSubmissions([]);
      return;
    }

    setLoadingWardSubmissions(true);
    try {
      const { data: subsData, error: subsErr } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', selectedWard.studentId)
        .order('created_at', { ascending: false });

      if (subsErr) {
        console.error('Error fetching ward submissions:', subsErr);
        setWardSubmissions([]);
        return;
      }

      if (!subsData || subsData.length === 0) {
        setWardSubmissions([]);
        return;
      }

      const submissionIds = subsData.map((s: any) => s.id);
      const resolutionsMap = new Map<string, ResolutionRecord>();

      if (submissionIds.length > 0) {
        const { data: resData } = await supabase
          .from('resolution_records')
          .select('submission_id, action_taken, responsible_person, resolved_date, notes, before_image_url, after_image_url')
          .in('submission_id', submissionIds);

        if (resData) {
          resData.forEach((r: any) => {
            resolutionsMap.set(r.submission_id, {
              actionTaken: r.action_taken,
              responsiblePerson: r.responsible_person,
              resolvedDate: r.resolved_date,
              notes: r.notes,
              beforeImageUrl: r.before_image_url,
              afterImageUrl: r.after_image_url,
            });
          });
        }
      }

      const mapped: Submission[] = subsData.map((item: any) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        category: item.category,
        building: item.building,
        room: item.room,
        location: item.location || [item.building, item.room].filter(Boolean).join(' - ') || 'Campus Area',
        urgency: item.urgency || 'Medium',
        priority: item.priority || 'Medium',
        priorityScore: item.priority_score || 30,
        status: item.status,
        imageUrl: item.image_url,
        studentId: item.student_id,
        studentName: item.student_name || selectedWard.studentName || 'Student',
        studentRollNumber: item.student_roll_number || selectedWard.studentRollNumber,
        studentDepartment: item.student_department || selectedWard.studentDepartment,
        supportCount: item.support_count || 1,
        supportedUserIds: [],
        assignedTo: item.assigned_to || resolutionsMap.get(item.id)?.responsiblePerson,
        assignedTeam: item.assigned_team || (resolutionsMap.get(item.id) ? 'Facilities Maintenance' : undefined),
        internalNotes: item.internal_notes,
        verifiedBy: item.verified_by,
        verifiedAt: item.verified_at,
        reason: item.reason,
        expectedBenefit: item.expected_benefit,
        resolution: resolutionsMap.get(item.id),
        createdAt: item.created_at,
        updatedAt: item.updated_at || item.created_at,
      }));

      setWardSubmissions(mapped);
    } catch (err) {
      console.error('Error querying ward records:', err);
      setWardSubmissions([]);
    } finally {
      setLoadingWardSubmissions(false);
    }
  }, [selectedWard]);

  // Load Parent Notifications
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoadingNotifications(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotifications(
          data.map((n: any) => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            message: n.message,
            type: n.type || 'info',
            submissionId: n.submission_id,
            read: n.read ?? false,
            createdAt: n.created_at,
          }))
        );
      }
    } catch (e) {
      console.error('Error loading notifications:', e);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user]);

  useEffect(() => {
    loadParentSubmissions();
    loadWardSubmissions();
    loadNotifications();
  }, [loadParentSubmissions, loadWardSubmissions, loadNotifications]);

  // Partition Parent Submissions into Faculty Feedback vs College Concerns
  const facultyFeedbackSubmissions = useMemo(() => {
    return parentSubmissions.filter(
      s => s.title.startsWith('[Faculty Feedback]')
    );
  }, [parentSubmissions]);

  const collegeConcernSubmissions = useMemo(() => {
    return parentSubmissions.filter(
      s => !s.title.startsWith('[Faculty Feedback]')
    );
  }, [parentSubmissions]);

  // Filter Parent Submissions
  const filterSubmissions = (list: Submission[]) => {
    return list.filter(item => {
      const matchesSearch =
        searchQueryMatch(item.title, parentSearchQuery) ||
        searchQueryMatch(item.description, parentSearchQuery) ||
        searchQueryMatch(item.id, parentSearchQuery);

      let matchesStatus = true;
      if (parentStatusFilter === 'open') matchesStatus = item.status === 'Submitted' || item.status === 'Verified';
      if (parentStatusFilter === 'in_progress') matchesStatus = item.status === 'Assigned' || item.status === 'In Progress' || item.status === 'Under Review';
      if (parentStatusFilter === 'resolved') matchesStatus = item.status === 'Resolved' || item.status === 'Closed' || item.status === 'Approved';

      return matchesSearch && matchesStatus;
    });
  };

  const searchQueryMatch = (text: string | undefined, query: string) => {
    if (!query) return true;
    return (text || '').toLowerCase().includes(query.toLowerCase());
  };

  // Submit Link Request
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollInput.trim()) return;

    setSubmittingLink(true);
    setLinkMsg(null);

    try {
      const res = await requestStudentLink(rollInput.trim());
      if (res.success) {
        setLinkMsg({
          text: `Link request for roll number "${rollInput.trim().toUpperCase()}" has been submitted for college verification.`,
          type: 'success',
        });
        setRollInput('');
        await loadLinks();
      } else {
        setLinkMsg({
          text: res.error || 'Failed to submit link request.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setLinkMsg({
        text: err.message || 'An error occurred.',
        type: 'error',
      });
    } finally {
      setSubmittingLink(false);
    }
  };

  // Submit Faculty Feedback Form
  const handleSubmitFacultyFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !facultySubject.trim() || !facultyTitle.trim() || !facultyDescription.trim()) {
      setFacultyFeedbackMsg({ text: 'Please fill in all required fields (Subject, Title, and Description).', type: 'error' });
      return;
    }

    setSubmittingFaculty(true);
    setFacultyFeedbackMsg(null);

    const subId = `CC-FB-${Date.now().toString().slice(-6)}`;
    const wardRoll = selectedWard?.studentRollNumber || 'N/A';
    const dept = facultyDept || selectedWard?.studentDepartment || 'Academics';

    const fullDescription = [
      `Course / Subject: ${facultySubject.trim()}`,
      `Faculty Name: ${facultyName.trim() || 'Not specified'}`,
      `Department: ${dept}`,
      `Category: ${facultyCategory}`,
      `Confidentiality / Urgency: ${facultyConfidentiality}`,
      `Linked Student Roll: ${wardRoll}`,
      '----------------------------------------',
      facultyDescription.trim(),
    ].join('\n');

    const urgencyVal: Urgency =
      facultyConfidentiality === 'Urgent' ? 'High' : facultyConfidentiality === 'Confidential' ? 'High' : 'Medium';

    try {
      const { data, error } = await supabase.from('submissions').insert([
        {
          id: subId,
          type: 'issue',
          title: `[Faculty Feedback] ${facultySubject.trim()}: ${facultyTitle.trim()}`,
          description: fullDescription,
          category: 'Classroom',
          building: dept,
          room: facultyName.trim() || 'Faculty Desk',
          location: `${dept} Department`,
          urgency: urgencyVal,
          priority: urgencyVal,
          priority_score: urgencyVal === 'High' ? 75 : 50,
          status: 'Submitted',
          student_id: user.id,
          student_name: `${user.fullName} (Parent of ${wardRoll})`,
          student_roll_number: wardRoll,
          student_department: dept,
        },
      ]).select();

      if (error) throw error;

      setFacultyFeedbackMsg({
        text: `Faculty feedback submitted successfully (ID: ${subId}). It has been routed to the Department HOD for confidential review.`,
        type: 'success',
      });

      // Clear Form
      setFacultySubject('');
      setFacultyName('');
      setFacultyTitle('');
      setFacultyDescription('');
      await loadParentSubmissions();
      setFacultySubTab('history');
    } catch (err: any) {
      console.error('Error submitting faculty feedback:', err);
      setFacultyFeedbackMsg({
        text: err.message || 'Failed to submit faculty feedback. Please try again.',
        type: 'error',
      });
    } finally {
      setSubmittingFaculty(false);
    }
  };

  // Submit College Concern / Suggestion Form
  const handleSubmitCollegeConcern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !collegeTitle.trim() || !collegeDescription.trim()) {
      setCollegeFeedbackMsg({ text: 'Please fill in all required fields (Title and Description).', type: 'error' });
      return;
    }

    setSubmittingCollege(true);
    setCollegeFeedbackMsg(null);

    const subId = `CC-PAR-${Date.now().toString().slice(-6)}`;
    const wardRoll = selectedWard?.studentRollNumber || 'N/A';

    try {
      const { data, error } = await supabase.from('submissions').insert([
        {
          id: subId,
          type: collegeType,
          title: collegeTitle.trim(),
          description: `Category: ${collegeCategory}\nLocation: ${collegeLocation || 'Campus-wide'}\nLinked Student Roll: ${wardRoll}\n\n${collegeDescription.trim()}`,
          category: (collegeCategory as Category) || 'Other',
          building: collegeLocation || 'Main Campus',
          location: collegeLocation || 'Campus Area',
          urgency: collegeUrgency,
          priority: collegeUrgency,
          priority_score: collegeUrgency === 'Critical' ? 90 : collegeUrgency === 'High' ? 70 : 45,
          status: 'Submitted',
          student_id: user.id,
          student_name: `${user.fullName} (Parent)`,
          student_roll_number: wardRoll,
          student_department: selectedWard?.studentDepartment || 'Parent Portal',
        },
      ]).select();

      if (error) throw error;

      setCollegeFeedbackMsg({
        text: `Your ${collegeType === 'suggestion' ? 'suggestion' : 'concern'} has been submitted to the Campus Management Committee (ID: ${subId}).`,
        type: 'success',
      });

      // Clear Form
      setCollegeTitle('');
      setCollegeDescription('');
      setCollegeLocation('');
      await loadParentSubmissions();
      setCollegeSubTab('history');
    } catch (err: any) {
      console.error('Error submitting college concern:', err);
      setCollegeFeedbackMsg({
        text: err.message || 'Failed to submit. Please try again.',
        type: 'error',
      });
    } finally {
      setSubmittingCollege(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Portal Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-white">CampusCare</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Parent Portal
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Student Performance & College Communication</p>
              </div>
            </div>

            {/* Ward Selector & Account Actions */}
            <div className="flex items-center gap-3">
              {/* Linked Wards Dropdown / Pills */}
              {links.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] font-semibold text-slate-400 pl-2 pr-1">Ward:</span>
                  {links.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedLinkId(l.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        selectedLinkId === l.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>{l.studentRollNumber}</span>
                      {l.verificationStatus === 'VERIFIED' ? (
                        <span title="Verified Ward"><CheckCheck className="w-3 h-3 text-emerald-300" /></span>
                      ) : l.verificationStatus === 'REJECTED' ? (
                        <span title="Link Rejected"><XCircle className="w-3 h-3 text-rose-300" /></span>
                      ) : (
                        <span title="Verification Pending"><Clock className="w-3 h-3 text-amber-300" /></span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Link Another Student Button */}
              <button
                onClick={() => {
                  setShowLinkForm(true);
                  setLinkMsg(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                title="Submit request to link another child"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline">Link Ward</span>
              </button>

              {/* Parent Profile Badge */}
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800 text-xs text-slate-300">
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 border border-slate-700">
                  {user?.fullName?.charAt(0) || 'P'}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-200 text-xs leading-none">{user?.fullName || 'Parent'}</p>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{user?.email}</p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg flex items-center gap-1.5 transition-colors"
                title="Sign out of CampusCare"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Secondary Dashboard Navigation Tabs */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2.5 scrollbar-none">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'overview'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Ward Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('academics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'academics'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Academic Performance</span>
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'attendance'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Attendance & Absentees</span>
            </button>

            <button
              onClick={() => setActiveTab('faculty_feedback')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'faculty_feedback'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Faculty Feedback</span>
              {facultyFeedbackSubmissions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full font-bold bg-indigo-100 text-indigo-700">
                  {facultyFeedbackSubmissions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('college_concerns')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'college_concerns'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>College Suggestions & Complaints</span>
              {collegeConcernSubmissions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full font-bold bg-indigo-100 text-indigo-700">
                  {collegeConcernSubmissions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'notifications'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Notifications</span>
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full font-bold bg-rose-600 text-white">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ward_reports')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'ward_reports'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="View issues and suggestions submitted by your child"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ward Reports</span>
              {wardSubmissions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full font-bold bg-slate-200 text-slate-700">
                  {wardSubmissions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Verification Status Warning Banners */}
        {selectedWard && selectedWard.verificationStatus === 'PENDING_VERIFICATION' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Parent-Student Link Verification Pending
                </h3>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Your request to link with student roll number{' '}
                  <strong className="font-mono text-amber-950 font-bold">{selectedWard.studentRollNumber}</strong> is
                  currently undergoing official verification by the college administration.
                </p>
                <p className="text-[11px] text-amber-700 mt-1">
                  In compliance with privacy policies, confidential marks and attendance records will be displayed once
                  the link is verified. You can still submit college suggestions and concerns below.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-100 text-amber-900 rounded-lg border border-amber-300">
                Status: Pending
              </span>
            </div>
          </div>
        )}

        {selectedWard && selectedWard.verificationStatus === 'REJECTED' && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                  Ward Link Request Not Approved
                </h3>
                <p className="text-xs text-rose-800 mt-0.5">
                  The link request for roll number{' '}
                  <strong className="font-mono font-bold">{selectedWard.studentRollNumber}</strong> could not be
                  verified against college admission records.
                </p>
                <p className="text-[11px] text-rose-700 mt-1">
                  Please verify the roll number with your ward or contact the college administrative office for
                  manual assistance.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLinkForm(true)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors"
            >
              Submit Correct Roll Number
            </button>
          </div>
        )}

        {/* No Linked Wards Empty State */}
        {!loadingLinks && links.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm max-w-xl mx-auto my-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Welcome to CampusCare Parent Portal</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              To monitor your child's academic performance, track attendance, and communicate directly with faculty,
              please link your ward's student roll number.
            </p>
            <button
              onClick={() => setShowLinkForm(true)}
              className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Link Your Child's Roll Number</span>
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && selectedWard && (
          <div className="space-y-6">
            {/* Ward Identification Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {selectedWard.studentName ? selectedWard.studentName.charAt(0) : 'W'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{selectedWard.studentName || 'Student on file'}</h2>
                    {selectedWard.verificationStatus === 'VERIFIED' ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCheck className="w-3 h-3" /> Verified Ward
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Verification Pending
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                    <span className="flex items-center gap-1 font-mono font-bold text-indigo-700">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                      {selectedWard.studentRollNumber}
                    </span>
                    <span>•</span>
                    <span>{selectedWard.studentDepartment || 'Engineering'}</span>
                    {selectedWard.studentYear && (
                      <>
                        <span>•</span>
                        <span>Year {selectedWard.studentYear}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="text-slate-500">SRGEC Autonomous</span>
                  </div>
                </div>
              </div>

              {/* Quick Communication Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => {
                    setActiveTab('faculty_feedback');
                    setFacultySubTab('new');
                  }}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Faculty Feedback</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('college_concerns');
                    setCollegeSubTab('new');
                  }}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>College Suggestion / Complaint</span>
                </button>
              </div>
            </div>

            {/* Metric Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Metric 1: Academic Status */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Academic Performance</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">Sync Pending</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Examination ERP results integration</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">Autonomous Grading</span>
                  <button
                    onClick={() => setActiveTab('academics')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <span>View Marks</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Metric 2: Attendance Status */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Overall</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">Sync Pending</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Biometric & classroom logging</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Req: 75% Minimum
                  </span>
                  <button
                    onClick={() => setActiveTab('attendance')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <span>View Log</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Metric 3: My Communication with College */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Submissions to College</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">{parentSubmissions.length}</span>
                    <span className="text-xs text-slate-500 font-medium">Recorded Submissions</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {facultyFeedbackSubmissions.length} Faculty Feedback • {collegeConcernSubmissions.length} Campus Concerns
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500">Live Status Tracking</span>
                  <button
                    onClick={() => setActiveTab('college_concerns')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <span>Track Status</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions & Policy Guides */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Direct Communication Channels */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-indigo-600" />
                  Direct Parent-College Communication
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  CampusCare provides an official, confidential communication link between parents, department heads,
                  and the College Management Committee (CMC).
                </p>
                <div className="space-y-2.5 pt-1">
                  <div
                    onClick={() => {
                      setActiveTab('faculty_feedback');
                      setFacultySubTab('new');
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Faculty & Subject Feedback</p>
                        <p className="text-[11px] text-slate-500">Share observations on teaching pace, doubt clarification, or practicals.</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>

                  <div
                    onClick={() => {
                      setActiveTab('college_concerns');
                      setCollegeSubTab('new');
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Campus Facilities & Safety Concerns</p>
                        <p className="text-[11px] text-slate-500">Suggestions on transport, hostel, canteen, labs, and student welfare.</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Academic & Attendance Regulations Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-600" />
                  College Academic & Attendance Policy
                </h3>
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 font-semibold">75% Attendance Requirement:</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Students must maintain at least 75% aggregate attendance in all theory and laboratory courses to be
                        eligible for semester end examinations.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 font-semibold">Medical Condonation:</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Attendance between 65% and 75% may be condoned by the Academic Committee upon submission of genuine
                        medical documents within 3 working days.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <Award className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 font-semibold">Internal Continuous Assessment:</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Internal evaluation comprises Mid-1, Mid-2, assignments, and active tutorial participation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACADEMIC PERFORMANCE */}
        {activeTab === 'academics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-600" />
                    Academic Performance & Evaluation
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Subject-wise internal assessments, semester grade points, and credits for{' '}
                    <strong className="font-mono text-slate-800 font-bold">{selectedWard?.studentRollNumber || 'Ward'}</strong>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('faculty_feedback');
                    setFacultySubTab('new');
                  }}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors self-start"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Submit Academic Concern</span>
                </button>
              </div>

              {/* Honest Integration Status Banner */}
              <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-900">
                    Official College Examination ERP Synchronization Status
                  </p>
                  <p className="leading-relaxed">
                    Semester marks and internal assessment scores are synchronized directly from the Autonomous Controller
                    of Examinations. The college grading database is currently finalizing Mid-Term evaluation logs for the
                    ongoing semester.
                  </p>
                  <p className="text-[11px] text-slate-500 italic">
                    CampusCare displays only verified official records. Provisional unverified grades will appear here as soon
                    as they are formally ratified by the Academic Council.
                  </p>
                </div>
              </div>

              {/* Academic Structure Display (Empty State / Placeholder Schema) */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="px-4 py-3 font-semibold">Subject Code</th>
                      <th className="px-4 py-3 font-semibold">Course Title</th>
                      <th className="px-4 py-3 font-semibold text-center">Internal (Max 40)</th>
                      <th className="px-4 py-3 font-semibold text-center">External (Max 60)</th>
                      <th className="px-4 py-3 font-semibold text-center">Total</th>
                      <th className="px-4 py-3 font-semibold text-center">Grade</th>
                      <th className="px-4 py-3 font-semibold text-center">Credits</th>
                      <th className="px-4 py-3 font-semibold text-right">Sync Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <GraduationCap className="w-8 h-8 text-slate-300" />
                          <p className="font-semibold text-slate-700 text-xs">No Published Grade Records on File</p>
                          <p className="text-[11px] text-slate-400">
                            Examination records for {selectedWard?.studentRollNumber || 'this student'} will display here
                            upon release of official marks memos by the Department Examination Coordinator.
                          </p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ATTENDANCE & ABSENTEES */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-emerald-600" />
                    Attendance & Absentee Monitoring
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Biometric attendance tracking and day-wise absence records for{' '}
                    <strong className="font-mono text-slate-800 font-bold">{selectedWard?.studentRollNumber || 'Ward'}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Threshold: 75% Aggregate</span>
                  </span>
                </div>
              </div>

              {/* Attendance Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Attendance %</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">Pending</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Biometric sync</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Working Days</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">Ongoing</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Current Semester</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Present Days</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">—</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Recorded</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Absent Days</p>
                  <p className="text-2xl font-bold text-rose-700 mt-1">—</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Recorded</p>
                </div>
              </div>

              {/* Honest Attendance Integration Notice */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-900">
                    Biometric & Department Attendance Integration Status
                  </p>
                  <p className="leading-relaxed">
                    Class attendance is recorded twice daily by course faculty and synchronized weekly with the College
                    Academic Attendance Database. Date-wise logs and absentee notifications are published after weekly
                    reconciliation.
                  </p>
                </div>
              </div>

              {/* Absence History Table Display */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Session / Period</th>
                      <th className="px-4 py-3 font-semibold">Subject / Course</th>
                      <th className="px-4 py-3 font-semibold text-center">Status</th>
                      <th className="px-4 py-3 font-semibold">Remarks / Leave Notice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <Calendar className="w-8 h-8 text-slate-300" />
                          <p className="font-semibold text-slate-700 text-xs">No Unexcused Absences Logged</p>
                          <p className="text-[11px] text-slate-400">
                            Daily attendance entries will appear here once the departmental attendance cycle is processed.
                          </p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FACULTY FEEDBACK & COMPLAINTS */}
        {activeTab === 'faculty_feedback' && (
          <div className="space-y-6">
            {/* Header & Sub-Tab Switcher */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    Faculty Feedback & Academic Concerns
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Confidential channel to share feedback, suggestions, or concerns regarding teaching, syllabus coverage,
                    or academic guidance.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setFacultySubTab('new')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      facultySubTab === 'new'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Feedback</span>
                  </button>
                  <button
                    onClick={() => setFacultySubTab('history')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      facultySubTab === 'history'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>My Submissions ({facultyFeedbackSubmissions.length})</span>
                  </button>
                </div>
              </div>

              {/* Alerts */}
              {facultyFeedbackMsg && (
                <div
                  className={`mt-4 p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
                    facultyFeedbackMsg.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  <span>{facultyFeedbackMsg.text}</span>
                  <button onClick={() => setFacultyFeedbackMsg(null)} className="underline hover:no-underline">
                    Dismiss
                  </button>
                </div>
              )}

              {/* Sub-View: New Feedback Form */}
              {facultySubTab === 'new' && (
                <form onSubmit={handleSubmitFacultyFeedback} className="mt-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Subject / Course */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subject / Course Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={facultySubject}
                        onChange={e => setFacultySubject(e.target.value)}
                        placeholder="e.g. Data Structures & Algorithms, Operating Systems"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                      />
                    </div>

                    {/* Faculty Name (Optional) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Faculty Name <span className="text-slate-400 font-normal">(Optional if known)</span>
                      </label>
                      <input
                        type="text"
                        value={facultyName}
                        onChange={e => setFacultyName(e.target.value)}
                        placeholder="e.g. Dr. Ramesh Kumar / Course Instructor"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                      />
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Academic Department <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={facultyDept}
                        onChange={e => setFacultyDept(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                      >
                        <option value="CSE">Computer Science & Engineering (CSE)</option>
                        <option value="AIDS">Artificial Intelligence & Data Science (AI&DS)</option>
                        <option value="AIML">AI & Machine Learning (AI&ML)</option>
                        <option value="ECE">Electronics & Communication (ECE)</option>
                        <option value="EEE">Electrical & Electronics (EEE)</option>
                        <option value="MECH">Mechanical Engineering (MECH)</option>
                        <option value="CIVIL">Civil Engineering (CIVIL)</option>
                        <option value="IT">Information Technology (IT)</option>
                        <option value="BSH">Basic Sciences & Humanities (BSH)</option>
                      </select>
                    </div>

                    {/* Feedback Category */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Feedback Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={facultyCategory}
                        onChange={e => setFacultyCategory(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                      >
                        <option value="Teaching Quality & Clarity">Teaching Quality & Clarity</option>
                        <option value="Syllabus Coverage Pace">Syllabus Coverage Pace</option>
                        <option value="Doubts Clarification & Mentorship">Doubts Clarification & Mentorship</option>
                        <option value="Evaluation & Internal Marks Fairness">Evaluation & Internal Marks Fairness</option>
                        <option value="Laboratory & Practical Guidance">Laboratory & Practical Guidance</option>
                        <option value="Classroom Discipline & Regularity">Classroom Discipline & Regularity</option>
                        <option value="Other Academic Concern">Other Academic Concern</option>
                      </select>
                    </div>
                  </div>

                  {/* Urgency & Confidentiality */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Urgency & Confidentiality Level
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        {
                          val: 'Standard',
                          label: 'Standard Academic Feedback',
                          desc: 'Shared with HOD for routine curriculum review',
                        },
                        {
                          val: 'Urgent',
                          label: 'Urgent Academic Concern',
                          desc: 'Requires prompt attention before upcoming exams',
                        },
                        {
                          val: 'Confidential',
                          label: 'Strictly Confidential',
                          desc: 'Restricted to Principal & Dean of Academics',
                        },
                      ].map(opt => (
                        <div
                          key={opt.val}
                          onClick={() => setFacultyConfidentiality(opt.val as any)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            facultyConfidentiality === opt.val
                              ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                          }`}
                        >
                          <p className="text-xs font-bold text-slate-900">{opt.label}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feedback Title */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Brief Subject / Summary <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={facultyTitle}
                      onChange={e => setFacultyTitle(e.target.value)}
                      placeholder="e.g. Need more practical problem-solving sessions in Algorithms"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  {/* Detailed Description */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Detailed Remarks & Suggestions <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={facultyDescription}
                      onChange={e => setFacultyDescription(e.target.value)}
                      placeholder="Please provide specific constructive details so the department can address the matter effectively..."
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setFacultySubTab('history')}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingFaculty}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      {submittingFaculty ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit to Department HOD</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-View: Feedback History / Status Tracking */}
              {facultySubTab === 'history' && (
                <div className="mt-6 space-y-4">
                  {facultyFeedbackSubmissions.length === 0 ? (
                    <EmptyState
                      title="No Faculty Feedback Submitted"
                      description="You have not submitted any faculty feedback yet. Click 'New Feedback' above to share academic observations."
                    />
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {facultyFeedbackSubmissions.map(item => (
                        <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-slate-500">{item.id}</span>
                              <span className="text-xs font-bold text-slate-900">{item.title}</span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 pt-1">
                              <span>Submitted: {new Date(item.createdAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{item.location}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                            <StatusBadge status={item.status} />
                            <PriorityBadge priority={item.priority} />
                            <button
                              onClick={() => setSelectedSubmissionForModal(item)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Response</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: COLLEGE SUGGESTIONS & COMPLAINTS */}
        {activeTab === 'college_concerns' && (
          <div className="space-y-6">
            {/* Header & Sub-Tab Switcher */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-5 h-5 text-indigo-600" />
                    College Suggestions & Campus Concerns
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Direct institutional feedback to College Administration regarding campus facilities, safety, transport,
                    and student welfare.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setCollegeSubTab('new')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      collegeSubTab === 'new'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Submission</span>
                  </button>
                  <button
                    onClick={() => setCollegeSubTab('history')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      collegeSubTab === 'history'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>My Submissions ({collegeConcernSubmissions.length})</span>
                  </button>
                </div>
              </div>

              {/* Alerts */}
              {collegeFeedbackMsg && (
                <div
                  className={`mt-4 p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
                    collegeFeedbackMsg.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  <span>{collegeFeedbackMsg.text}</span>
                  <button onClick={() => setCollegeFeedbackMsg(null)} className="underline hover:no-underline">
                    Dismiss
                  </button>
                </div>
              )}

              {/* Sub-View: New College Submission Form */}
              {collegeSubTab === 'new' && (
                <form onSubmit={handleSubmitCollegeConcern} className="mt-6 space-y-5">
                  {/* Type Selector: Suggestion vs Issue */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Submission Type
                    </label>
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                      <div
                        onClick={() => setCollegeType('issue')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                          collegeType === 'issue'
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm text-indigo-900 font-bold'
                            : 'border-slate-200 text-slate-600 bg-slate-50/50'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-xs">Complaint / Issue</span>
                      </div>
                      <div
                        onClick={() => setCollegeType('suggestion')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                          collegeType === 'suggestion'
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm text-indigo-900 font-bold'
                            : 'border-slate-200 text-slate-600 bg-slate-50/50'
                        }`}
                      >
                        <Lightbulb className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs">Constructive Suggestion</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Category */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={collegeCategory}
                        onChange={e => setCollegeCategory(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                      >
                        <option value="Classroom">Campus Facilities & Restrooms</option>
                        <option value="Transport">College Transport & Bus Routes</option>
                        <option value="Safety">Campus Safety & Surveillance</option>
                        <option value="Cleanliness">Canteen & Mess Hygiene</option>
                        <option value="Water">Drinking Water Supply</option>
                        <option value="Equipment">Hostel Facilities & Accommodation</option>
                        <option value="Library">Library & Reading Rooms</option>
                        <option value="Other">Administration & Fee Services</option>
                        <option value="Other">Student Counseling & Welfare</option>
                      </select>
                    </div>

                    {/* Urgency */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Priority Level
                      </label>
                      <select
                        value={collegeUrgency}
                        onChange={e => setCollegeUrgency(e.target.value as Urgency)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                      >
                        <option value="Low">Low — General feedback / Routine request</option>
                        <option value="Medium">Medium — Standard campus matter</option>
                        <option value="High">High — Important concern affecting students</option>
                        <option value="Critical">Critical — Immediate safety / operational risk</option>
                      </select>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Campus Location / Building / Bus Route <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      list="parent-campus-locations-list"
                      value={collegeLocation}
                      onChange={e => setCollegeLocation(e.target.value)}
                      placeholder="e.g. Route 14 (Vijayawada-Gudlavalleru), Canteen, M Block, Parking"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                    <datalist id="parent-campus-locations-list">
                      {CAMPUS_BUILDINGS.map(b => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Subject / Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={collegeTitle}
                      onChange={e => setCollegeTitle(e.target.value)}
                      placeholder="e.g. Bus Route 14 delays during evening return hours"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Detailed Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={collegeDescription}
                      onChange={e => setCollegeDescription(e.target.value)}
                      placeholder="Describe the issue or suggestion in detail, including affected times, dates, and recommendations..."
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCollegeSubTab('history')}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingCollege}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      {submittingCollege ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit to College Administration</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-View: Submissions History / Live Status Tracking */}
              {collegeSubTab === 'history' && (
                <div className="mt-6 space-y-4">
                  {collegeConcernSubmissions.length === 0 ? (
                    <EmptyState
                      title="No College Concerns or Suggestions"
                      description="You have not submitted any campus suggestions or complaints yet. Click 'New Submission' above to voice your feedback."
                    />
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {collegeConcernSubmissions.map(item => (
                        <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-slate-500">{item.id}</span>
                              <span className="text-xs font-bold text-slate-900">{item.title}</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {item.type}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 pt-1">
                              <span>Submitted: {new Date(item.createdAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>Location: {item.location}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                            <StatusBadge status={item.status} />
                            <PriorityBadge priority={item.priority} />
                            <button
                              onClick={() => setSelectedSubmissionForModal(item)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Response</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-600" />
                    Parent Notifications & College Alerts
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official administrative alerts, status updates on your submissions, and verification updates.
                  </p>
                </div>
                <button
                  onClick={loadNotifications}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="mt-6">
                {notifications.length === 0 ? (
                  <EmptyState
                    title="No Notifications"
                    description="You are all caught up! New updates from administration and status changes will appear here."
                  />
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {notifications.map(n => (
                      <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-900">{n.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: WARD REPORTS (Secondary Reference Tab) */}
        {activeTab === 'ward_reports' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-700" />
                    Submissions Logged by Ward ({selectedWard?.studentRollNumber})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reference archive of campus issues and suggestions submitted directly by your child.
                  </p>
                </div>
                <div className="text-xs text-slate-500">
                  Total Reports: <strong className="text-slate-900 font-bold">{wardSubmissions.length}</strong>
                </div>
              </div>

              {selectedWard?.verificationStatus !== 'VERIFIED' ? (
                <div className="p-8 text-center">
                  <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Ward Access Restricted</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Your link with {selectedWard?.studentRollNumber} is pending college administration verification.
                  </p>
                </div>
              ) : wardSubmissions.length === 0 ? (
                <EmptyState
                  title="No Reports Submitted by Ward"
                  description="Your child has not logged any campus issues or improvement requests."
                />
              ) : (
                <div className="mt-6 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {wardSubmissions.map(item => (
                    <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-500">{item.id}</span>
                          <span className="text-xs font-bold text-slate-900">{item.title}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 pt-1">
                          <span>Reported on: {new Date(item.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{item.location}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                        <StatusBadge status={item.status} />
                        <PriorityBadge priority={item.priority} />
                        <button
                          onClick={() => setSelectedSubmissionForModal(item)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Submission Detail Modal */}
      {selectedSubmissionForModal && (
        <SubmissionDetailModal
          submission={selectedSubmissionForModal}
          onClose={() => setSelectedSubmissionForModal(null)}
        />
      )}

      {/* Link Another Student Modal */}
      {showLinkForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Link Another Student (Ward)
              </h3>
              <button
                onClick={() => setShowLinkForm(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your child's official college Roll Number. A pending verification request will be submitted to the
              college administration. Academic and attendance data will become accessible upon approval.
            </p>

            {linkMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  linkMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {linkMsg.text}
              </div>
            )}

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Roll Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={rollInput}
                  onChange={e => setRollInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 24481A54E9"
                  maxLength={15}
                  className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 uppercase"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submittingLink || !rollInput.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  {submittingLink ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Link Request</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} CampusCare Parent Portal — SRGEC Academic Governance & Student Welfare</p>
        </div>
      </footer>
    </div>
  );
};
