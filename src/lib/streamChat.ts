export interface StreamChatOptions {
  prompt: string;
  model: string;
  systemPrompt?: string;
  accessToken: string;
  signal?: AbortSignal;
  onDelta: (fullContent: string) => void;
}

/**
 * Minimal SSE client for the chat edge function — used by the model comparison view.
 */
export const streamChat = async ({
  prompt,
  model,
  systemPrompt,
  accessToken,
  signal,
  onDelta,
}: StreamChatOptions): Promise<string> => {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: systemPrompt || "You are Mohamed's AI, an intelligent and helpful assistant.",
      model,
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') return full;
      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (delta) {
          full += delta;
          onDelta(full);
        }
      } catch {
        buffer = line + '\n' + buffer;
        break;
      }
    }
  }

  return full;
};
