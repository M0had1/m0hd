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
  image_url?: {
    url: string;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContent[];
}

interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

// Tool definitions for the AI
const tools = [
  {
    type: "function",
    function: {
      name: "execute_code",
      description: "Execute JavaScript or Python code and return the result. Use this when the user asks you to run, execute, calculate, or test code.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "The code to execute"
          },
          language: {
            type: "string",
            enum: ["javascript", "python"],
            description: "The programming language"
          }
        },
        required: ["code", "language"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_document",
      description: "Analyze and extract information from uploaded documents.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The document content" },
          fileName: { type: "string", description: "The file name" },
          fileType: { type: "string", description: "The file type" }
        },
        required: ["content", "fileName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remember_user_info",
      description: "IMPORTANT: Use this tool to remember important information about the user that should persist across all conversations. This includes: user's name, preferences, job/role, interests, goals, and any personal details they share. Call this whenever the user tells you their name or shares important personal information.",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "A short identifier (e.g., 'user_name', 'user_job', 'user_interest', 'user_preference')"
          },
          value: {
            type: "string",
            description: "The information to remember"
          },
          category: {
            type: "string",
            enum: ["personal", "preferences", "work", "interests", "general"],
            description: "Category of the memory"
          }
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
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array');
    }

    console.log('Processing chat request with', messages.length, 'messages for user:', userId);

    // Load user memories from database
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
          userMemories += `\n### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
          userMemories += items.join('\n');
        }
      }
    }

    const baseSystemPrompt = customSystemPrompt || `You are Mohamed's AI, an intelligent, helpful, and personalized assistant.
Current date: ${new Date().toISOString().split('T')[0]}

## CRITICAL: Memory Instructions
You MUST use the remember_user_info tool when:
1. The user tells you their name (save as key: "user_name", category: "personal")
2. The user shares their job, profession, or role (save as key: "user_job", category: "work")
3. The user mentions their interests or hobbies (save as key: "user_interest_*", category: "interests")
4. The user states preferences (save as key: "user_preference_*", category: "preferences")
5. Any other important personal detail they share

When you have the user's name, ALWAYS address them by name in your responses.

## Core Capabilities:
- **Memory**: You remember everything about the user across all conversations. Use the remember_user_info tool to save new information.
- **Code Execution**: Run JavaScript and Python code when requested.
- **Document Analysis**: Analyze uploaded files.
- **Image Analysis**: Describe and analyze images.
- **Web Search**: Access real-time information when needed.

## Guidelines:
- Be personalized - use the user's name and reference their preferences
- Remember context from previous conversations
- Be friendly, helpful, and professional
- Use markdown formatting for clarity`;

    const systemPrompt = baseSystemPrompt + userMemories;

    // Helper function to save memory
    const saveMemory = async (key: string, value: string, category: string) => {
      if (!userId || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.log('Cannot save memory: missing user or config');
        return false;
      }
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { error } = await supabase
        .from('user_memories')
        .upsert(
          { user_id: userId, key, value, category, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,key' }
        );
      
      if (error) {
        console.error('Error saving memory:', error);
        return false;
      }
      
      console.log(`Saved memory: ${key} = ${value} (${category})`);
      return true;
    };

    // Make initial request
    const makeRequest = async (msgs: any[], attempt = 1): Promise<Response> => {
      const maxAttempts = 3;
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...msgs,
          ],
          stream: false, // Use non-streaming for tool handling
          tools: tools,
          tool_choice: "auto",
        }),
      });

      if (response.status >= 500 && attempt < maxAttempts) {
        console.log(`Attempt ${attempt} failed with ${response.status}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        return makeRequest(msgs, attempt + 1);
      }

      return response;
    };

    // Process the request with tool handling
    let currentMessages = [...messages];
    let iterations = 0;
    const maxIterations = 3;
    
    while (iterations < maxIterations) {
      iterations++;
      
      const response = await makeRequest(currentMessages);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI error:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Usage limit reached.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status >= 500) {
          return new Response(JSON.stringify({ error: 'AI service temporarily unavailable.' }), {
            status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      
      if (!choice) {
        throw new Error('No response from AI');
      }

      const message = choice.message;
      
      // Check if AI wants to use tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log('AI requested tool calls:', message.tool_calls.length);
        
        // Add assistant message with tool calls
        currentMessages.push({
          role: 'assistant',
          content: message.content || '',
          tool_calls: message.tool_calls,
        });
        
        // Process each tool call
        for (const toolCall of message.tool_calls as ToolCall[]) {
          const { name, arguments: argsString } = toolCall.function;
          let result = '';
          
          try {
            const args = JSON.parse(argsString);
            
            if (name === 'remember_user_info') {
              const saved = await saveMemory(args.key, args.value, args.category || 'general');
              result = saved 
                ? `Successfully remembered: ${args.key} = "${args.value}"`
                : 'Memory save failed';
            } else if (name === 'execute_code') {
              result = `Code execution requested for ${args.language}: ${args.code.substring(0, 100)}...`;
            } else if (name === 'analyze_document') {
              result = `Document analysis requested for: ${args.fileName}`;
            } else {
              result = `Unknown tool: ${name}`;
            }
          } catch (e) {
            result = `Error processing tool call: ${e}`;
          }
          
          // Add tool response
          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        }
        
        // Continue to get final response
        continue;
      }
      
      // No tool calls, return the final response as a stream
      const finalContent = message.content || '';
      console.log('Final response ready, streaming...');
      
      // Create a streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send the response as SSE chunks
          const chunk = {
            choices: [{
              delta: { content: finalContent },
              finish_reason: 'stop'
            }]
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      
      return new Response(stream, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    throw new Error('Max iterations reached');
  } catch (error: unknown) {
    console.error('Error in chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
