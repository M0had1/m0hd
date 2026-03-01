import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, imageUrl, mode } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Prompt is required and must be a string' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (prompt.length > 4000) {
      return new Response(JSON.stringify({ error: 'Prompt too long (max 4000 characters)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Image request:', { prompt: prompt.slice(0, 100), mode, hasImageUrl: !!imageUrl });

    // Build message content based on mode
    let messageContent: any;
    
    if (mode === 'edit' && imageUrl) {
      // Image editing mode — give the model clear editing instructions
      messageContent = [
        {
          type: 'text',
          text: `Edit this image according to the following instructions. Apply the changes accurately while preserving the rest of the image as much as possible.\n\nEditing instructions: ${prompt}`
        },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl
          }
        }
      ];
    } else {
      // Image generation mode
      messageContent = `Generate an image based on this description: ${prompt}`;
    }

    // Use gemini-3-pro-image-preview for better image editing quality
    const model = (mode === 'edit' && imageUrl)
      ? 'google/gemini-3-pro-image-preview'
      : 'google/gemini-2.5-flash-image-preview';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: messageContent
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached. Please add credits to continue.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Image response received, extracting image data...');

    // Extract the generated/edited image — try multiple response paths
    let imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // Fallback: check inline_data format
    if (!imageData) {
      const parts = data.choices?.[0]?.message?.content;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part.type === 'image_url') {
            imageData = part.image_url?.url;
            break;
          }
          if (part.inline_data) {
            imageData = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
            break;
          }
        }
      }
    }

    const textContent = (() => {
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n');
      }
      return '';
    })();

    if (!imageData) {
      console.error('No image data in response:', JSON.stringify(data).slice(0, 500));
      throw new Error('No image was generated. Please try a different prompt.');
    }

    // Upload to storage for reliable serving
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Convert base64 to binary
      const base64Match = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        const mimeType = base64Match[1];
        const base64Data = base64Match[2];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const ext = mimeType.includes('png') ? 'png' : 'jpg';
        const fileName = `generated/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('moha')
          .upload(fileName, binaryData, { contentType: mimeType, upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('moha').getPublicUrl(fileName);
          imageData = urlData.publicUrl;
          console.log('Image uploaded to storage:', imageData);
        } else {
          console.error('Storage upload failed, using base64:', uploadError);
        }
      }
    } catch (storageErr) {
      console.error('Storage upload error, using base64:', storageErr);
    }

    return new Response(JSON.stringify({ 
      imageUrl: imageData,
      text: textContent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in generate-image function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});