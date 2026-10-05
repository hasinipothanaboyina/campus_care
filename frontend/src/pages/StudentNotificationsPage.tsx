import React from 'react';
import { useCampusCare } from '../context/CampusCareContext';
import { useAuth } from '../context/AuthContext';
import { Bell, CheckCheck, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';

export const StudentNotificationsPage: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useCampusCare();
  const { user } = useAuth();

  const userNotifications = user
    ? notifications.filter(n => n.userId === user.id)
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-600" />
            <span>Notifications & Alert Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time updates regarding your submitted issues, verified requests, and CMC actions.
          </p>
        </div>

        {userNotifications.length > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="px-3.5 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {userNotifications.length === 0 ? (
        <EmptyState
          title="No Notifications Yet"
          description="You are all caught up! You'll receive real-time notifications here when status changes occur."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {userNotifications.map(item => (
            <div
              key={item.id}
              onClick={() => markNotificationRead(item.id)}
              className={`p-5 flex items-start gap-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                !item.read ? 'bg-indigo-50/40' : ''
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  item.type === 'success'
                    ? 'bg-emerald-100 text-emerald-600'
                    : item.type === 'status_change'
                    ? 'bg-indigo-100 text-indigo-600'
                    : item.type === 'warning'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                {item.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : item.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <span className="text-[11px] text-slate-400">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                {item.submissionId && (
                  <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block mt-1">
                    ID: {item.submissionId}
                  </span>
                )}
              </div>

              {!item.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 self-center"></span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
