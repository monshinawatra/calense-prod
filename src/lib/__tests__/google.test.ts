import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTodaysEvents, fetchRecentEmails, fetchPastWeekEvents, searchEmailsForMeeting } from '../google';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const TOKEN = 'test-token';

function mockOkResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(''),
  });
}

function mockErrorResponse(status = 401) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('Unauthorized'),
  });
}

// fetchTodaysEvents now calls calendarList first, then fetches events per calendar.
// call[0] = calendarList, call[1] = events for the first calendar id.

describe('fetchTodaysEvents', () => {
  beforeEach(() => mockFetch.mockReset());

  it('calls Google Calendar API with auth header and returns items', async () => {
    const events = [{ id: '1', summary: 'Standup' }];
    // First call: calendarList returns one calendar with id 'primary'
    mockFetch
      .mockResolvedValueOnce(mockOkResponse({ items: [{ id: 'primary', selected: true }] }))
      .mockResolvedValueOnce(mockOkResponse({ items: events }));

    const result = await fetchTodaysEvents(TOKEN);

    expect(result).toEqual(events);
    // calls[0] is calendarList, calls[1] is the events fetch
    const [url, opts] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(url).toContain('/events');
    expect(url).toContain('timeMin');
    expect((opts.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('returns empty array when items is missing', async () => {
    // calendarList returns no calendars -> no events fetched
    mockFetch.mockResolvedValue(mockOkResponse({}));
    expect(await fetchTodaysEvents(TOKEN)).toEqual([]);
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(401));
    await expect(fetchTodaysEvents(TOKEN)).rejects.toThrow('Google API error: 401');
  });
});

describe('fetchRecentEmails', () => {
  beforeEach(() => mockFetch.mockReset());

  it('fetches message list then details, returns mapped threads', async () => {
    const messages = [{ id: 'msg1', threadId: 'thread1' }];
    const detail = {
      snippet: 'Hello world',
      payload: {
        headers: [
          { name: 'From', value: 'Alice <alice@example.com>' },
          { name: 'Subject', value: 'Budget review' },
          { name: 'Date', value: 'Mon, 1 Jan 2026' },
        ],
      },
    };

    mockFetch
      .mockResolvedValueOnce(mockOkResponse({ messages }))
      .mockResolvedValueOnce(mockOkResponse(detail));

    const result = await fetchRecentEmails(TOKEN);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'msg1',
      threadId: 'thread1',
      from: 'Alice <alice@example.com>',
      subject: 'Budget review',
      date: 'Mon, 1 Jan 2026',
      snippet: 'Hello world',
    });
  });

  it('returns empty array when no messages', async () => {
    mockFetch.mockResolvedValue(mockOkResponse({ messages: undefined }));
    expect(await fetchRecentEmails(TOKEN)).toEqual([]);
  });
});

describe('fetchPastWeekEvents', () => {
  beforeEach(() => mockFetch.mockReset());

  it('requests 7 days back and returns items', async () => {
    const events = [{ id: '2', summary: 'Sprint planning' }];
    // call[0] = calendarList, call[1] = events
    mockFetch
      .mockResolvedValueOnce(mockOkResponse({ items: [{ id: 'primary', selected: true }] }))
      .mockResolvedValueOnce(mockOkResponse({ items: events }));

    const result = await fetchPastWeekEvents(TOKEN);

    expect(result).toEqual(events);
    const [url] = mockFetch.mock.calls[1] as [string];
    expect(url).toContain('/events');
    expect(url).toContain('timeMin');
  });
});

describe('searchEmailsForMeeting', () => {
  beforeEach(() => mockFetch.mockReset());

  it('searches Gmail with title and attendee emails', async () => {
    const messages = [{ id: 'msg2', threadId: 'thread2' }];
    const detail = {
      snippet: 'Agenda for the call',
      payload: {
        headers: [
          { name: 'From', value: 'Bob <bob@example.com>' },
          { name: 'Subject', value: 'Q4 planning' },
          { name: 'Date', value: 'Tue, 2 Jan 2026' },
        ],
      },
    };

    mockFetch
      .mockResolvedValueOnce(mockOkResponse({ messages }))
      .mockResolvedValueOnce(mockOkResponse(detail));

    const result = await searchEmailsForMeeting(TOKEN, 'Q4 planning', ['bob@example.com']);

    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('Q4 planning');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('gmail');
    expect(decodeURIComponent(url)).toContain('Q4 planning');
  });
});
