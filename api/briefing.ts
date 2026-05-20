import Anthropic from '@anthropic-ai/sdk';

export const config = { runtime: 'edge' };

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

async function gFetch(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Google API ${res.status}: ${await res.text()}`);
  return res.json();
}

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

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const body = await req.json() as { googleAccessToken?: string };
  if (!body.googleAccessToken) return new Response('Missing googleAccessToken', { status: 400 });

  const tokenCheck = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${body.googleAccessToken}`,
  );
  if (!tokenCheck.ok) return new Response('Invalid Google token', { status: 401 });

  try {
    const [events, emails] = await Promise.all([
      fetchTodaysEvents(body.googleAccessToken),
      fetchRecentEmails(body.googleAccessToken),
    ]);

    const userPrompt = `Today's calendar events: ${JSON.stringify(events)}

Recent emails (last 24h): ${JSON.stringify(emails)}

Generate a morning briefing as JSON with this exact shape:
{
  "schedule_summary": "string summarising the day",
  "top_emails": [{"sender":"string","subject":"string","summary":"string","urgency":"high|medium|low"}],
  "focus_blocks": [{"start":"HH:MM","end":"HH:MM","duration_minutes":number}]
}

Limit top_emails to 5 most important. Focus blocks are calendar gaps longer than 45 minutes.
Base your response strictly on the data provided. Do not infer or add information not present in the input.
Respond with valid JSON only — no markdown, no explanation.`;

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You are a concise executive assistant. Respond with valid JSON only.',
      messages: [{ role: 'user', content: userPrompt }],
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(message, { status: 500 });
  }
}
