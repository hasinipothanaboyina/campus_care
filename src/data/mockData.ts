import { Submission, UserProfile, NotificationItem } from '../types';

export const INITIAL_ADMIN_USER: UserProfile = {
  id: 'usr-admin-01',
  fullName: 'CMC Operations Admin',
  email: 'admin@campuscare.edu',
  role: 'ADMIN',
  department: 'Campus Management Cell (CMC)',
  createdAt: new Date().toISOString(),
};

export const INITIAL_STUDENT_USER: UserProfile = {
  id: 'usr-student-01',
  fullName: 'Student User',
  studentId: '2026-CSE-091',
  email: 'student@campuscare.edu',
  department: 'Computer Science & Engineering',
  year: '3rd Year',
  section: 'Section A',
  role: 'STUDENT',
  createdAt: new Date().toISOString(),
};

// Pure real data arrays - no fake or hardcoded mock concerns
export const INITIAL_SUBMISSIONS: Submission[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
