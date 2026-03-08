-- 1. Drop the overly permissive anon policy on shared_conversations
DROP POLICY IF EXISTS "Anon can view non-expired shares by token" ON public.shared_conversations;

-- 2. Drop overly permissive anon policy on conversations
DROP POLICY IF EXISTS "Anon can view shared conversations" ON public.conversations;

-- 3. Drop anon policy on messages (leaks soft-deleted messages)
DROP POLICY IF EXISTS "Anon can view messages in shared conversations" ON public.messages;

-- 4. Create SECURITY DEFINER function to safely fetch shared conversations by token
CREATE OR REPLACE FUNCTION public.get_shared_conversation(_token text)
RETURNS TABLE (
  conversation_id uuid,
  conversation_title text,
  conversation_created_at timestamptz,
  message_id uuid,
  message_role text,
  message_content text,
  message_created_at timestamptz,
  message_attachments jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.title,
    c.created_at,
    m.id,
    m.role,
    m.content,
    m.created_at,
    m.attachments
  FROM shared_conversations sc
  JOIN conversations c ON c.id = sc.conversation_id
  LEFT JOIN messages m ON m.conversation_id = c.id AND m.deleted_at IS NULL
  WHERE sc.share_token = _token
    AND (sc.expires_at IS NULL OR sc.expires_at > now())
  ORDER BY m.created_at ASC;
$$;
