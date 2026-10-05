import React, { useState } from 'react';
import { useCampusCare } from '../../context/CampusCareContext';
import { Settings as SettingsIcon, Database, ShieldCheck, RefreshCw, Key, CheckCircle2 } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { refreshData, isLoadingData } = useCampusCare();
  const [refreshed, setRefreshed] = useState(false);

  const handleSync = async () => {
    await refreshData();
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-slate-900" />
          <span>Admin Platform Settings & Database Governance</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">Configure real database sync, role policies, and system parameters.</p>
      </div>

      {refreshed && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Database connection synchronized with Supabase PostgreSQL!</span>
        </div>
      )}

      {/* Supabase Connection Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Supabase PostgreSQL Connection</h2>
            <p className="text-xs text-slate-500">Row Level Security (RLS) & Real-time Persistence Active</p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="font-semibold text-slate-700">Environment Host:</span>
            <span className="font-mono text-indigo-600">https://vkquibpblhncdxteihkt.supabase.co</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="font-semibold text-slate-700">Authentication Protocol:</span>
            <span className="font-medium text-emerald-700">JWT Token Auth + Supabase Auth</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="font-semibold text-slate-700">Row Level Security (RLS):</span>
            <span className="font-medium text-emerald-700">ENFORCED (Role Isolation Active)</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSync}
            disabled={isLoadingData}
            className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span>{isLoadingData ? 'Synchronizing...' : 'Sync Database State'}</span>
          </button>
        </div>
      </div>

      {/* Security Policies Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <span>Security & Governance Policies</span>
        </div>
        <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5 leading-relaxed">
          <li><strong>Student Data Isolation:</strong> Students can only view and update their own submitted records.</li>
          <li><strong>Admin Access:</strong> Admin/CMC role is protected via Supabase RLS and cannot be altered by frontend calls.</li>
          <li><strong>Secret Protection:</strong> Service role keys are kept off frontend bundle; standard anon key handles authenticated requests.</li>
        </ul>
      </div>
    </div>
  );
};
