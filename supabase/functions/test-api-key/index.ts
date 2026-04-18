const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  await Promise.all([
    probe('NVIDIA NIM (models)', 'https://integrate.api.nvidia.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    }),
    probe('NVIDIA NIM (chat)', 'https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages: [{ role: 'user', content: 'Say hi in 3 words.' }],
        max_tokens: 20,
      }),
    }),
  ]);

  return new Response(JSON.stringify({ masked, results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
