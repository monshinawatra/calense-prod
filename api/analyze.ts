import Anthropic from '@anthropic-ai/sdk';

export const config = { runtime: 'edge' };

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

async function fetchPastWeekEvents(token: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${new URLSearchParams({
      timeMin: weekAgo.toISOString(),
      timeMax: now.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    })}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Google API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.items ?? [];
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
    const events = await fetchPastWeekEvents(body.googleAccessToken);

    const userPrompt = `Calendar events from the past 7 days: ${JSON.stringify(events)}

Categorise this time usage and provide analysis as JSON with this exact shape:
{
  "categories": {
    "meetings": { "hours": number, "percentage": number },
    "focus_time": { "hours": number, "percentage": number },
    "admin": { "hours": number, "percentage": number },
    "personal": { "hours": number, "percentage": number },
    "other": { "hours": number, "percentage": number }
  },
  "observations": ["string"],
  "recommendations": ["string"]
}

Base your response strictly on the data provided. Do not infer or add information not present in the input.
Respond with valid JSON only — no markdown, no explanation.`;

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You are a productivity analyst. Respond with valid JSON only.',
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
