import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── shared helpers ────────────────────────────────────────────────────────────

async function gFetch(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Google API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function validateGoogleToken(token: string) {
  const res = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
  return res.ok;
}

async function streamToResponse(
  res: express.Response,
  params: Parameters<typeof anthropic.messages.stream>[0],
) {
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  const stream = await anthropic.messages.stream(params);
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      res.write(chunk.delta.text);
    }
  }
  res.end();
}

// ── /api/briefing ─────────────────────────────────────────────────────────────

async function fetchTodaysEvents(token: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const data = await gFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${new URLSearchParams({
      timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: 'true', orderBy: 'startTime',
    })}`,
    token,
  );
  return data.items ?? [];
}

async function fetchRecentEmails(token: string) {
  const since = new Date(Date.now() - 86_400_000);
  const dateStr = `${since.getFullYear()}/${String(since.getMonth() + 1).padStart(2, '0')}/${String(since.getDate()).padStart(2, '0')}`;
  const list = await gFetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?${new URLSearchParams({
      labelIds: 'INBOX', q: `after:${dateStr}`, maxResults: '20',
    })}`,
    token,
  );
  const messages: Array<{ id: string; threadId: string }> = list.messages ?? [];
  return Promise.all(messages.map(async m => {
    const params = new URLSearchParams({ format: 'metadata' });
    ['From', 'Subject', 'Date'].forEach(h => params.append('metadataHeaders', h));
    const detail = await gFetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${m.id}?${params}`, token);
    const headers: Array<{ name: string; value: string }> = detail.payload?.headers ?? [];
    const get = (n: string) => headers.find(h => h.name === n)?.value ?? '';
    return { id: m.id, from: get('From'), subject: get('Subject'), date: get('Date'), snippet: detail.snippet ?? '' };
  }));
}

app.post('/api/briefing', async (req, res) => {
  const { googleAccessToken } = req.body as { googleAccessToken?: string };
  if (!googleAccessToken) { res.status(400).send('Missing googleAccessToken'); return; }
  if (!await validateGoogleToken(googleAccessToken)) { res.status(401).send('Invalid Google token'); return; }
  try {
    const [events, emails] = await Promise.all([
      fetchTodaysEvents(googleAccessToken),
      fetchRecentEmails(googleAccessToken),
    ]);
    await streamToResponse(res, {
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You are a concise executive assistant. Respond with valid JSON only.',
      messages: [{
        role: 'user',
        content: `Today's calendar events: ${JSON.stringify(events)}\n\nRecent emails (last 24h): ${JSON.stringify(emails)}\n\nGenerate a morning briefing as JSON with this exact shape:\n{\n  "schedule_summary": "string summarising the day",\n  "top_emails": [{"sender":"string","subject":"string","summary":"string","urgency":"high|medium|low"}],\n  "focus_blocks": [{"start":"HH:MM","end":"HH:MM","duration_minutes":number}]\n}\n\nLimit top_emails to 5 most important. Focus blocks are calendar gaps longer than 45 minutes.\nBase your response strictly on the data provided. Do not infer or add information not present in the input.\nRespond with valid JSON only — no markdown, no explanation.`,
      }],
    });
  } catch (err) {
    if (!res.headersSent) res.status(500).send(err instanceof Error ? err.message : 'Internal error');
  }
});

// ── /api/analyze ──────────────────────────────────────────────────────────────

async function fetchPastWeekEvents(token: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const data = await gFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${new URLSearchParams({
      timeMin: weekAgo.toISOString(), timeMax: now.toISOString(), singleEvents: 'true', orderBy: 'startTime',
    })}`,
    token,
  );
  return data.items ?? [];
}

app.post('/api/analyze', async (req, res) => {
  const { googleAccessToken } = req.body as { googleAccessToken?: string };
  if (!googleAccessToken) { res.status(400).send('Missing googleAccessToken'); return; }
  if (!await validateGoogleToken(googleAccessToken)) { res.status(401).send('Invalid Google token'); return; }
  try {
    const events = await fetchPastWeekEvents(googleAccessToken);
    await streamToResponse(res, {
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You are a productivity analyst. Respond with valid JSON only.',
      messages: [{
        role: 'user',
        content: `Calendar events from the past 7 days: ${JSON.stringify(events)}\n\nCategorise this time usage and provide analysis as JSON with this exact shape:\n{\n  "categories": {\n    "meetings": { "hours": number, "percentage": number },\n    "focus_time": { "hours": number, "percentage": number },\n    "admin": { "hours": number, "percentage": number },\n    "personal": { "hours": number, "percentage": number },\n    "other": { "hours": number, "percentage": number }\n  },\n  "observations": ["string"],\n  "recommendations": ["string"]\n}\n\nBase your response strictly on the data provided. Do not infer or add information not present in the input.\nRespond with valid JSON only — no markdown, no explanation.`,
      }],
    });
  } catch (err) {
    if (!res.headersSent) res.status(500).send(err instanceof Error ? err.message : 'Internal error');
  }
});

// ── /api/meeting-prep ─────────────────────────────────────────────────────────

async function searchEmails(token: string, q: string) {
  const list = await gFetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?${new URLSearchParams({ q, maxResults: '10' })}`,
    token,
  );
  const messages: Array<{ id: string; threadId: string }> = list.messages ?? [];
  return Promise.all(messages.map(async m => {
    const params = new URLSearchParams({ format: 'metadata' });
    ['From', 'Subject', 'Date'].forEach(h => params.append('metadataHeaders', h));
    const detail = await gFetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${m.id}?${params}`, token);
    const headers: Array<{ name: string; value: string }> = detail.payload?.headers ?? [];
    const get = (n: string) => headers.find(h => h.name === n)?.value ?? '';
    return { id: m.id, from: get('From'), subject: get('Subject'), date: get('Date'), snippet: detail.snippet ?? '' };
  }));
}

app.post('/api/meeting-prep', async (req, res) => {
  const { googleAccessToken, eventId, title, attendees } = req.body as {
    googleAccessToken?: string; eventId?: string; title?: string; attendees?: string[];
  };
  if (!googleAccessToken || !eventId) { res.status(400).send('Missing required fields'); return; }
  if (!/^[a-zA-Z0-9_-]+$/.test(eventId)) { res.status(400).send('Invalid eventId format'); return; }
  if (!await validateGoogleToken(googleAccessToken)) { res.status(401).send('Invalid Google token'); return; }
  try {
    const q = [title, ...(attendees ?? []).slice(0, 3)].filter(Boolean).join(' OR ');
    const [event, relatedEmails] = await Promise.all([
      gFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, googleAccessToken),
      searchEmails(googleAccessToken, q),
    ]);
    await streamToResponse(res, {
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You are a meeting preparation assistant. Respond with valid JSON only.',
      messages: [{
        role: 'user',
        content: `Meeting details: ${JSON.stringify(event)}\n\nRelated email threads: ${JSON.stringify(relatedEmails)}\n\nGenerate a meeting preparation brief as JSON with this exact shape:\n{\n  "talking_points": ["string"],\n  "open_items": ["string"],\n  "suggested_agenda": ["string"]\n}\n\nBase your response strictly on the data provided. Do not infer or add information not present in the input.\nRespond with valid JSON only — no markdown, no explanation.`,
      }],
    });
  } catch (err) {
    if (!res.headersSent) res.status(500).send(err instanceof Error ? err.message : 'Internal error');
  }
});

// ── static + SPA fallback ─────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, 'dist')));
app.use((_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
