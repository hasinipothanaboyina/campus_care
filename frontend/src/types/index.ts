export type UserRole = 'STUDENT' | 'ADMIN' | 'CMC' | 'student' | 'admin' | 'cmc';

export interface UserProfile {
  id: string;
  fullName: string;
  studentId?: string; // Roll number for students
  email: string;
  department?: string;
  year?: string;
  section?: string;
  role: UserRole;
  avatarUrl?: string;
  isApproved?: boolean;
  lastLogin?: string;
  createdAt: string;
}

export type SubmissionType = 'issue' | 'suggestion' | 'improvement_request';

export type IssueCategory =
  | 'Classroom'
  | 'Electrical'
  | 'Water'
  | 'Cleanliness'
  | 'Internet / Network'
  | 'Equipment'
  | 'Infrastructure'
  | 'Safety'
  | 'Transport'
  | 'Other';

export type SuggestionCategory =
  | 'Library'
  | 'Study spaces'
  | 'Campus facilities'
  | 'Student activities'
  | 'Digital services'
  | 'Sustainability'
  | 'Other';

export type ImprovementCategory =
  | 'Water Facility'
  | 'Classroom Equipment'
  | 'Study Area'
  | 'Lighting & Power'
  | 'Accessibility'
  | 'Infrastructure'
  | 'Safety & Security'
  | 'Other';

export type Category = IssueCategory | SuggestionCategory | ImprovementCategory;

export type Urgency = 'Low' | 'Medium' | 'High' | 'Critical';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export type SubmissionStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Verified'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Closed'
  | 'Approved'
  | 'Rejected';

export interface ResolutionRecord {
  actionTaken: string;
  responsiblePerson: string;
  resolvedDate: string;
  notes?: string;
  beforeImageUrl?: string;
  afterImageUrl?: string;
}

export interface Submission {
  id: string; // e.g. CC-2026-104
  type: SubmissionType;
  title: string;
  description: string;
  category: Category;
  building?: string;
  room?: string;
  location: string;
  urgency: Urgency;
  priority: Priority;
  priorityScore: number; // Rule-based transparent calculated score
  status: SubmissionStatus;
  imageUrl?: string;
  studentId: string; // User ID who created it
  studentName: string;
  studentRollNumber?: string;
  studentDepartment?: string;
  supportCount: number;
  supportedUserIds: string[]; // List of user IDs who upvoted/supported this
  assignedTo?: string; // Responsible person
  assignedTeam?: string; // Responsible department / team
  internalNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  reason?: string; // For improvement requests
  expectedBenefit?: string; // For improvement requests
  resolution?: ResolutionRecord;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringIssueGroup {
  id: string;
  title: string;
  category: string;
  location: string;
  building: string;
  room: string;
  relatedSubmissions: Submission[];
  totalReports: number;
  totalSupports: number;
  priority: Priority;
  status: SubmissionStatus;
  firstReportedAt: string;
  latestReportedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'status_change';
  submissionId?: string;
  read: boolean;
  createdAt: string;
}

export interface CampusInsight {
  id: string;
  type: 'alert' | 'trend' | 'recommendation' | 'stat';
  title: string;
  description: string;
  metric?: string;
  actionableSuggestion?: string;
}
