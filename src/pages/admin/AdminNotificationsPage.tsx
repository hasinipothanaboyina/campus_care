import React from 'react';
import { useCampusCare } from '../../context/CampusCareContext';
import { Bell, CheckCheck, Info, ShieldAlert } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';

export const AdminNotificationsPage: React.FC = () => {
  const { notifications, markAllNotificationsRead } = useCampusCare();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-slate-900" />
            <span>Admin System Audit & Notifications</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            System notifications and activity log regarding submissions, status shifts, and notifications.
          </p>
        </div>

        <button
          onClick={markAllNotificationsRead}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Mark all read</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <EmptyState title="No Notifications" description="System audit log is empty." />
        ) : (
          notifications.map(item => (
            <div key={item.id} className="p-5 flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <span className="text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-600">{item.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
