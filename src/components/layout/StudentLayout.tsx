import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import {
  LayoutDashboard,
  FileText,
  AlertCircle,
  Lightbulb,
  Sparkles,
  Bell,
  User,
} from 'lucide-react';
import { useCampusCare } from '../../context/CampusCareContext';
import { useAuth } from '../../context/AuthContext';

export const StudentLayout: React.FC = () => {
  const { user } = useAuth();
  const { notifications } = useCampusCare();

  const unreadCount = user
    ? notifications.filter(n => n.userId === user.id && !n.read).length
    : 0;

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Submissions', path: '/my-reports', icon: FileText },
    { label: 'Report Issue', path: '/report-issue', icon: AlertCircle },
    { label: 'Suggestions', path: '/suggestions', icon: Lightbulb },
    { label: 'Improvement Requests', path: '/improvement-requests', icon: Sparkles },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans antialiased">
      <Navbar />

      {/* Secondary Student Navigation Sub-bar */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 scrollbar-none">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.2 bg-indigo-600 text-white text-[10px] rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Minimal Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} CampusCare — Student Voice & Campus Improvement Platform</p>
        </div>
      </footer>
    </div>
  );
};
