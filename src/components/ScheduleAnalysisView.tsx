import { useState, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, TrendingUp, Lightbulb } from 'lucide-react';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ErrorCard } from './ErrorCard';
import { fetchStream } from '@/lib/stream';
import { getGoogleAccessToken } from '@/lib/supabase';
import type { AnalysisResult } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  meetings:   '#6366F1',
  focus_time: '#10B981',
  admin:      '#F59E0B',
  personal:   '#8B5CF6',
  other:      '#475569',
};

export function ScheduleAnalysisView() {
  const [result,  setResult]  = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const googleAccessToken = await getGoogleAccessToken();
      if (!googleAccessToken) throw new Error('Not signed in with Google');
      const data = await fetchStream<AnalysisResult>('/api/analyze', { googleAccessToken });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error)   return <ErrorCard message={error} onRetry={analyze} />;

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-violet-400" aria-hidden="true" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold mb-1">Week in Review</p>
          <p className="text-slate-500 text-sm">Analyse how your last 7 days were spent.</p>
        </div>
        <button
          onClick={analyze}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-95 cursor-pointer"
        >
          Analyse My Week
        </button>
      </div>
    );
  }

  const chartData = Object.entries(result.categories)
    .filter(([, v]) => v.hours > 0)
    .map(([name, v]) => ({
      name:       name.replace('_', ' '),
      value:      parseFloat(v.hours.toFixed(1)),
      percentage: v.percentage,
      color:      CATEGORY_COLORS[name] ?? '#475569',
    }));

  const totalHours = chartData.reduce((s, d) => s + d.value, 0).toFixed(1);
  const topCategory = [...chartData].sort((a, b) => b.value - a.value)[0];

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-bold text-white tracking-tight">Week in Review</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-[#0D1526] border border-[#1E2D4A]">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Total Hours</p>
          <p className="text-2xl font-bold text-white">{totalHours}<span className="text-sm font-normal text-slate-500 ml-1">h</span></p>
        </div>
        {topCategory && (
          <div className="p-4 rounded-2xl bg-[#0D1526] border border-[#1E2D4A]">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Most Time</p>
            <p className="text-base font-bold text-white capitalize truncate">{topCategory.name}</p>
            <p className="text-xs text-slate-500">{topCategory.percentage}% of week</p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="p-4 rounded-2xl bg-[#0D1526] border border-[#1E2D4A]">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={100}
              dataKey="value"
              paddingAngle={2}
              label={({ percentage }: { percentage: number }) => `${percentage}%`}
              labelLine={false}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value}h`, 'Hours']}
              contentStyle={{ background: '#0D1526', border: '1px solid #1E2D4A', borderRadius: '0.75rem', fontSize: '12px' }}
              itemStyle={{ color: '#CBD5E1' }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span style={{ color: '#94A3B8', fontSize: '12px', textTransform: 'capitalize' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Observations */}
      {result.observations.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            <TrendingUp className="w-3.5 h-3.5 inline mr-1.5 text-indigo-400" aria-hidden="true" />
            Observations
          </h3>
          <ul className="space-y-2">
            {result.observations.map((obs, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-300 leading-relaxed p-3 rounded-xl bg-[#0D1526] border border-[#1E2D4A]">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-2" aria-hidden="true" />
                {obs}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            <Lightbulb className="w-3.5 h-3.5 inline mr-1.5 text-emerald-400" aria-hidden="true" />
            Recommendations
          </h3>
          <ul className="space-y-2">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-300 leading-relaxed p-3 rounded-xl bg-[#0D1526] border border-[#1E2D4A] border-l-2 border-l-emerald-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-2" aria-hidden="true" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
