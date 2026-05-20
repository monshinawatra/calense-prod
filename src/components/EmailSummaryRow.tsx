import type { BriefingResult } from '@/types';

type EmailItem = BriefingResult['top_emails'][number];

const urgencyConfig: Record<EmailItem['urgency'], { badge: string; dot: string }> = {
  high:   { badge: 'bg-red-500/15 text-red-400 border-red-500/25',    dot: 'bg-red-400' },
  medium: { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25', dot: 'bg-amber-400' },
  low:    { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-400' },
};

export function EmailSummaryRow({ email }: { email: EmailItem }) {
  const config = urgencyConfig[email.urgency];
  return (
    <div className="p-4 rounded-xl bg-[#0D1526] border border-[#1E2D4A] hover:border-[#2A3D5E] transition-colors duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-200 truncate">{email.sender}</span>
          </div>
          <p className="text-sm text-slate-400 truncate mb-1.5">{email.subject}</p>
          <p className="text-xs text-slate-600 leading-relaxed">{email.summary}</p>
        </div>
        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border shrink-0 font-medium ${config.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
          {email.urgency}
        </span>
      </div>
    </div>
  );
}
