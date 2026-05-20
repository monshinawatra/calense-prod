import type { CalendarEvent, EmailThread } from '@/types';

const CAL = 'https://www.googleapis.com/calendar/v3';
const GMAIL = 'https://www.googleapis.com/gmail/v1';

async function gFetch(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Google API error: ${res.status}`);
  return res.json();
}

async function fetchEmailDetails(token: string, id: string, threadId: string): Promise<EmailThread> {
  const params = new URLSearchParams({ format: 'metadata' });
  ['From', 'Subject', 'Date'].forEach(h => params.append('metadataHeaders', h));
  const url = `${GMAIL}/users/me/messages/${id}?${params}`;
  const detail = await gFetch(url, token);
  const headers: Array<{ name: string; value: string }> = detail.payload?.headers ?? [];
  const get = (name: string) => headers.find(h => h.name === name)?.value ?? '';
  return { id, threadId, from: get('From'), subject: get('Subject'), date: get('Date'), snippet: detail.snippet ?? '' };
}

async function fetchAllCalendarIds(token: string): Promise<string[]> {
  const data = await gFetch(`${CAL}/users/me/calendarList`, token);
  const items: Array<{ id: string; selected?: boolean }> = data.items ?? [];
  return items.filter(c => c.selected !== false).map(c => c.id);
}

async function fetchEventsFromCalendar(
  token: string,
  calendarId: string,
  params: URLSearchParams,
): Promise<CalendarEvent[]> {
  try {
    const data = await gFetch(
      `${CAL}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      token,
    );
    return data.items ?? [];
  } catch {
    return [];
  }
}

function mergeAndSort(eventArrays: CalendarEvent[][]): CalendarEvent[] {
  const seen = new Set<string>();
  return eventArrays
    .flat()
    .filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .sort((a, b) => {
      const aTime = 'dateTime' in a.start ? a.start.dateTime : a.start.date;
      const bTime = 'dateTime' in b.start ? b.start.dateTime : b.start.date;
      return aTime < bTime ? -1 : aTime > bTime ? 1 : 0;
    });
}

export async function fetchTodaysEvents(token: string): Promise<CalendarEvent[]> {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const params = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const calendarIds = await fetchAllCalendarIds(token);
  const results = await Promise.all(
    calendarIds.map(id => fetchEventsFromCalendar(token, id, params)),
  );
  return mergeAndSort(results);
}

export async function fetchRecentEmails(token: string): Promise<EmailThread[]> {
  const since = new Date(Date.now() - 86_400_000);
  const dateStr = `${since.getFullYear()}/${String(since.getMonth() + 1).padStart(2, '0')}/${String(since.getDate()).padStart(2, '0')}`;
  const listData = await gFetch(
    `${GMAIL}/users/me/messages?${new URLSearchParams({ labelIds: 'INBOX', q: `after:${dateStr}`, maxResults: '20' })}`,
    token,
  );
  const messages: Array<{ id: string; threadId: string }> = listData.messages ?? [];
  return Promise.all(messages.map(m => fetchEmailDetails(token, m.id, m.threadId)));
}

export async function fetchPastWeekEvents(token: string): Promise<CalendarEvent[]> {
  const now     = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const params  = new URLSearchParams({
    timeMin: weekAgo.toISOString(),
    timeMax: now.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const calendarIds = await fetchAllCalendarIds(token);
  const results = await Promise.all(
    calendarIds.map(id => fetchEventsFromCalendar(token, id, params)),
  );
  return mergeAndSort(results);
}

export async function searchEmailsForMeeting(token: string, title: string, attendees: string[]): Promise<EmailThread[]> {
  const q = [title, ...attendees.slice(0, 3)].join(' OR ');
  const params = new URLSearchParams({ q, maxResults: '10' });
  const listData = await gFetch(
    `${GMAIL}/users/me/messages?${params.toString().replace(/\+/g, '%20')}`,
    token,
  );
  const messages: Array<{ id: string; threadId: string }> = listData.messages ?? [];
  return Promise.all(messages.map(m => fetchEmailDetails(token, m.id, m.threadId)));
}
