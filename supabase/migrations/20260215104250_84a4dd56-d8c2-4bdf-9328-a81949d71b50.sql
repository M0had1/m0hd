
-- Allow anonymous users to view non-expired shared conversations
CREATE POLICY "Anon can view non-expired shares by token"
ON public.shared_conversations FOR SELECT
TO anon
USING (expires_at IS NULL OR expires_at > now());

-- Allow anonymous users to view conversations that have been shared
CREATE POLICY "Anon can view shared conversations"
ON public.conversations FOR SELECT
TO anon
USING (EXISTS (
  SELECT 1 FROM shared_conversations sc
  WHERE sc.conversation_id = conversations.id
  AND (sc.expires_at IS NULL OR sc.expires_at > now())
));

-- Allow anonymous users to view messages in shared conversations
CREATE POLICY "Anon can view messages in shared conversations"
ON public.messages FOR SELECT
TO anon
USING (EXISTS (
  SELECT 1 FROM shared_conversations sc
  WHERE sc.conversation_id = messages.conversation_id
  AND (sc.expires_at IS NULL OR sc.expires_at > now())
));
