import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (query.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Query too long (max 500 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching for:', query);

    // Use multiple search strategies for comprehensive results
    const results: string[] = [];

    // Strategy 1: DuckDuckGo Instant Answer API
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const ddgResp = await fetch(ddgUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI Assistant/1.0)' },
      });

      if (ddgResp.ok) {
        const data = await ddgResp.json();
        if (data.Abstract) results.push(`**Summary**: ${data.Abstract} (Source: ${data.AbstractSource || 'N/A'})`);
        if (data.Answer) results.push(`**Direct Answer**: ${data.Answer}`);
        if (data.Definition) results.push(`**Definition**: ${data.Definition} (Source: ${data.DefinitionSource || 'N/A'})`);
        if (data.Infobox?.content) {
          const facts = data.Infobox.content.slice(0, 10);
          if (facts.length > 0) {
            results.push('\n**Quick Facts**:');
            for (const f of facts) {
              if (f.label && f.value) results.push(`- **${f.label}**: ${f.value}`);
            }
          }
        }
        if (data.RelatedTopics?.length > 0) {
          results.push('\n**Related Information**:');
          for (const t of data.RelatedTopics.slice(0, 8)) {
            if (t.Text) {
              const url = t.FirstURL || '';
              results.push(`- ${t.Text}${url ? ` [Source](${url})` : ''}`);
            } else if (t.Topics) {
              for (const sub of t.Topics.slice(0, 3)) {
                if (sub.Text) results.push(`- ${sub.Text}`);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('DuckDuckGo API error:', e);
    }

    // Strategy 2: DuckDuckGo HTML lite search for actual web results
    try {
      const liteUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
      const liteResp = await fetch(liteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (liteResp.ok) {
        const html = await liteResp.text();
        
        // Extract search result snippets from the lite HTML page
        const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;
        const linkRegex = /<a[^>]*class="result-link"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        
        const snippets: string[] = [];
        const links: { url: string; title: string }[] = [];
        
        let match;
        while ((match = linkRegex.exec(html)) !== null && links.length < 8) {
          const url = match[1].replace(/&amp;/g, '&');
          const title = match[2].replace(/<[^>]*>/g, '').trim();
          if (title && url && !url.includes('duckduckgo.com')) {
            links.push({ url, title });
          }
        }
        
        while ((match = snippetRegex.exec(html)) !== null && snippets.length < 8) {
          const snippet = match[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").trim();
          if (snippet) snippets.push(snippet);
        }
        
        if (links.length > 0 || snippets.length > 0) {
          results.push('\n**Web Search Results**:');
          for (let i = 0; i < Math.max(links.length, snippets.length); i++) {
            const link = links[i];
            const snippet = snippets[i];
            if (link) {
              results.push(`\n${i + 1}. **[${link.title}](${link.url})**`);
            }
            if (snippet) {
              results.push(`   ${snippet}`);
            }
          }
        }
      }
    } catch (e) {
      console.error('DuckDuckGo lite search error:', e);
    }

    const searchResults = results.length > 0 
      ? results.join('\n')
      : 'No specific results found for this query. Please answer based on your knowledge and clearly state that you could not verify this with a live search.';

    console.log('Search completed, results length:', searchResults.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: searchResults,
        query,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Search failed',
        results: 'Search unavailable. Please answer based on your knowledge.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
