import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CampusCareProvider } from './context/CampusCareContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Layouts
import { StudentLayout } from './components/layout/StudentLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Auth Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';

// Student Pages
import { StudentDashboard } from './pages/StudentDashboard';
import { MySubmissionsPage } from './pages/MySubmissionsPage';
import { ReportIssueStepForm } from './pages/ReportIssueStepForm';
import { SuggestionsPage } from './pages/SuggestionsPage';
import { ImprovementRequestsPage } from './pages/ImprovementRequestsPage';
import { StudentNotificationsPage } from './pages/StudentNotificationsPage';
import { StudentProfilePage } from './pages/StudentProfilePage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AllSubmissionsPage } from './pages/admin/AllSubmissionsPage';
import { PriorityQueuePage } from './pages/admin/PriorityQueuePage';
import { RecurringIssuesPage } from './pages/admin/RecurringIssuesPage';
import { SuggestionsRequestsAdminPage } from './pages/admin/SuggestionsRequestsAdminPage';
import { CMCInsightsPage } from './pages/admin/CMCInsightsPage';
import { ResolutionManagementPage } from './pages/admin/ResolutionManagementPage';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { AdminNotificationsPage } from './pages/admin/AdminNotificationsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

export default function App() {
  return (
    <AuthProvider>
      <CampusCareProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Student Protected Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<StudentDashboard />} />
              <Route path="/my-reports" element={<MySubmissionsPage />} />
              <Route path="/report-issue" element={<ReportIssueStepForm />} />
              <Route path="/suggestions" element={<SuggestionsPage />} />
              <Route path="/improvement-requests" element={<ImprovementRequestsPage />} />
              <Route path="/notifications" element={<StudentNotificationsPage />} />
              <Route path="/profile" element={<StudentProfilePage />} />
            </Route>

            {/* Admin Protected Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="ADMIN">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="submissions" element={<AllSubmissionsPage />} />
              <Route path="priority-queue" element={<PriorityQueuePage />} />
              <Route path="recurring-issues" element={<RecurringIssuesPage />} />
              <Route path="suggestions-requests" element={<SuggestionsRequestsAdminPage />} />
              <Route path="cmc-insights" element={<CMCInsightsPage />} />
              <Route path="resolution-management" element={<ResolutionManagementPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="notifications" element={<AdminNotificationsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </CampusCareProvider>
    </AuthProvider>
  );
}
