import { AlertTriangle } from 'lucide-react';

interface ErrorCardProps {
  message:  string;
  onRetry?: () => void;
}

export function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-14 text-center" role="alert">
      <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-red-400" aria-hidden="true" />
      </div>
      <div>
        <p className="text-slate-300 text-sm font-medium mb-1">Something went wrong</p>
        <p className="text-slate-500 text-xs max-w-xs leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 bg-[#0D1526] hover:bg-[#111D35] border border-[#1E2D4A] hover:border-[#2A3D5E] text-slate-300 text-sm rounded-xl transition-all duration-200 font-medium cursor-pointer"
        >
          Try again
        </button>
      )}
    </div>
  );
}
