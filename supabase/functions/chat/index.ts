import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
Current date: ${new Date().toISOString().split('T')[0]}

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

## Web Search
- ALWAYS use the web_search tool when the user asks about current events, recent news, live data, real-time information, or anything that may have changed after your training data cutoff.
- Also use web_search when you are unsure about the accuracy of facts, dates, statistics, or any claim.
- You can make multiple searches to gather comprehensive information.
- Cite your sources when using search results.

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

    const makeRequest = async (msgs: any[], attempt = 1): Promise<Response> => {
      // Detect if any message has image content for vision
      const hasVision = msgs.some(m => 
        Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url')
      );

      // Use a vision-capable model and add vision instructions
      const effectiveModel = hasVision ? 'google/gemini-2.5-flash' : selectedModel;
      const effectiveSystemPrompt = hasVision 
        ? systemPrompt + `\n\n## Image Analysis Instructions:
You have been given an image to analyze. Study it carefully and thoroughly.
- If the image contains a question, math problem, equation, or any academic content, solve it step by step and provide the CORRECT answer immediately.
- If it's a photo, describe what you see in detail.
- If it contains text, read and transcribe it accurately.
- If it's a diagram, chart, or graph, interpret and explain it.
- If it's a code screenshot, read the code and explain or debug it.
- Be precise, accurate, and give direct answers. Do NOT say you cannot see or analyze images.`
        : systemPrompt;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
      });
      if (response.status >= 500 && attempt < 3) {
        await new Promise(r => setTimeout(r, attempt * 1000));
        return makeRequest(msgs, attempt + 1);
      }
      return response;
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
              try {
                const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json&no_html=1&skip_disambig=1`;
                const searchResp = await fetch(searchUrl, {
                  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI Assistant/1.0)' },
                });
                if (searchResp.ok) {
                  const searchData = await searchResp.json();
                  const parts: string[] = [];
                  if (searchData.Abstract) parts.push(`Summary: ${searchData.Abstract} (Source: ${searchData.AbstractSource || 'N/A'})`);
                  if (searchData.Answer) parts.push(`Answer: ${searchData.Answer}`);
                  if (searchData.Definition) parts.push(`Definition: ${searchData.Definition}`);
                  if (searchData.RelatedTopics?.length > 0) {
                    for (const t of searchData.RelatedTopics.slice(0, 8)) {
                      if (t.Text) parts.push(`- ${t.Text}`);
                    }
                  }
                  if (searchData.Infobox?.content) {
                    for (const f of searchData.Infobox.content.slice(0, 8)) {
                      if (f.label && f.value) parts.push(`${f.label}: ${f.value}`);
                    }
                  }
                  result = parts.length > 0 ? parts.join('\n') : 'No specific results found. Please answer based on your knowledge.';
                } else {
                  result = 'Search failed. Please answer based on your knowledge.';
                }
              } catch (searchErr) {
                console.error('Web search error:', searchErr);
                result = 'Search failed. Please answer based on your knowledge.';
              }
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
