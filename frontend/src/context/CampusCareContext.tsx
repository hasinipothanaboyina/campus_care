import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Submission,
  NotificationItem,
  RecurringIssueGroup,
  CampusInsight,
  SubmissionStatus,
  ResolutionRecord,
  Category,
  Urgency,
} from '../types';
import { supabase } from '../lib/supabase';
import {
  calculatePriorityScore,
  detectRecurringIssues,
  generateCampusInsights,
  findSimilarSubmissions,
} from '../services/intelligence';
import { useAuth } from './AuthContext';

interface CreateIssueInput {
  title: string;
  description: string;
  category: Category;
  building: string;
  room: string;
  urgency: Urgency;
  imageUrl?: string;
}

interface CreateSuggestionInput {
  title: string;
  description: string;
  category: Category;
  imageUrl?: string;
}

interface CreateImprovementInput {
  title: string;
  description: string;
  location: string;
  category: Category;
  reason: string;
  expectedBenefit: string;
  imageUrl?: string;
}

interface CampusCareContextType {
  submissions: Submission[];
  notifications: NotificationItem[];
  recurringIssues: RecurringIssueGroup[];
  insights: CampusInsight[];
  isLoadingData: boolean;
  createIssue: (input: CreateIssueInput) => Promise<Submission>;
  createSuggestion: (input: CreateSuggestionInput) => Promise<Submission>;
  createImprovementRequest: (input: CreateImprovementInput) => Promise<Submission>;
  supportSubmission: (submissionId: string) => Promise<void>;
  updateSubmissionStatus: (submissionId: string, status: SubmissionStatus, internalNotes?: string) => Promise<void>;
  assignSubmission: (submissionId: string, assignedTo: string, assignedTeam: string) => Promise<void>;
  resolveSubmission: (submissionId: string, resolution: ResolutionRecord) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  checkDuplicates: (category: string, building: string, room: string) => Submission[];
  refreshData: () => Promise<void>;
}

const CampusCareContext = createContext<CampusCareContextType | undefined>(undefined);

