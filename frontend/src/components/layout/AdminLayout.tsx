import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import {
  LayoutDashboard,
  Layers,
  AlertTriangle,
  Repeat,
  Lightbulb,
  CheckSquare,
  BarChart3,
  Sparkles,
  Bell,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useCampusCare } from '../../context/CampusCareContext';

export const AdminLayout: React.FC = () => {
  const { recurringIssues, submissions } = useCampusCare();

  const openCriticalCount = submissions.filter(
    s => s.priority === 'Critical' && s.status !== 'Resolved' && s.status !== 'Closed'
  ).length;

  const adminNavItems = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Student Mgmt', path: '/admin/students', icon: Users },
    { label: 'All Submissions', path: '/admin/submissions', icon: Layers },
    {
      label: 'Priority Queue',
      path: '/admin/priority-queue',
      icon: AlertTriangle,
      badge: openCriticalCount > 0 ? openCriticalCount : undefined,
      badgeColor: 'bg-rose-600',
    },
    {
      label: 'Recurring Issues',
      path: '/admin/recurring-issues',
      icon: Repeat,
      badge: recurringIssues.length > 0 ? recurringIssues.length : undefined,
      badgeColor: 'bg-amber-600',
    },
    { label: 'Suggestions & Requests', path: '/admin/suggestions-requests', icon: Lightbulb },
    { label: 'Resolution Mgmt', path: '/admin/resolution-management', icon: CheckSquare },
    { label: 'CMC Insights', path: '/admin/cmc-insights', icon: Sparkles },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { label: 'Notifications', path: '/admin/notifications', icon: Bell },
    { label: 'Settings', path: '/admin/settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans antialiased">
      <Navbar />

      {/* Admin Secondary Header */}
      <div className="bg-slate-900 text-white border-b border-slate-800 shadow-sm sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2.5 scrollbar-none">
            {adminNavItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full font-bold text-white ${
                        item.badgeColor || 'bg-indigo-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Admin Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Admin Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} CampusCare Management Portal — CMC Operations & Governance</p>
        </div>
      </footer>
    </div>
  );
};
