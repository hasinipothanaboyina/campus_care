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
        // Fetch resolution records per submission
        const { data: resolutionsData } = await supabase.from('resolution_records').select('*');
        // Fetch assignments per submission
        const { data: assignmentsData } = await supabase
          .from('assignments')
          .select('*')
          .order('created_at', { ascending: false });

        // Deduplicate submissions by ID and purge stale mock items
        const cleanSubmissions = subData.filter((item: any) =>
          !['CC-2026-101', 'CC-2026-102', 'CC-2026-103', 'CC-2026-104', 'CC-2026-105'].includes(item.id)
        );

        const uniqueMap = new Map<string, Submission>();
        cleanSubmissions.forEach((item: any) => {
          const itemSupports = supportsData
            ? supportsData.filter((s: any) => s.submission_id === item.id).map((s: any) => s.user_id)
            : [];

          const itemRes = resolutionsData
            ? resolutionsData.find((r: any) => r.submission_id === item.id)
            : null;

          const itemAssignment = assignmentsData
            ? assignmentsData.find((a: any) => a.submission_id === item.id)
            : null;

          const canonicalAssignedTo = item.assigned_to || itemAssignment?.assigned_to || itemRes?.responsible_person || undefined;
          const canonicalAssignedTeam = item.assigned_team || itemAssignment?.assigned_team || (itemRes ? 'Facilities Maintenance' : undefined);

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
            assignedTo: canonicalAssignedTo,
            assignedTeam: canonicalAssignedTeam,
            internalNotes: item.internal_notes,
            verifiedBy: item.verified_by,
            verifiedAt: item.verified_at,
            reason: item.reason,
            expectedBenefit: item.expected_benefit,
            resolution: itemRes ? {
              actionTaken: itemRes.action_taken,
              responsiblePerson: itemRes.responsible_person,
              resolvedDate: itemRes.resolved_date,
              notes: itemRes.notes,
              beforeImageUrl: itemRes.before_image_url,
              afterImageUrl: itemRes.after_image_url,
            } : undefined,
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
    // 1. Initial fetch
    refreshData();

    // 2. Window focus refetch: Ensures switching tabs/windows updates to latest DB state
    const handleFocus = () => {
      refreshData();
    };
    window.addEventListener('focus', handleFocus);

    // 3. Cross-tab storage synchronization
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'campuscare_sync_trigger' || e.key === 'campuscare_submissions') {
        refreshData();
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Polling fallback every 15 seconds to ensure cross-dashboard live consistency
    const interval = setInterval(() => {
      refreshData();
    }, 15000);

    // 5. Supabase Realtime channel for live cross-portal submissions & resolutions sync
    const channel = supabase
      .channel('campuscare_global_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        () => {
          refreshData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resolution_records' },
        () => {
          refreshData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments' },
        () => {
          refreshData();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
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

    // Insert into Supabase first
    const { error: insErr } = await supabase.from('submissions').insert([
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

    if (insErr) {
      console.error('Error inserting submission into Supabase DB:', insErr.message);
      throw new Error(`Failed to submit issue to database: ${insErr.message}`);
    }

    saveSubmissionsState([newSubmission, ...submissions]);

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

    // Insert into Supabase first
    const { error: sugErr } = await supabase.from('submissions').insert([
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

    if (sugErr) {
      console.error('DB suggestion insert error:', sugErr.message);
      throw new Error(`Failed to submit suggestion to database: ${sugErr.message}`);
    }

    saveSubmissionsState([newSubmission, ...submissions]);

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

    // Insert into Supabase first
    const { error: impErr } = await supabase.from('submissions').insert([
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

    if (impErr) {
      console.error('DB improvement request insert error:', impErr.message);
      throw new Error(`Failed to submit improvement request to database: ${impErr.message}`);
    }

    saveSubmissionsState([newSubmission, ...submissions]);

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
    let oldStatus: SubmissionStatus = 'Submitted';
    const targetSub = submissions.find(s => s.id === submissionId);
    if (targetSub) {
      oldStatus = targetSub.status;
    }

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
      const updatePayload: any = {
        status,
        internal_notes: internalNotes,
        updated_at: new Date().toISOString(),
      };
      if (status === 'Verified') {
        updatePayload.verified_by = user?.id;
        updatePayload.verified_at = new Date().toISOString();
      }

      const { error: updErr } = await supabase
        .from('submissions')
        .update(updatePayload)
        .eq('id', submissionId);

      if (updErr) throw updErr;

      // Record in status_history
      await supabase.from('status_history').insert([
        {
          submission_id: submissionId,
          old_status: oldStatus,
          new_status: status,
          changed_by: user?.id,
          notes: internalNotes || `Status updated to ${status}`,
        },
      ]);

      localStorage.setItem('campuscare_sync_trigger', Date.now().toString());
      await refreshData();
    } catch (e) {
      console.error('DB status update error:', e);
      throw e;
    }
  };

  const assignSubmission = async (submissionId: string, assignedTo: string, assignedTeam: string) => {
    let oldStatus: SubmissionStatus = 'Submitted';
    const targetSub = submissions.find(s => s.id === submissionId);
    if (targetSub) {
      oldStatus = targetSub.status;
    }
    const shouldUpdateStatus = oldStatus === 'Submitted' || oldStatus === 'Under Review' || oldStatus === 'Verified';
    const newStatus: SubmissionStatus = shouldUpdateStatus ? 'Assigned' : oldStatus;

    const updated = submissions.map(sub => {
      if (sub.id === submissionId) {
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
      const updatePayload: any = {
        assigned_to: assignedTo,
        assigned_team: assignedTeam,
        updated_at: new Date().toISOString(),
      };
      if (shouldUpdateStatus) {
        updatePayload.status = 'Assigned';
      }

      const { error: updErr } = await supabase
        .from('submissions')
        .update(updatePayload)
        .eq('id', submissionId);

      if (updErr) throw updErr;

      // Record assignment
      await supabase.from('assignments').insert([
        {
          submission_id: submissionId,
          assigned_to: assignedTo,
          assigned_team: assignedTeam,
          assigned_by: user?.id,
        },
      ]);

      // Record status transition if status was advanced
      if (shouldUpdateStatus) {
        await supabase.from('status_history').insert([
          {
            submission_id: submissionId,
            old_status: oldStatus,
            new_status: 'Assigned',
            changed_by: user?.id,
            notes: `Assigned to ${assignedTo} (${assignedTeam})`,
          },
        ]);
      }

      localStorage.setItem('campuscare_sync_trigger', Date.now().toString());
      await refreshData();
    } catch (e) {
      console.error('DB assignment error:', e);
      throw e;
    }
  };

  const resolveSubmission = async (submissionId: string, resolution: ResolutionRecord) => {
    let oldStatus: SubmissionStatus = 'In Progress';
    const targetSub = submissions.find(s => s.id === submissionId);
    if (targetSub) {
      oldStatus = targetSub.status;
    }

    const assignedPerson = resolution.responsiblePerson || targetSub?.assignedTo || 'CMC Maintenance';
    const assignedTeam = targetSub?.assignedTeam || 'Facilities Maintenance';

    const updated = submissions.map(sub => {
      if (sub.id === submissionId) {
        const newSub: Submission = {
          ...sub,
          status: 'Resolved',
          assignedTo: assignedPerson,
          assignedTeam,
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
      const { error: subErr } = await supabase
        .from('submissions')
        .update({
          status: 'Resolved',
          assigned_to: assignedPerson,
          assigned_team: assignedTeam,
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (subErr) throw subErr;

      const { error: resErr } = await supabase.from('resolution_records').upsert([
        {
          submission_id: submissionId,
          action_taken: resolution.actionTaken,
          responsible_person: resolution.responsiblePerson,
          resolved_date: resolution.resolvedDate || new Date().toISOString(),
          notes: resolution.notes || '',
          before_image_url: resolution.beforeImageUrl || null,
          after_image_url: resolution.afterImageUrl || null,
        },
      ], { onConflict: 'submission_id' });

      if (resErr) throw resErr;

      // Ensure assignment record exists in assignments table
      await supabase.from('assignments').insert([
        {
          submission_id: submissionId,
          assigned_to: assignedPerson,
          assigned_team: assignedTeam,
          assigned_by: user?.id,
        },
      ]);

      // Record in status_history
      await supabase.from('status_history').insert([
        {
          submission_id: submissionId,
          old_status: oldStatus,
          new_status: 'Resolved',
          changed_by: user?.id,
          notes: `Resolved by ${resolution.responsiblePerson}: ${resolution.actionTaken}`,
        },
      ]);

      localStorage.setItem('campuscare_sync_trigger', Date.now().toString());
      await refreshData();
    } catch (e) {
      console.error('DB resolution record error:', e);
      throw e;
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
