import { useState } from 'react';
import { Sparkles, CalendarDays, Mail, BarChart3 } from 'lucide-react';
import { signInWithGoogle } from '@/lib/supabase';

const features = [
  { icon: CalendarDays, label: 'Daily Briefing' },
  { icon: Mail, label: 'Email Summaries' },
  { icon: BarChart3, label: 'Week Analysis' },
];

export function Landing() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try { await signInWithGoogle(); }
    catch { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-600/8 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
            <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
            Calense
          </span>
        </div>

        {/* Card */}
        <div className="bg-[#0D1224]/90 backdrop-blur-sm border border-[#1E2D4A] rounded-2xl p-8 shadow-2xl shadow-black/40">
          <h1 className="text-xl font-semibold text-white text-center mb-2 tracking-tight">
            Your AI Briefing Layer
          </h1>
          <p className="text-slate-400 text-sm text-center leading-relaxed mb-7">
            Connect Google Calendar and Gmail to surface what actually matters — every morning.
          </p>

          {/* Feature chips */}
          <div className="flex gap-2 justify-center flex-wrap mb-8">
            {features.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium"
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>

          {/* Sign-in button */}
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-50 text-slate-900 font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-60 shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>
        </div>

        {/* Trust footer */}
        <p className="text-slate-600 text-xs text-center mt-5">
          Read-only access · No data stored · Secured with OAuth 2.0
        </p>
      </div>
    </div>
  );
}
