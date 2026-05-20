export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start: { dateTime: string; timeZone?: string } | { date: string };
  end: { dateTime: string; timeZone?: string } | { date: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  location?: string;
}

export interface EmailThread {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
}

export interface BriefingResult {
  schedule_summary: string;
  top_emails: Array<{
    sender: string;
    subject: string;
    summary: string;
    urgency: 'high' | 'medium' | 'low';
  }>;
  focus_blocks: Array<{
    start: string;
    end: string;
    duration_minutes: number;
  }>;
}

export interface MeetingPrepResult {
  talking_points: string[];
  open_items: string[];
  suggested_agenda: string[];
}

export interface AnalysisResult {
  categories: Record<string, { hours: number; percentage: number }>;
  observations: string[];
  recommendations: string[];
}

export type AppView = 'briefing' | 'meeting-prep' | 'analysis';