export const CampusCareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Fetch real data from Supabase PostgreSQL Database
  const refreshData = async () => {
    try {
      setIsLoadingData(true);

      // 1. Fetch Submissions
      const { data: subData, error: subErr } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subData && !subErr) {
        // Fetch supports list per submission
        const { data: supportsData } = await supabase.from('supports').select('*');

        // Deduplicate submissions by ID and purge stale mock items
        const cleanSubmissions = subData.filter((item: any) => 
          !['CC-2026-101', 'CC-2026-102', 'CC-2026-103', 'CC-2026-104', 'CC-2026-105'].includes(item.id)
        );

        const uniqueMap = new Map<string, Submission>();
        cleanSubmissions.forEach((item: any) => {
          const itemSupports = supportsData
            ? supportsData.filter((s: any) => s.submission_id === item.id).map((s: any) => s.user_id)
            : [];

          uniqueMap.set(item.id, {
            id: item.id,
            type: item.type,
            title: item.title,
            description: item.description,
            category: item.category,
            building: item.building,
            room: item.room,
            location: item.location,
            urgency: item.urgency,
            priority: item.priority,
            priorityScore: item.priority_score || 30,
            status: item.status,
            imageUrl: item.image_url,
            studentId: item.student_id,
            studentName: item.student_name,
            studentRollNumber: item.student_roll_number,
            studentDepartment: item.student_department,
            supportCount: itemSupports.length || item.support_count || 1,
            supportedUserIds: itemSupports,
            assignedTo: item.assigned_to,
            assignedTeam: item.assigned_team,
            internalNotes: item.internal_notes,
            verifiedBy: item.verified_by,
            verifiedAt: item.verified_at,
            reason: item.reason,
            expectedBenefit: item.expected_benefit,
            createdAt: item.created_at,
            updatedAt: item.updated_at || item.created_at,
          });
        });

        const mappedSubmissions = Array.from(uniqueMap.values());
        setSubmissions(mappedSubmissions);
        localStorage.setItem('campuscare_submissions', JSON.stringify(mappedSubmissions));
      } else {
        // Local cache sync - purge hardcoded mock items if any exist
        const cached = localStorage.getItem('campuscare_submissions');
        if (cached) {
          const parsed: Submission[] = JSON.parse(cached);
          const cleanParsed = parsed.filter(s => !['CC-2026-101', 'CC-2026-102', 'CC-2026-103', 'CC-2026-104', 'CC-2026-105'].includes(s.id));
          setSubmissions(cleanParsed);
          localStorage.setItem('campuscare_submissions', JSON.stringify(cleanParsed));
        } else {
          setSubmissions([]);
        }
      }

      // 2. Fetch Notifications
      if (user) {
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .order('created_at', { ascending: false });

        if (notifData) {
          const mappedNotifs: NotificationItem[] = notifData.map((n: any) => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            message: n.message,
            type: n.type,
            submissionId: n.submission_id,
            read: n.read,
            createdAt: n.created_at,
          }));
          setNotifications(mappedNotifs);
        } else {
          const cachedNotifs = localStorage.getItem('campuscare_notifications');
          if (cachedNotifs) setNotifications(JSON.parse(cachedNotifs));
        }
      }
    } catch (e) {
      console.error('Error fetching Supabase data:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [user?.id]);

  // Derived intelligence layers
  const recurringIssues = detectRecurringIssues(submissions);
  const insights = generateCampusInsights(submissions);

  const saveSubmissionsState = (data: Submission[]) => {
    setSubmissions(data);
    localStorage.setItem('campuscare_submissions', JSON.stringify(data));
  };

  const saveNotificationsState = (data: NotificationItem[]) => {
    setNotifications(data);
    localStorage.setItem('campuscare_notifications', JSON.stringify(data));
  };

  const addNotification = async (
    targetUserId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'status_change',
    submissionId?: string
  ) => {
    const notifItem: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: targetUserId,
      title,
      message,
      type,
      submissionId,
      read: false,
      createdAt: new Date().toISOString(),
    };

    saveNotificationsState([notifItem, ...notifications]);

    try {
      await supabase.from('notifications').insert([
        {
          user_id: targetUserId,
          title,
          message,
          type,
          submission_id: submissionId,
          read: false,
        },
      ]);
    } catch (e) {
      console.error('Error inserting notification to DB', e);
    }
  };

  const createIssue = async (input: CreateIssueInput): Promise<Submission> => {
    const newId = `CC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const locationStr = `${input.building}${input.room ? ' - ' + input.room : ''}`;

    const similar = findSimilarSubmissions(input.category, input.building, input.room, submissions);
    const { score, priority } = calculatePriorityScore(input.urgency, 1, similar.length, new Date().toISOString());

    const newSubmission: Submission = {
      id: newId,
      type: 'issue',
      title: input.title,
      description: input.description,
      category: input.category,
      building: input.building,
      room: input.room,
      location: locationStr,
      urgency: input.urgency,
      priority,
      priorityScore: score,
      status: 'Submitted',
      imageUrl: input.imageUrl,
      studentId: user?.id || 'usr-student',
      studentName: user?.fullName || 'Student',
      studentRollNumber: user?.studentId || 'N/A',
      studentDepartment: user?.department || 'General',
      supportCount: 1,
      supportedUserIds: [user?.id || 'usr-student'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSubmissionsState([newSubmission, ...submissions]);

    // Insert into Supabase
    try {
      await supabase.from('submissions').insert([
        {
          id: newId,
          type: 'issue',
          title: input.title,
          description: input.description,
          category: input.category,
          building: input.building,
          room: input.room,
          location: locationStr,
          urgency: input.urgency,
          priority,
          priority_score: score,
          status: 'Submitted',
          image_url: input.imageUrl,
          student_id: user?.id,
          student_name: user?.fullName,
          student_roll_number: user?.studentId,
          student_department: user?.department,
          support_count: 1,
        },
      ]);
    } catch (err) {
      console.error('Error inserting submission into Supabase DB:', err);
    }

    addNotification(
      newSubmission.studentId,
      'Issue Report Logged',
      `Your report ${newSubmission.id} ("${newSubmission.title}") was logged in the database and sent for CMC verification.`,
      'success',
      newSubmission.id
    );

    return newSubmission;
  };

  const createSuggestion = async (input: CreateSuggestionInput): Promise<Submission> => {
    const newId = `SUG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newSubmission: Submission = {
      id: newId,
      type: 'suggestion',
      title: input.title,
      description: input.description,
      category: input.category,
      location: 'Campus-wide',
      urgency: 'Low',
      priority: 'Low',
      priorityScore: 30,
      status: 'Submitted',
      imageUrl: input.imageUrl,
      studentId: user?.id || 'usr-student',
      studentName: user?.fullName || 'Student',
      studentRollNumber: user?.studentId,
      studentDepartment: user?.department,
      supportCount: 1,
      supportedUserIds: [user?.id || 'usr-student'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSubmissionsState([newSubmission, ...submissions]);

    try {
      await supabase.from('submissions').insert([
        {
          id: newId,
          type: 'suggestion',
          title: input.title,
          description: input.description,
          category: input.category,
          location: 'Campus-wide',
          urgency: 'Low',
          priority: 'Low',
          priority_score: 30,
          status: 'Submitted',
          image_url: input.imageUrl,
          student_id: user?.id,
          student_name: user?.fullName,
          student_roll_number: user?.studentId,
          student_department: user?.department,
          support_count: 1,
        },
      ]);
    } catch (e) {
      console.error('DB suggestion insert error:', e);
    }

    addNotification(
      newSubmission.studentId,
      'Suggestion Recorded',
      `Thank you! Your suggestion ${newSubmission.id} was saved for CMC review.`,
      'info',
      newSubmission.id
    );

    return newSubmission;
  };

  const createImprovementRequest = async (input: CreateImprovementInput): Promise<Submission> => {
    const newId = `IMP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newSubmission: Submission = {
      id: newId,
      type: 'improvement_request',
      title: input.title,
      description: input.description,
      location: input.location,
      category: input.category,
      urgency: 'Medium',
      priority: 'Medium',
      priorityScore: 50,
      status: 'Submitted',
      imageUrl: input.imageUrl,
      reason: input.reason,
      expectedBenefit: input.expectedBenefit,
      studentId: user?.id || 'usr-student',
      studentName: user?.fullName || 'Student',
      studentRollNumber: user?.studentId,
      studentDepartment: user?.department,
      supportCount: 1,
      supportedUserIds: [user?.id || 'usr-student'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSubmissionsState([newSubmission, ...submissions]);

    try {
      await supabase.from('submissions').insert([
        {
          id: newId,
          type: 'improvement_request',
          title: input.title,
          description: input.description,
          location: input.location,
          category: input.category,
          urgency: 'Medium',
          priority: 'Medium',
          priority_score: 50,
          status: 'Submitted',
          image_url: input.imageUrl,
          reason: input.reason,
          expected_benefit: input.expectedBenefit,
          student_id: user?.id,
          student_name: user?.fullName,
          student_roll_number: user?.studentId,
          student_department: user?.department,
          support_count: 1,
        },
      ]);
    } catch (e) {
      console.error('DB improvement request insert error:', e);
    }

    addNotification(
      newSubmission.studentId,
      'Improvement Request Recorded',
      `Your facility request ${newSubmission.id} was saved to the database.`,
      'info',
      newSubmission.id
    );

    return newSubmission;
  };

  const supportSubmission = async (submissionId: string) => {
    if (!user) return;

    let hasSupported = false;
    const updated = submissions.map(sub => {
      if (sub.id === submissionId) {
        hasSupported = sub.supportedUserIds.includes(user.id);
        const newSupportedIds = hasSupported
          ? sub.supportedUserIds.filter(id => id !== user.id)
          : [...sub.supportedUserIds, user.id];

        const newCount = newSupportedIds.length;
        const { score, priority } = calculatePriorityScore(sub.urgency, newCount, 0, sub.createdAt);

        return {
          ...sub,
          supportCount: newCount,
          supportedUserIds: newSupportedIds,
          priorityScore: score,
          priority,
          updatedAt: new Date().toISOString(),
        };
      }
      return sub;
    });

    saveSubmissionsState(updated);

    try {
      if (hasSupported) {
        await supabase.from('supports').delete().match({ submission_id: submissionId, user_id: user.id });
      } else {
        await supabase.from('supports').insert([{ submission_id: submissionId, user_id: user.id }]);
      }
    } catch (e) {
      console.error('DB supports update error:', e);
    }
  };

  const updateSubmissionStatus = async (submissionId: string, status: SubmissionStatus, internalNotes?: string) => {
    const updated = submissions.map(sub => {
      if (sub.id === submissionId) {
        const newSub = {
          ...sub,
          status,
          internalNotes: internalNotes !== undefined ? internalNotes : sub.internalNotes,
          updatedAt: new Date().toISOString(),
        };

        addNotification(
          sub.studentId,
          `Status Changed: ${status}`,
          `Your submission ${sub.id} ("${sub.title}") status was updated to ${status}.`,
          'status_change',
          sub.id
        );

        return newSub;
      }
      return sub;
    });

    saveSubmissionsState(updated);

    try {
      await supabase
        .from('submissions')
        .update({
          status,
          internal_notes: internalNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);
    } catch (e) {
      console.error('DB status update error:', e);
    }
  };

  const assignSubmission = async (submissionId: string, assignedTo: string, assignedTeam: string) => {
    const updated = submissions.map(sub => {
      if (sub.id === submissionId) {
        const newStatus: SubmissionStatus = sub.status === 'Submitted' ? 'Assigned' : sub.status;
        const newSub = {
          ...sub,
          assignedTo,
          assignedTeam,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };

        addNotification(
          sub.studentId,
          'Issue Assigned',
          `Your report ${sub.id} was assigned to ${assignedTo} (${assignedTeam}).`,
          'info',
          sub.id
        );

        return newSub;
      }
      return sub;
    });

    saveSubmissionsState(updated);

    try {
      await supabase
        .from('submissions')
        .update({
          assigned_to: assignedTo,
          assigned_team: assignedTeam,
          status: 'Assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);
    } catch (e) {
      console.error('DB assignment error:', e);
    }
  };

  const resolveSubmission = async (submissionId: string, resolution: ResolutionRecord) => {
    const updated = submissions.map(sub => {
      if (sub.id === submissionId) {
        const newSub: Submission = {
          ...sub,
          status: 'Resolved',
          resolution,
          updatedAt: new Date().toISOString(),
        };

        addNotification(
          sub.studentId,
          'Issue Resolved! 🎉',
          `Issue ${sub.id} ("${sub.title}") has been marked as Resolved by ${resolution.responsiblePerson}.`,
          'success',
          sub.id
        );

        return newSub;
      }
      return sub;
    });

    saveSubmissionsState(updated);

    try {
      await supabase
        .from('submissions')
        .update({ status: 'Resolved', updated_at: new Date().toISOString() })
        .eq('id', submissionId);

      await supabase.from('resolution_records').insert([
        {
          submission_id: submissionId,
          action_taken: resolution.actionTaken,
          responsible_person: resolution.responsiblePerson,
          notes: resolution.notes,
          before_image_url: resolution.beforeImageUrl,
          after_image_url: resolution.afterImageUrl,
        },
      ]);
    } catch (e) {
      console.error('DB resolution record error:', e);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    const updated = notifications.map(n => (n.id === notificationId ? { ...n, read: true } : n));
    saveNotificationsState(updated);

    try {
      await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
    } catch (e) {
      console.error(e);
    }
  };

  const markAllNotificationsRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotificationsState(updated);

    try {
      if (user) {
        await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const checkDuplicates = (category: string, building: string, room: string) => {
    return findSimilarSubmissions(category, building, room, submissions);
  };

  return (
    <CampusCareContext.Provider
      value={{
        submissions,
        notifications,
        recurringIssues,
        insights,
        isLoadingData,
        createIssue,
        createSuggestion,
        createImprovementRequest,
        supportSubmission,
        updateSubmissionStatus,
        assignSubmission,
        resolveSubmission,
        markNotificationRead,
        markAllNotificationsRead,
        checkDuplicates,
        refreshData,
      }}
    >
      {children}
    </CampusCareContext.Provider>
  );
};

export const useCampusCare = () => {
  const context = useContext(CampusCareContext);
  if (!context) {
    throw new Error('useCampusCare must be used within a CampusCareProvider');
  }
  return context;
};
