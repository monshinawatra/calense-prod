import { useEffect, useState, useCallback } from 'react';
import { Clock, Users, Calendar } from 'lucide-react';
import { fetchTodaysEvents } from '@/lib/google';
import { getGoogleAccessToken } from '@/lib/supabase';
import { ErrorCard } from './ErrorCard';
import type { CalendarEvent } from '@/types';

interface EventCardListProps {
  onEventClick:     (event: CalendarEvent) => void;
  selectedEventId?: string;
}

function isPast(event: CalendarEvent): boolean {
  if (!('dateTime' in event.end)) return false;
  return new Date(event.end.dateTime) < new Date();
}

export function EventCardList({ onEventClick, selectedEventId }: EventCardListProps) {
  const [events,  setEvents]  = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const token = await getGoogleAccessToken();
        if (!token) throw new Error('Not signed in with Google');
        const data = await fetchTodaysEvents(token);
        if (!cancelled) setEvents(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => { return load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-2 pt-1">
        {[72, 64, 72].map((h, i) => (
          <div key={i} className={`h-${h === 72 ? '18' : '16'} rounded-xl animate-shimmer`} style={{ height: h }} />
        ))}
      </div>
    );
  }

  if (error) return <ErrorCard message={error} onRetry={load} />;

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10">
        <div className="w-10 h-10 rounded-xl bg-[#0D1526] border border-[#1E2D4A] flex items-center justify-center">
          <Calendar className="w-4 h-4 text-slate-600" aria-hidden="true" />
        </div>
        <p className="text-slate-600 text-xs text-center">No events today</p>
      </div>
    );
  }

  const allDay = events.filter(e => !('dateTime' in e.start));
  const timed  = events.filter(e =>  'dateTime' in e.start);

  return (
    <div className="space-y-3">
      {/* All-day events */}
      {allDay.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest px-1 mb-1.5">All day</p>
          <div className="space-y-1.5">
            {allDay.map(event => (
              <EventCard
                key={event.id}
                event={event}
                time="All day"
                selected={event.id === selectedEventId}
                past={false}
                onClick={() => onEventClick(event)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Timed events */}
      {timed.length > 0 && (
        <div>
          {allDay.length > 0 && (
            <p className="text-[10px] text-slate-600 uppercase tracking-widest px-1 mb-1.5">Scheduled</p>
          )}
          <div className="space-y-1.5">
            {timed.map(event => {
              const time = new Date((event.start as { dateTime: string }).dateTime)
                .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  time={time}
                  selected={event.id === selectedEventId}
                  past={isPast(event)}
                  onClick={() => onEventClick(event)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface EventCardProps {
  event:    CalendarEvent;
  time:     string;
  selected: boolean;
  past:     boolean;
  onClick:  () => void;
}

function EventCard({ event, time, selected, past, onClick }: EventCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer group ${
        selected
          ? 'bg-indigo-500/15 border-indigo-500/40 shadow-sm shadow-indigo-500/10'
          : past
            ? 'bg-transparent border-[#1A2540] opacity-50 hover:opacity-75'
            : 'bg-[#0D1526]/60 border-[#1E2D4A] hover:bg-[#0D1526] hover:border-[#2A3D5E]'
      }`}
    >
      {/* Title row */}
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            selected ? 'bg-indigo-400' : past ? 'bg-slate-700' : 'bg-indigo-500/60 group-hover:bg-indigo-400'
          }`}
          aria-hidden="true"
        />
        <p className={`text-xs font-semibold truncate ${selected ? 'text-indigo-200' : past ? 'text-slate-500' : 'text-slate-200'}`}>
          {event.summary ?? '(No title)'}
        </p>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 pl-3.5">
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="w-3 h-3" aria-hidden="true" />
          {time}
        </span>
        {(event.attendees?.length ?? 0) > 0 && (
          <span
            className="flex items-center gap-1 text-xs text-slate-600"
            aria-label={`${event.attendees!.length} attendees`}
          >
            <Users className="w-3 h-3" aria-hidden="true" />
            {event.attendees!.length}
          </span>
        )}
      </div>
    </button>
  );
}
