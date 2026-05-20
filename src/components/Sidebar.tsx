import { Sparkles, CalendarDays, BarChart3, LogOut } from 'lucide-react';
import { signOut } from '@/lib/supabase';
import type { AppView } from '@/types';

interface SidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

const navItems: Array<{ view: AppView; label: string; icon: React.ElementType }> = [
  { view: 'briefing',  label: 'Daily Briefing', icon: CalendarDays },
  { view: 'analysis',  label: 'Analyse Week',   icon: BarChart3 },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-56 flex flex-col bg-[#0B1120] border-r border-[#1E2D4A] p-4 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" aria-hidden="true" />
        </div>
        <span className="font-bold text-white text-sm tracking-tight">Calense</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5" aria-label="Main navigation">
        {navItems.map(({ view, label, icon: Icon }) => {
          const active = activeView === view;
          return (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                active
                  ? 'bg-indigo-500/15 text-indigo-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {active && (
                <span className="absolute left-4 w-0.5 h-5 bg-indigo-400 rounded-full" aria-hidden="true" />
              )}
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Sign out */}
      <button
        onClick={() => signOut().catch(console.error)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-200 cursor-pointer"
      >
        <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
        Sign out
      </button>
    </aside>
  );
}
