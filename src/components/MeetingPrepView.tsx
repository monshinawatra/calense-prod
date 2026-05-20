import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Users, Clock, MapPin } from 'lucide-react';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ErrorCard } from './ErrorCard';
import { fetchStream } from '@/lib/stream';
import { getGoogleAccessToken } from '@/lib/supabase';
import type { CalendarEvent, MeetingPrepResult } from '@/types';

interface MeetingPrepViewProps {
  event:  CalendarEvent;
  onBack: () => void;
}

function Section({ title, items, ordered = false }: { title: string; items: string[]; ordered?: boolean }) {
  if (items.length === 0) return null;
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">{title}</h3>
      <Tag className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm text-slate-300 leading-relaxed">
            <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-xs text-indigo-400 font-semibold" aria-hidden="true">
              {ordered ? i + 1 : '·'}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </Tag>
    </div>
  );
}

export function MeetingPrepView({ event, onBack }: MeetingPrepViewProps) {
  const [result,  setResult]  = useState<MeetingPrepResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const googleAccessToken = await getGoogleAccessToken();
      if (!googleAccessToken) throw new Error('Not signed in with Google');
      const data = await fetchStream<MeetingPrepResult>('/api/meeting-prep', {
        googleAccessToken,
        eventId:   event.id,
        title:     event.summary,
        attendees: event.attendees?.map(a => a.email) ?? [],
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meeting prep');
    } finally {
      setLoading(false);
    }
  }, [event.id, event.summary, event.attendees]);

  useEffect(() => { load(); }, [load]);

  const eventTime =
    'dateTime' in event.start
      ? new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : event.start.date;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-[#0D1526] text-slate-500 hover:text-slate-300 transition-all duration-200 cursor-pointer"
          aria-label="Back to briefing"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">{event.summary ?? 'Meeting'}</h2>
        </div>
      </div>

      {/* Meeting metadata card */}
      <div className="p-4 rounded-2xl bg-[#0D1526] border border-[#1E2D4A] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" aria-hidden="true" />
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
            {eventTime}
          </span>
          {(event.attendees?.length ?? 0) > 0 && (
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
              {event.attendees!.length} attendee{event.attendees!.length !== 1 ? 's' : ''}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              {event.location}
            </span>
          )}
        </div>
      </div>

      {loading && <LoadingSkeleton />}
      {error   && <ErrorCard message={error} onRetry={load} />}
      {result  && (
        <div className="space-y-6">
          <Section title="Talking Points"   items={result.talking_points} />
          <Section title="Open Items"       items={result.open_items} />
          <Section title="Suggested Agenda" items={result.suggested_agenda} ordered />
        </div>
      )}
    </div>
  );
}
