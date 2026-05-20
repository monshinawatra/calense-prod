import { useState, useCallback } from 'react';
import { RefreshCw, Clock, Sparkles } from 'lucide-react';
import { EmailSummaryRow } from './EmailSummaryRow';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ErrorCard } from './ErrorCard';
import { fetchStream } from '@/lib/stream';
import { getGoogleAccessToken } from '@/lib/supabase';
import type { BriefingResult } from '@/types';

export function BriefingView() {
  const [result,  setResult]  = useState<BriefingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const generate = useCallback(async (force = false) => {
    if (result && !force) return;
    setLoading(true);
    setError(null);
    try {
      const googleAccessToken = await getGoogleAccessToken();
      if (!googleAccessToken) throw new Error('Not signed in with Google');
      const data = await fetchStream<BriefingResult>('/api/briefing', { googleAccessToken });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate briefing');
    } finally {
      setLoading(false);
    }
  }, [result]);

  if (loading) return <LoadingSkeleton />;
  if (error)   return <ErrorCard message={error} onRetry={() => generate(true)} />;

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-indigo-400" aria-hidden="true" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold mb-1">Ready for your briefing</p>
          <p className="text-slate-500 text-sm">Generate an AI summary of your day.</p>
        </div>
        <button
          onClick={() => generate()}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-95 cursor-pointer"
        >
          Generate Briefing
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Today's Briefing</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => generate(true)}
          className="p-2 rounded-xl hover:bg-[#0D1526] text-slate-500 hover:text-slate-300 transition-all duration-200 cursor-pointer"
          title="Refresh briefing"
          aria-label="Refresh briefing"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Schedule summary */}
      <div className="p-5 rounded-2xl bg-[#0D1526] border border-[#1E2D4A] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" aria-hidden="true" />
        <p className="text-slate-300 text-sm leading-relaxed">{result.schedule_summary}</p>
      </div>

      {/* Focus blocks */}
      {result.focus_blocks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Focus Blocks</h3>
          <div className="space-y-2">
            {result.focus_blocks.map((block, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#0D1526] border border-[#1E2D4A] border-l-2 border-l-indigo-500">
                <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" aria-hidden="true" />
                <span className="text-sm text-slate-300 font-medium">
                  {block.start}–{block.end}
                </span>
                <span className="text-xs text-slate-600 ml-auto">{block.duration_minutes} min</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emails */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Emails to Review</h3>
        {result.top_emails.length > 0
          ? (
            <div className="space-y-2">
              {result.top_emails.map((e, i) => <EmailSummaryRow key={i} email={e} />)}
            </div>
          )
          : <p className="text-slate-600 text-sm py-2">Inbox clear.</p>
        }
      </div>
    </div>
  );
}
