import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
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
  Users,
  ClipboardList,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useCampusCare } from '../../context/CampusCareContext';
import { useAuth } from '../../context/AuthContext';

interface AdminNavGroup {
  groupTitle: string;
  items: {
    label: string;
    path: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
  }[];
}

export const AdminLayout: React.FC = () => {
  const { recurringIssues, submissions, notifications } = useCampusCare();
  const { user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openCriticalCount = submissions.filter(
    s => s.priority === 'Critical' && s.status !== 'Resolved' && s.status !== 'Closed'
  ).length;

  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  // 6 Logical Domain Groups
  const navGroups: AdminNavGroup[] = [
    {
      groupTitle: 'DASHBOARD',
      items: [
        { label: 'Overview', path: '/admin', icon: LayoutDashboard },
        {
          label: 'Notifications',
          path: '/admin/notifications',
          icon: Bell,
          badge: unreadNotificationCount > 0 ? unreadNotificationCount : undefined,
          badgeColor: 'bg-indigo-600',
        },
      ],
    },
    {
      groupTitle: 'STUDENT MANAGEMENT',
      items: [
        { label: 'Student Management', path: '/admin/students', icon: Users },
      ],
    },
    {
      groupTitle: 'CAMPUS ISSUE MANAGEMENT',
      items: [
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
        { label: 'Resolution Management', path: '/admin/resolution-management', icon: CheckSquare },
      ],
    },
    {
      groupTitle: 'SUGGESTIONS & FEEDBACK',
      items: [
        { label: 'Suggestions & Requests', path: '/admin/suggestions-requests', icon: Lightbulb },
        { label: 'College Feedback', path: '/admin/feedback', icon: ClipboardList },
      ],
    },
    {
      groupTitle: 'REPORTS & INSIGHTS',
      items: [
        { label: 'CMC Insights', path: '/admin/cmc-insights', icon: Sparkles },
        { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
      ],
    },
    {
      groupTitle: 'SYSTEM',
      items: [
        { label: 'Settings', path: '/admin/settings', icon: SettingsIcon },
      ],
    },
  ];

  // Helper to find current active item info for breadcrumb
  const currentItem = navGroups
    .flatMap(g => g.items.map(i => ({ ...i, group: g.groupTitle })))
    .find(i => (i.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(i.path)));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 font-sans antialiased">
      <Navbar />

      {/* Mobile Top Sub-Header */}
      <div className="lg:hidden bg-slate-900 text-white border-b border-slate-800 px-4 py-3 sticky top-16 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {currentItem?.group || 'ADMIN'}
            </span>
            <span className="text-xs font-bold text-white truncate max-w-[160px] sm:max-w-xs">
              {currentItem?.label || 'Administration'}
            </span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
            aria-label="Toggle Admin Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-rose-400" /> : <Menu className="w-4 h-4 text-indigo-400" />}
            <span>{mobileMenuOpen ? 'Close' : 'Admin Menu'}</span>
          </button>
        </div>
      </div>

      {/* Main Admin Wrapper */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 bg-slate-900 border-r border-slate-800 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          {/* Header Tag */}
          <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">ADMINISTRATION</h3>
                <p className="text-[10px] text-slate-400">Campus Management Cell</p>
              </div>
            </div>
          </div>

          {/* Grouped Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-5">
            {navGroups.map(group => (
              <div key={group.groupTitle} className="space-y-1">
                <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {group.groupTitle}
                </div>
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/admin'}
                        className={({ isActive }) =>
                          `group flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all ${
                            isActive
                              ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-900/30'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                          }`
                        }
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className="w-4 h-4 shrink-0 transition-colors" />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge !== undefined && (
                          <span
                            className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-full font-bold text-white shadow-sm shrink-0 ${
                              item.badgeColor || 'bg-indigo-500'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Sidebar Footer / System Status */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-200">Supabase Connected</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
              <span className="truncate">RLS Enforced • JWT Auth</span>
              <span className="font-mono text-indigo-400 font-bold">Admin ID</span>
            </div>
          </div>
        </aside>

        {/* Mobile Slide-Over Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-out Panel */}
            <div className="relative flex-1 max-w-xs w-full bg-slate-900 text-slate-300 h-full overflow-y-auto p-4 space-y-6 shadow-2xl border-r border-slate-800 z-10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm font-bold text-white">CampusCare Admin</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="mt-4 space-y-5">
                  {navGroups.map(group => (
                    <div key={group.groupTitle} className="space-y-1">
                      <div className="px-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                        {group.groupTitle}
                      </div>
                      <div className="space-y-0.5">
                        {group.items.map(item => {
                          const Icon = item.icon;
                          return (
                            <NavLink
                              key={item.path}
                              to={item.path}
                              end={item.path === '/admin'}
                              onClick={() => setMobileMenuOpen(false)}
                              className={({ isActive }) =>
                                `flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all ${
                                  isActive
                                    ? 'bg-indigo-600 text-white font-semibold shadow-md'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                                }`
                              }
                            >
                              <div className="flex items-center gap-2.5">
                                <Icon className="w-4 h-4 shrink-0" />
                                <span>{item.label}</span>
                              </div>
                              {item.badge !== undefined && (
                                <span
                                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold text-white ${
                                    item.badgeColor || 'bg-indigo-500'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400">
                <p>Campus Management Cell Portal</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Logged in as {user?.email || 'Admin'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Breadcrumb Bar */}
          <div className="hidden sm:flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200/80 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-400">Admin</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="font-semibold text-slate-500">{currentItem?.group || 'Management'}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="font-bold text-slate-900">{currentItem?.label || 'Overview'}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                Role: <strong className="text-slate-900">ADMIN / CMC</strong>
              </span>
            </div>
          </div>

          {/* Main Outlet */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </main>

          {/* Admin Footer */}
          <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
            <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
              <p>© {new Date().getFullYear()} CampusCare Management Portal — CMC Operations & Governance</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
