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
    // Enforce authentication
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

    // Use DuckDuckGo Instant Answer API (free, no key required)
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI Assistant/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Search failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Extract relevant information from DuckDuckGo response
    const results: string[] = [];
    
    // Abstract/summary
    if (data.Abstract) {
      results.push(`**Summary**: ${data.Abstract}`);
      if (data.AbstractSource) {
        results.push(`*Source: ${data.AbstractSource}*`);
      }
    }

    // Answer (for calculations, definitions, etc.)
    if (data.Answer) {
      results.push(`**Answer**: ${data.Answer}`);
    }

    // Definition
    if (data.Definition) {
      results.push(`**Definition**: ${data.Definition}`);
      if (data.DefinitionSource) {
        results.push(`*Source: ${data.DefinitionSource}*`);
      }
    }

    // Related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      results.push('\n**Related Information**:');
      const topics = data.RelatedTopics.slice(0, 5);
      for (const topic of topics) {
        if (topic.Text) {
          results.push(`- ${topic.Text}`);
        }
      }
    }

    // Infobox data (facts, stats)
    if (data.Infobox && data.Infobox.content) {
      results.push('\n**Quick Facts**:');
      const facts = data.Infobox.content.slice(0, 8);
      for (const fact of facts) {
        if (fact.label && fact.value) {
          results.push(`- **${fact.label}**: ${fact.value}`);
        }
      }
    }

    const searchResults = results.length > 0 
      ? results.join('\n')
      : 'No specific information found for this query. The AI will respond based on its training data.';

    console.log('Search completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: searchResults,
        query: query,
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
        results: 'Unable to fetch real-time data. The AI will respond based on its training data.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
