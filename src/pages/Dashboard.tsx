import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { BriefingView } from '@/components/BriefingView';
import { MeetingPrepView } from '@/components/MeetingPrepView';
import { ScheduleAnalysisView } from '@/components/ScheduleAnalysisView';
import { EventCardList } from '@/components/EventCardList';
import type { AppView, CalendarEvent } from '@/types';

const VIEW_LABELS: Record<AppView, string> = {
  briefing:     'Daily Briefing',
  'meeting-prep': 'Meeting Prep',
  analysis:     'Week Analysis',
};

export function Dashboard() {
  const [activeView, setActiveView]       = useState<AppView>('briefing');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setActiveView('meeting-prep');
  };

  const handleViewChange = (view: AppView) => {
    setActiveView(view);
    setSelectedEvent(null);
  };

  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dayNum   = now.getDate();
  const dayName  = now.toLocaleDateString('en-US', { weekday: 'long' });
  const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const pageTitle = activeView === 'meeting-prep' && selectedEvent
    ? selectedEvent.summary ?? 'Meeting Prep'
    : VIEW_LABELS[activeView];

  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden">
      <Sidebar activeView={activeView} onViewChange={handleViewChange} />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Events panel ── */}
        <aside className="w-64 flex flex-col border-r border-[#1E2D4A] shrink-0 bg-[#060D1A]">

          {/* Date card header */}
          <div className="p-4 border-b border-[#1E2D4A]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex flex-col items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
                <span className="text-white text-xl font-bold leading-none">{dayNum}</span>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{dayName}</p>
                <p className="text-slate-500 text-xs">{monthYear}</p>
              </div>
            </div>
          </div>

          {/* Events list */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-1 mb-2">
              Today's Schedule
            </p>
            <EventCardList onEventClick={handleEventClick} selectedEventId={selectedEvent?.id} />
          </div>
        </aside>

        {/* ── Main area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Top bar */}
          <header className="h-14 border-b border-[#1E2D4A] px-6 flex items-center justify-between shrink-0 bg-[#020617]/80 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500" aria-hidden="true" />
              <h1 className="text-sm font-semibold text-white tracking-tight">{pageTitle}</h1>
            </div>
            <span className="text-xs text-slate-500 font-medium">{greeting}</span>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {activeView === 'briefing' && <BriefingView />}
            {activeView === 'meeting-prep' && selectedEvent && (
              <MeetingPrepView event={selectedEvent} onBack={() => handleViewChange('briefing')} />
            )}
            {activeView === 'analysis' && <ScheduleAnalysisView />}
          </main>
        </div>

      </div>
    </div>
  );
}
