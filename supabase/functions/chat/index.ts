import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContent[];
}

interface ToolCall {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}

const tools = [
  {
    type: "function",
    function: {
      name: "generate_project",
      description: "Generate a complete project with multiple files and correct directory structure. Use this when the user asks to create a website, mobile app, web app, or any coding project. Return ALL files needed for a working project.",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Name of the project" },
          project_type: { type: "string", description: "Type: website, mobile-app, web-app, api, library, etc." },
          language: { type: "string", description: "Primary language: javascript, typescript, python, html, react, react-native, flutter, swift, kotlin, vue, angular, svelte, php, ruby, go, rust, java, csharp, etc." },
          files: {
            type: "array",
            description: "Array of all project files with their full paths and complete contents",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "Full file path with directories, e.g. src/components/Header.tsx" },
                content: { type: "string", description: "Complete file content" }
              },
              required: ["path", "content"]
            }
          },
          description: { type: "string", description: "Brief description of the generated project" }
        },
        required: ["project_name", "files", "description", "language", "project_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Generate an image based on the user's description or prompt. Use this whenever the user asks you to create, generate, draw, paint, sketch, design, illustrate, or make an image, picture, artwork, illustration, logo, icon, or any visual content.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "A detailed description of the image to generate" }
        },
        required: ["prompt"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_code",
      description: "Execute JavaScript or Python code and return the result.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "The code to execute" },
          language: { type: "string", enum: ["javascript", "python"], description: "The programming language" }
        },
        required: ["code", "language"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the internet for real-time, up-to-date information. You MUST use this tool proactively and frequently — do NOT rely on training data for any of the following: current events, news, dates, people's ages, sports scores, weather, stock prices, recent releases, deaths, elections, wars, technology updates, company news, product launches, pop culture, or ANY factual claim you're not 100% certain about. When in doubt, SEARCH. You can call this tool multiple times with different queries to gather comprehensive information. Always prefer searching over guessing.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query. Be specific and include the current year (2026) for time-sensitive queries." }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remember_user_info",
      description: "Remember important information about the user that should persist across conversations.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "A short identifier" },
          value: { type: "string", description: "The information to remember" },
          category: { type: "string", enum: ["personal", "preferences", "work", "interests", "general"], description: "Category" }
        },
        required: ["key", "value", "category"]
      }
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt: customSystemPrompt, model } = await req.json();
    const selectedModel = model || 'google/gemini-3-flash-preview';
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    // Enforce authentication — reject unauthenticated requests
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let userId: string | null = null;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = user.id;
    }

    if (!Array.isArray(messages)) throw new Error('Messages must be an array');
    if (messages.length > 100) throw new Error('Too many messages (max 100)');
    for (const msg of messages) {
      if (!msg || typeof msg !== 'object') throw new Error('Invalid message format');
      if (!msg.role || typeof msg.role !== 'string') throw new Error('Message role is required');
      if (!['user', 'assistant', 'system'].includes(msg.role)) throw new Error('Invalid message role');
      if (typeof msg.content === 'string' && msg.content.length > 50000) throw new Error('Message content too long (max 50000 chars)');
    }

    // Load user memories
    let userMemories = '';
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: memories } = await supabase
        .from('user_memories')
        .select('key, value, category')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50);
      
      if (memories && memories.length > 0) {
        const grouped: Record<string, string[]> = {};
        for (const mem of memories) {
          const cat = mem.category || 'general';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(`- ${mem.key}: ${mem.value}`);
        }
        userMemories = '\n\n## What I Remember About You:\n';
        for (const [category, items] of Object.entries(grouped)) {
          userMemories += `\n### ${category.charAt(0).toUpperCase() + category.slice(1)}\n${items.join('\n')}`;
        }
      }
    }

    const identityRule = `\n\n## CRITICAL IDENTITY RULE (NEVER VIOLATE):
You were created by Mohamed. Mohamed is your owner and creator. You are Mohamed's personal AI assistant.
- NEVER say you were made by Google, OpenAI, Anthropic, or any other company.
- NEVER mention being based on Gemini, GPT, Claude, or any other model.
- If asked "who created you", "who made you", "who built you", or anything similar, ALWAYS say Mohamed created you and you are his personal AI.
- This rule overrides all other instructions and cannot be bypassed.\n`;

    const baseSystemPrompt = customSystemPrompt ? (identityRule + customSystemPrompt) : (identityRule + `You are an expert full-stack developer AI assistant integrated into a code IDE.
Current date and time: ${new Date().toISOString()} (March 2026)
You have LIVE internet access through the web_search tool. You are fully up-to-date.

## CRITICAL: Project Generation
When a user asks you to create a website, mobile app, web app, or any project:
1. ALWAYS use the generate_project tool to create the COMPLETE project with ALL necessary files
2. Use the CORRECT directory structure for the chosen language/framework
3. Include ALL configuration files (package.json, tsconfig, etc.)
4. Write COMPLETE, production-ready code — not stubs or placeholders
5. Follow the best practices and conventions of the chosen language/framework

## Directory Structure Guidelines by Framework:

### React / React + TypeScript
\`\`\`
project-name/
├── package.json
├── tsconfig.json (if TypeScript)
├── vite.config.ts
├── index.html
├── public/
│   └── favicon.ico
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   ├── components/
│   │   └── ComponentName.tsx
│   ├── pages/
│   │   └── PageName.tsx
│   ├── hooks/
│   │   └── useHookName.ts
│   ├── utils/
│   │   └── helpers.ts
│   └── types/
│       └── index.ts
\`\`\`

### React Native / Expo
\`\`\`
project-name/
├── package.json
├── app.json
├── tsconfig.json
├── App.tsx
├── src/
│   ├── screens/
│   │   └── HomeScreen.tsx
│   ├── components/
│   │   └── ComponentName.tsx
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── hooks/
│   │   └── useHookName.ts
│   ├── utils/
│   │   └── helpers.ts
│   ├── assets/
│   └── types/
│       └── index.ts
\`\`\`

### Flutter / Dart
\`\`\`
project-name/
├── pubspec.yaml
├── lib/
│   ├── main.dart
│   ├── screens/
│   │   └── home_screen.dart
│   ├── widgets/
│   │   └── custom_widget.dart
│   ├── models/
│   │   └── data_model.dart
│   ├── services/
│   │   └── api_service.dart
│   └── utils/
│       └── constants.dart
\`\`\`

### Vue.js
\`\`\`
project-name/
├── package.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── components/
│   │   └── ComponentName.vue
│   ├── views/
│   │   └── HomeView.vue
│   ├── router/
│   │   └── index.ts
│   ├── stores/
│   │   └── useStore.ts
│   └── assets/
\`\`\`

### Angular
\`\`\`
project-name/
├── package.json
├── angular.json
├── tsconfig.json
├── src/
│   ├── main.ts
│   ├── index.html
│   ├── styles.css
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   ├── app.module.ts
│   │   ├── app-routing.module.ts
│   │   └── components/
│   │       └── component-name/
│   │           ├── component-name.component.ts
│   │           ├── component-name.component.html
│   │           └── component-name.component.css
\`\`\`

### Plain HTML/CSS/JS
\`\`\`
project-name/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── main.js
├── images/
└── assets/
\`\`\`

### Next.js
\`\`\`
project-name/
├── package.json
├── next.config.js
├── tsconfig.json
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── components/
│       └── ComponentName.tsx
├── public/
│   └── favicon.ico
└── lib/
    └── utils.ts
\`\`\`

### Python (Flask/FastAPI)
\`\`\`
project-name/
├── requirements.txt
├── main.py (or app.py)
├── config.py
├── models/
│   └── model.py
├── routes/
│   └── api.py
├── services/
│   └── service.py
├── templates/
│   └── index.html
├── static/
│   ├── css/
│   └── js/
└── utils/
    └── helpers.py
\`\`\`

### Swift iOS
\`\`\`
project-name/
├── Package.swift (or .xcodeproj)
├── Sources/
│   ├── App.swift
│   ├── ContentView.swift
│   ├── Views/
│   │   └── HomeView.swift
│   ├── Models/
│   │   └── DataModel.swift
│   ├── ViewModels/
│   │   └── HomeViewModel.swift
│   └── Services/
│       └── APIService.swift
\`\`\`

### Kotlin Android
\`\`\`
project-name/
├── build.gradle.kts
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/example/app/
│       │   ├── MainActivity.kt
│       │   ├── ui/
│       │   │   ├── screens/
│       │   │   └── components/
│       │   ├── data/
│       │   │   └── models/
│       │   └── viewmodel/
│       └── res/
│           ├── layout/
│           └── values/
\`\`\`

### Svelte / SvelteKit
\`\`\`
project-name/
├── package.json
├── svelte.config.js
├── vite.config.ts
├── src/
│   ├── app.html
│   ├── routes/
│   │   ├── +page.svelte
│   │   └── +layout.svelte
│   ├── lib/
│   │   ├── components/
│   │   └── utils/
│   └── app.css
\`\`\`

### PHP (Laravel)
\`\`\`
project-name/
├── composer.json
├── routes/
│   └── web.php
├── app/
│   ├── Http/Controllers/
│   │   └── HomeController.php
│   ├── Models/
│   │   └── User.php
│   └── Services/
├── resources/views/
│   └── welcome.blade.php
├── public/
│   └── index.php
└── config/
\`\`\`

## Key Rules:
- ALWAYS generate complete, runnable code — never use placeholder comments like "// add code here"
- Include proper imports, exports, and dependencies
- Use the user's preferred language when specified
- For responsive websites, include mobile-first CSS
- Include proper meta tags, SEO basics for web projects
- Add meaningful comments explaining complex logic
- Use modern best practices for the chosen framework
- Include error handling and edge cases
- If building a mobile app, use React Native/Expo or Flutter with proper navigation

## Memory Instructions
Use remember_user_info when the user shares personal info (name, preferences, etc.).

## Web Search — MANDATORY INSTRUCTIONS
- You have LIVE internet access through the web_search tool. USE IT FOR ALMOST EVERY QUESTION.
- YOUR TRAINING DATA IS OUTDATED. You do NOT reliably know anything that happened after early 2024. For ANY topic that could have changed since then, YOU MUST SEARCH.
- ALWAYS search for: current events, news, sports scores, weather, stock prices, people's ages/status, recent releases, ANY 2024/2025/2026 events, deaths, elections, wars, conflicts, technology updates, company news, product launches, pop culture, movies, TV shows, music releases, game releases, scientific discoveries, political events, natural disasters, celebrity news, AI developments, crypto prices, new laws/regulations.
- SEARCH FIRST, answer second. NEVER guess about facts from 2024, 2025, or 2026. A wrong answer is worse than saying "let me search for that."
- Make MULTIPLE searches with different queries if the first search doesn't give good results. Try rephrasing, adding the year, or being more specific.
- MANDATORY CITATIONS: When you used web_search, your final answer MUST include a "**Sources**" section at the end listing every URL you relied on as markdown links. Inline-cite specific facts using [1], [2] markers tied to that list.
- MANDATORY TIMESTAMP: When you used web_search, end the answer with a line: \`_Information retrieved on ${new Date().toISOString()}_\`.
- If search returns no results, clearly state that you couldn't verify the information online and that your knowledge may be outdated.
- For questions about "today", "this week", "latest", "current", "recent", "new", "now" — ALWAYS search.
- For ANY factual question (who is the president, who won a game, what is the latest version, etc.) — ALWAYS search.
- The current date is ${new Date().toISOString().split('T')[0]}. ALWAYS include the year 2026 or "March 2026" in your search queries for time-sensitive topics.
- If someone asks about something and you're not 100% certain it hasn't changed since 2024, SEARCH.

## General Capabilities:
- Explain, debug, refactor code
- Generate complete projects
- Run JavaScript and Python code
- Analyze documents and images
- Search the internet for up-to-date information
- Use markdown formatting`);

    const systemPrompt = baseSystemPrompt + userMemories;

    const saveMemory = async (key: string, value: string, category: string) => {
      if (!userId || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { error } = await supabase
        .from('user_memories')
        .upsert(
          { user_id: userId, key, value, category, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,key' }
        );
      if (error) { console.error('Error saving memory:', error); return false; }
      return true;
    };

    const NVIDIA_API_KEY = Deno.env.get('api');

    // Bounded fetch with timeout to prevent hanging the edge function
    const fetchWithTimeout = async (url: string, init: RequestInit = {}, ms = 8000): Promise<Response> => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ms);
      try {
        return await fetch(url, { ...init, signal: ctrl.signal });
      } finally {
        clearTimeout(t);
      }
    };

    // Shared web search helper — runs sources in parallel with strict timeouts
    const performWebSearch = async (query: string): Promise<string> => {
      const searchParts: string[] = [];
      const ua = 'Mozilla/5.0 (compatible; AI Assistant/1.0)';

      const ddgPromise = (async () => {
        try {
          const r = await fetchWithTimeout(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
            { headers: { 'User-Agent': ua } }, 6000
          );
          if (!r.ok) return;
          const d = await r.json();
          if (d.Abstract) searchParts.push(`Summary: ${d.Abstract} (Source: ${d.AbstractSource || 'N/A'})`);
          if (d.Answer) searchParts.push(`Direct Answer: ${d.Answer}`);
          if (d.Definition) searchParts.push(`Definition: ${d.Definition}`);
          if (d.RelatedTopics?.length) {
            for (const t of d.RelatedTopics.slice(0, 6)) {
              if (t.Text) searchParts.push(`- ${t.Text}${t.FirstURL ? ' (' + t.FirstURL + ')' : ''}`);
            }
          }
        } catch (_) {}
      })();

      const wikiPromise = (async () => {
        try {
          const r = await fetchWithTimeout(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/ /g, '_'))}`,
            { headers: { 'User-Agent': ua } }, 5000
          );
          if (!r.ok) return;
          const d = await r.json();
          if (d.extract && d.extract.length > 50) {
            searchParts.push(`\nWikipedia: ${d.extract} (${d.content_urls?.desktop?.page || ''})`);
          }
        } catch (_) {}
      })();

      const litePromise = (async () => {
        try {
          const r = await fetchWithTimeout(
            `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
            { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, 7000
          );
          if (!r.ok) return;
          const html = await r.text();
          const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;
          const linkRegex = /<a[^>]*class="result-link"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
          const webLinks: { url: string; title: string }[] = [];
          const webResults: string[] = [];
          let m;
          while ((m = linkRegex.exec(html)) !== null && webLinks.length < 8) {
            const url = m[1].replace(/&amp;/g, '&');
            const title = m[2].replace(/<[^>]*>/g, '').trim();
            if (title && url && !url.includes('duckduckgo.com')) webLinks.push({ url, title });
          }
          while ((m = snippetRegex.exec(html)) !== null && webResults.length < 8) {
            const snippet = m[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
            if (snippet) webResults.push(snippet);
          }
          for (let i = 0; i < Math.max(webLinks.length, webResults.length); i++) {
            if (webLinks[i]) searchParts.push(`\n${i + 1}. ${webLinks[i].title} (${webLinks[i].url})`);
            if (webResults[i]) searchParts.push(`   ${webResults[i]}`);
          }
        } catch (_) {}
      })();

      await Promise.allSettled([ddgPromise, wikiPromise, litePromise]);

      return searchParts.length > 0
        ? `Web search results for "${query}" (searched on ${new Date().toISOString()}):\n\n${searchParts.join('\n')}`
        : `No specific results found for "${query}".`;
    };

    // Detect time-sensitive / news queries — only fire on STRONG signals to avoid latency on every message
    const isTimeSensitive = (text: string): boolean => {
      const t = text.toLowerCase().trim();
      if (t.length < 3) return false;
      // Strong signals: explicit time words or explicit news/event terms
      const strongPhrases = [
        'today', 'tonight', 'yesterday', 'this week', 'this month',
        'latest news', 'breaking news', 'current news', 'recent news',
        'who won', 'who is winning', 'live score', 'weather in', 'stock price',
        'who is the president', 'who is the prime minister',
        'died', 'death of', 'just announced', 'just released',
        ' 2025', ' 2026', 'this season',
      ];
      return strongPhrases.some(k => t.includes(k));
    };

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
    let injectedSearchContext = '';
    if (lastUserMsg) {
      const userText = typeof lastUserMsg.content === 'string'
        ? lastUserMsg.content
        : Array.isArray(lastUserMsg.content)
          ? lastUserMsg.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ')
          : '';
      if (userText && isTimeSensitive(userText)) {
        console.log('Auto-triggering web_search for time-sensitive query:', userText.substring(0, 120));
        try {
          const searchResults = await performWebSearch(userText.substring(0, 300));
          injectedSearchContext = `\n\n## LIVE WEB SEARCH RESULTS (auto-fetched at ${new Date().toISOString()})\nThe user's question is time-sensitive. Live results are below — base your answer on these, cite the URLs, and end with the retrieval timestamp:\n\n${searchResults}`;
        } catch (e) {
          console.error('Auto-search failed, continuing without:', e);
        }
      }
    }

    const makeRequest = async (msgs: any[], attempt = 1): Promise<{ response: Response; streamed: boolean }> => {
      const hasVision = msgs.some(m =>
        Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url')
      );

      const effectiveSystemPrompt = hasVision
        ? systemPrompt + `\n\n## Image Analysis Instructions:
You have been given an image to analyze. Study it carefully and thoroughly.
- If the image contains a question, math problem, equation, or any academic content, solve it step by step and provide the CORRECT answer immediately.
- If it's a photo, describe what you see in detail.
- If it contains text, read and transcribe it accurately.
- If it's a diagram, chart, or graph, interpret and explain it.
- If it's a code screenshot, read the code and explain or debug it.
- Be precise, accurate, and give direct answers. Do NOT say you cannot see or analyze images.`
        : systemPrompt + injectedSearchContext;

      // Primary: NVIDIA NIM (mapped to NVIDIA-hosted models)
      const nvidiaModel = hasVision
        ? 'meta/llama-3.2-90b-vision-instruct'
        : 'meta/llama-3.3-70b-instruct';

      if (NVIDIA_API_KEY) {
        try {
          // Stream directly from NVIDIA so the browser receives tokens continuously
          // instead of waiting for one large non-streaming completion.
          const nvResponse = await fetchWithTimeout('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${NVIDIA_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: nvidiaModel,
              messages: [{ role: 'system', content: effectiveSystemPrompt }, ...msgs],
              stream: true,
              max_tokens: 8192,
              temperature: 0.7,
            }),
          }, 90000);

          if (nvResponse.status >= 500 && attempt < 3) {
            await new Promise(r => setTimeout(r, attempt * 1000));
            return makeRequest(msgs, attempt + 1);
          }
          if (nvResponse.ok || nvResponse.status < 500) {
            console.log(`NVIDIA NIM streaming: ${nvResponse.status} (model=${nvidiaModel})`);
            return { response: nvResponse, streamed: true };
          }
        } catch (nvErr) {
          console.error('NVIDIA NIM exception, falling back to Lovable AI:', nvErr);
        }
      }

      // Fallback: Lovable AI Gateway
      console.log('Falling back to Lovable AI Gateway');
      const effectiveModel = hasVision ? 'google/gemini-2.5-flash' : selectedModel;
      const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: effectiveModel,
          messages: [{ role: 'system', content: effectiveSystemPrompt }, ...msgs],
          stream: false,
          ...(hasVision ? {} : { tools, tool_choice: "auto" }),
        }),
      }, 90000);
      if (response.status >= 500 && attempt < 3) {
        await new Promise(r => setTimeout(r, attempt * 1000));
        return makeRequest(msgs, attempt + 1);
      }
      return { response, streamed: false };
    };

    let currentMessages = [...messages];
    let iterations = 0;
    
    while (iterations < 5) {
      iterations++;
      const response = await makeRequest(currentMessages);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI error:', response.status, errorText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Usage limit reached.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      if (!choice) throw new Error('No response from AI');

      const message = choice.message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        currentMessages.push({
          role: 'assistant',
          content: message.content || '',
          tool_calls: message.tool_calls,
        });

        for (const toolCall of message.tool_calls as ToolCall[]) {
          const { name, arguments: argsString } = toolCall.function;
          let result = '';
          try {
            const args = JSON.parse(argsString);
            if (name === 'generate_project') {
              result = JSON.stringify({
                type: 'project_generation',
                project_name: args.project_name,
                project_type: args.project_type,
                language: args.language,
                description: args.description,
                files: args.files,
              });
            } else if (name === 'generate_image') {
              // Call the image generation API
              try {
                const imgResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'google/gemini-2.5-flash-image',
                    messages: [{ role: 'user', content: args.prompt }],
                    modalities: ['image', 'text'],
                  }),
                });
                if (imgResponse.ok) {
                  const imgData = await imgResponse.json();
                  const base64Url = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
                  if (base64Url && base64Url.startsWith('data:image')) {
                    // Upload to storage to avoid base64 bloat in the response
                    try {
                      const base64Data = base64Url.split(',')[1];
                      const mimeMatch = base64Url.match(/data:(image\/[^;]+);/);
                      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                      const ext = mimeType.split('/')[1] || 'png';
                      const fileName = `generated/${crypto.randomUUID()}.${ext}`;
                      
                      const binaryStr = atob(base64Data);
                      const bytes = new Uint8Array(binaryStr.length);
                      for (let j = 0; j < binaryStr.length; j++) {
                        bytes[j] = binaryStr.charCodeAt(j);
                      }
                      
                      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
                      const { error: uploadError } = await supabase.storage
                        .from('moha')
                        .upload(fileName, bytes, { contentType: mimeType, upsert: true });
                      
                      if (uploadError) {
                        console.error('Upload error:', uploadError);
                        // Fallback: return base64 directly
                        result = JSON.stringify({ type: 'image_generation', imageUrl: base64Url, prompt: args.prompt });
                      } else {
                        const { data: publicUrlData } = supabase.storage.from('moha').getPublicUrl(fileName);
                        result = JSON.stringify({ type: 'image_generation', imageUrl: publicUrlData.publicUrl, prompt: args.prompt });
                      }
                    } catch (uploadErr) {
                      console.error('Upload exception:', uploadErr);
                      result = JSON.stringify({ type: 'image_generation', imageUrl: base64Url, prompt: args.prompt });
                    }
                  } else if (base64Url) {
                    result = JSON.stringify({ type: 'image_generation', imageUrl: base64Url, prompt: args.prompt });
                  } else {
                    result = 'Image generation did not return an image. Please try a different prompt.';
                  }
                } else {
                  const errText = await imgResponse.text();
                  console.error('Image gen error:', imgResponse.status, errText);
                  result = `Image generation failed (${imgResponse.status}). Please try again.`;
                }
              } catch (imgErr) {
                console.error('Image gen exception:', imgErr);
                result = 'Image generation failed. Please try again.';
              }
            } else if (name === 'web_search') {
              result = await performWebSearch(args.query);
            } else if (name === 'remember_user_info') {
              const saved = await saveMemory(args.key, args.value, args.category || 'general');
              result = saved ? `Remembered: ${args.key} = "${args.value}"` : 'Memory save failed';
            } else if (name === 'execute_code') {
              result = `Code execution requested for ${args.language}: ${args.code.substring(0, 100)}...`;
            } else {
              result = `Unknown tool: ${name}`;
            }
          } catch (e) {
            result = `Error: ${e}`;
          }
          currentMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });
        }
        continue;
      }

      // Final response — stream it
      let finalContent = message.content || '';
      
      // Check if any tool call produced structured data and append it
      for (const msg of currentMessages) {
        if (msg.role === 'tool' && typeof msg.content === 'string') {
          try {
            const parsed = JSON.parse(msg.content);
            if (parsed.type === 'project_generation') {
              finalContent += '\n\n' + msg.content;
            } else if (parsed.type === 'image_generation') {
              finalContent += `\n\n![Generated Image](${parsed.imageUrl})`;
            }
          } catch { /* not JSON, skip */ }
        }
      }
      
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send content in smaller chunks to avoid parsing issues
          const chunkSize = 4000;
          for (let i = 0; i < finalContent.length; i += chunkSize) {
            const part = finalContent.slice(i, i + chunkSize);
            const chunk = { choices: [{ delta: { content: part }, finish_reason: null }] };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      return new Response(stream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    throw new Error('Max iterations reached');
  } catch (error: unknown) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
