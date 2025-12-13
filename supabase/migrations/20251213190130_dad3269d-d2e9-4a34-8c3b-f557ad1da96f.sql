-- Create shared_conversations table for public sharing
CREATE TABLE public.shared_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  user_id uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.shared_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can create shares for their conversations"
ON public.shared_conversations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own shares"
ON public.shared_conversations FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own shares"
ON public.shared_conversations FOR DELETE
USING (user_id = auth.uid());

-- Create user_memories table for persistent context
CREATE TABLE public.user_memories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  category text DEFAULT 'general',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

-- Enable RLS
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

-- RLS policies for memories
CREATE POLICY "Users can manage their own memories"
ON public.user_memories FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_memories_updated_at
BEFORE UPDATE ON public.user_memories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create prompt_templates table
CREATE TABLE public.prompt_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  prompt text NOT NULL,
  category text NOT NULL,
  icon text,
  is_system boolean DEFAULT false,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view system templates, users can view their own
CREATE POLICY "View prompt templates"
ON public.prompt_templates FOR SELECT
USING (is_system = true OR user_id = auth.uid());

-- Users can create their own templates
CREATE POLICY "Users can create templates"
ON public.prompt_templates FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_system = false);

-- Users can delete their own templates
CREATE POLICY "Users can delete their templates"
ON public.prompt_templates FOR DELETE
USING (auth.uid() = user_id AND is_system = false);

-- Insert default system prompts
INSERT INTO public.prompt_templates (title, description, prompt, category, icon, is_system) VALUES
('Write Email', 'Compose a professional email', 'Write a professional email about: [topic]. The tone should be [formal/casual] and the purpose is [purpose].', 'writing', 'mail', true),
('Code Review', 'Review and improve code', 'Please review this code and suggest improvements for readability, performance, and best practices:\n\n```\n[paste code here]\n```', 'coding', 'code', true),
('Summarize Text', 'Summarize long content', 'Please summarize the following text in a concise manner, highlighting the key points:\n\n[paste text here]', 'analysis', 'file-text', true),
('Explain Concept', 'Explain technical concepts', 'Explain [concept] in simple terms. Use analogies and examples to make it easy to understand for someone who is new to this topic.', 'learning', 'lightbulb', true),
('Debug Code', 'Help fix code errors', 'I have an error in my code. Here''s the error message and code:\n\nError: [error message]\n\nCode:\n```\n[paste code]\n```\n\nPlease help me identify and fix the issue.', 'coding', 'bug', true),
('Brainstorm Ideas', 'Generate creative ideas', 'Help me brainstorm ideas for [topic/project]. I need [number] creative and unique suggestions that consider [constraints/requirements].', 'creative', 'sparkles', true),
('Data Analysis', 'Analyze data patterns', 'Analyze this data and identify patterns, trends, and insights:\n\n[paste data here]\n\nProvide a summary of your findings with actionable recommendations.', 'analysis', 'bar-chart', true),
('Translate Text', 'Translate to another language', 'Translate the following text to [target language]. Maintain the original tone and context:\n\n[paste text here]', 'writing', 'languages', true);