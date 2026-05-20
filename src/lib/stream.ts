export async function fetchStream<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  if (!response.body) throw new Error('Response body is null');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let done = false;

  while (!done) {
    const result = await reader.read();
    done = result.done;
    if (result.value) accumulated += decoder.decode(result.value, { stream: true });
  }
  accumulated += decoder.decode();

  return JSON.parse(accumulated) as T;
}
