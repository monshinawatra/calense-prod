import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStream } from '../stream';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let sent = false;
  return new ReadableStream({
    pull(controller) {
      if (!sent) { controller.enqueue(encoder.encode(text)); sent = true; }
      else controller.close();
    },
  });
}

describe('fetchStream', () => {
  beforeEach(() => mockFetch.mockReset());

  it('POSTs JSON body, accumulates stream, and returns parsed result', async () => {
    const payload = { schedule_summary: 'Busy day', top_emails: [], focus_blocks: [] };
    mockFetch.mockResolvedValue({ ok: true, status: 200, body: makeStream(JSON.stringify(payload)) });

    const result = await fetchStream('/api/briefing', { googleAccessToken: 'tok' });

    expect(result).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledWith('/api/briefing', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ googleAccessToken: 'tok' }),
    }));
  });

  it('handles multi-chunk streams by concatenating before parsing', async () => {
    const payload = { result: 'ok' };
    const fullJson = JSON.stringify(payload);
    const half1 = fullJson.slice(0, 5);
    const half2 = fullJson.slice(5);
    const encoder = new TextEncoder();
    let step = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (step === 0) { controller.enqueue(encoder.encode(half1)); step++; }
        else if (step === 1) { controller.enqueue(encoder.encode(half2)); step++; }
        else controller.close();
      },
    });
    mockFetch.mockResolvedValue({ ok: true, status: 200, body });

    const result = await fetchStream('/api/analyze', {});
    expect(result).toEqual(payload);
  });

  it('throws an error when response is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, body: makeStream('') });
    await expect(fetchStream('/api/briefing', {})).rejects.toThrow('API error: 500');
  });
});
