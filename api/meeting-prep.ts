import Anthropic from '@anthropic-ai/sdk';

export const config = { runtime: 'edge' };

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

async function gFetch(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Google API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchEventDetails(token: string, eventId: string) {
  return gFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    token,
  );
}

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

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const body = await req.json() as {
    googleAccessToken?: string;
    eventId?: string;
    title?: string;
    attendees?: string[];
  };

  if (!body.googleAccessToken || !body.eventId) {
    return new Response('Missing required fields', { status: 400 });
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(body.eventId)) {
    return new Response('Invalid eventId format', { status: 400 });
  }

  const tokenCheck = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${body.googleAccessToken}`,
  );
  if (!tokenCheck.ok) return new Response('Invalid Google token', { status: 401 });

  try {
    const q = [body.title, ...(body.attendees ?? []).slice(0, 3)].filter(Boolean).join(' OR ');
    const [event, relatedEmails] = await Promise.all([
      fetchEventDetails(body.googleAccessToken, body.eventId),
      searchEmails(body.googleAccessToken, q),
    ]);

    const userPrompt = `Meeting details: ${JSON.stringify(event)}

Related email threads: ${JSON.stringify(relatedEmails)}

Generate a meeting preparation brief as JSON with this exact shape:
{
  "talking_points": ["string"],
  "open_items": ["string"],
  "suggested_agenda": ["string"]
}

Base your response strictly on the data provided. Do not infer or add information not present in the input.
Respond with valid JSON only — no markdown, no explanation.`;

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You are a meeting preparation assistant. Respond with valid JSON only.',
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
