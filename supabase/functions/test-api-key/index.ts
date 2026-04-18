import { corsHeaders } from '@supabase/supabase-js/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('api');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'No "api" secret found' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const masked = `${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (len=${apiKey.length})`;
  const results: Record<string, { ok: boolean; status: number; detail: string }> = {};

  const probe = async (name: string, url: string, init: RequestInit) => {
    try {
      const r = await fetch(url, init);
      const text = (await r.text()).slice(0, 250);
      results[name] = { ok: r.ok, status: r.status, detail: text };
    } catch (e) {
      results[name] = { ok: false, status: 0, detail: String(e).slice(0, 250) };
    }
  };

  // Try common providers in parallel
  await Promise.all([
    probe('OpenAI', 'https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    }),
    probe('Anthropic', 'https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    }),
    probe('Perplexity', 'https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
      }),
    }),
    probe('Google Gemini', `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {}),
    probe('Tavily', 'https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query: 'test', max_results: 1 }),
    }),
    probe('Serper', 'https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'test' }),
    }),
    probe('OpenRouter', 'https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    }),
    probe('Groq', 'https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    }),
  ]);

  return new Response(JSON.stringify({ masked, results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
