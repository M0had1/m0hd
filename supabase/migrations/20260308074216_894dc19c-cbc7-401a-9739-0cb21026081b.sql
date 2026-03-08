-- Allow admins to view all user memories
CREATE POLICY "Admins can view all memories"
ON public.user_memories
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete any user memory
CREATE POLICY "Admins can delete any memory"
ON public.user_memories
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage all messages (update/delete)
CREATE POLICY "Admins can delete any message"
ON public.messages
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
