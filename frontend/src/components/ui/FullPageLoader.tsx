import { Rocket } from 'lucide-react';

export default function FullPageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center animate-pulse-slow">
          <Rocket className="w-8 h-8 text-white" />
        </div>
        <div className="absolute inset-0 rounded-2xl bg-brand-500/30 blur-xl animate-pulse-slow" />
      </div>
      <p className="text-slate-400 text-sm animate-pulse">Loading…</p>
    </div>
  );
}
