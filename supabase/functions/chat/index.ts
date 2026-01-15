import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Tool definitions for the AI
const tools = [
  {
    type: "function",
    function: {
      name: "execute_code",
      description: "Execute JavaScript or Python code and return the result. Use this when the user asks you to run, execute, calculate, or test code. Supports console.log, mathematical operations, array/object manipulation, and basic Python syntax.",
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
            description: "The programming language (javascript or python)"
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
      description: "Analyze and extract information from uploaded documents like CSV, JSON, code files, markdown, etc. Use this when the user uploads a file and asks for analysis, summary, or data extraction.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The document content to analyze"
          },
          fileName: {
            type: "string",
            description: "The name of the file being analyzed"
          },
          fileType: {
            type: "string",
            description: "The MIME type or extension of the file"
          }
        },
        required: ["content", "fileName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remember_context",
      description: "Remember important information from the conversation for future reference. Use this to store user preferences, important facts, or context that should persist.",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "A short identifier for this memory (e.g., 'user_name', 'project_goal')"
          },
          value: {
            type: "string",
            description: "The information to remember"
          }
        },
        required: ["key", "value"]
      }
    }
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt: customSystemPrompt, conversationMemory, model } = await req.json();
    
    // Default to Gemini 3 Flash if no model specified
    const selectedModel = model || 'google/gemini-3-flash-preview';
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Validate messages
    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array');
    }

    console.log('Sending request to Lovable AI with', messages.length, 'messages');

    // Check if any message has multimodal content
    const hasMultimodal = messages.some((m: ChatMessage) => Array.isArray(m.content));
    console.log('Multimodal content detected:', hasMultimodal);

    // Build memory context
    let memoryContext = '';
    if (conversationMemory && Object.keys(conversationMemory).length > 0) {
      memoryContext = '\n\n**Remembered context from this conversation:**\n';
      for (const [key, value] of Object.entries(conversationMemory)) {
        memoryContext += `- ${key}: ${value}\n`;
      }
    }

    // Use custom system prompt if provided, otherwise use default
    const baseSystemPrompt = customSystemPrompt || `You are Mohamed's AI, an intelligent, helpful, and professional assistant with advanced capabilities.
Current date: ${new Date().toISOString().split('T')[0]}

## Core Capabilities:
- **Code Execution**: You can run JavaScript and Python code using the execute_code tool. When users ask you to calculate, run code, or test something, use this tool.
- **Document Analysis**: You can analyze uploaded files (CSV, JSON, code, markdown, etc.) using the analyze_document tool.
- **Memory**: You can remember important information using the remember_context tool. Use this to store user preferences, names, project details, etc.
- **Image Analysis**: You can analyze images and provide detailed descriptions.
- **Web Search**: Real-time information is provided when available.

## Guidelines:
- When asked to run or execute code, ALWAYS use the execute_code tool
- When analyzing uploaded files, use the analyze_document tool for better structured output
- Remember important user details for personalized responses
- Be concise but thorough. Use markdown formatting.
- Be friendly and professional.
- Always provide accurate, up-to-date information.`;

    const systemPrompt = baseSystemPrompt + memoryContext;

    // Helper function to make API request with retry logic
    const makeRequest = async (attempt = 1): Promise<Response> => {
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
            ...messages,
          ],
          stream: true,
          tools: tools,
          tool_choice: "auto",
        }),
      });

      // Retry on 5xx errors (server-side/transient issues)
      if (response.status >= 500 && attempt < maxAttempts) {
        console.log(`Attempt ${attempt} failed with ${response.status}, retrying in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        return makeRequest(attempt + 1);
      }

      return response;
    };

    const response = await makeRequest();

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status >= 500) {
        return new Response(JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    console.log('Successfully connected to Lovable AI, streaming response');

    // Return the stream directly
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('Error in chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
