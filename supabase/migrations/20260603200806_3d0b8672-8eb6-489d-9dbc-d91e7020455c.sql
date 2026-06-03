
-- 1. Lock down user_roles: prevent privilege escalation
CREATE POLICY "Users can view their own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Storage RLS policies
-- Public bucket 'moha': public read, owner-scoped write (path = <uid>/...)
CREATE POLICY "Public can read moha bucket"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'moha');

CREATE POLICY "Users can upload to their own folder in moha"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'moha'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own files in moha"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'moha'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own files in moha"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'moha'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Private bucket 'mohaa': owner-only access
CREATE POLICY "Users can read their own files in mohaa"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'mohaa'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload to their own folder in mohaa"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'mohaa'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own files in mohaa"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'mohaa'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own files in mohaa"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'mohaa'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Harden handle_new_user: validate full_name length
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    LEFT(COALESCE(new.raw_user_meta_data->>'full_name', ''), 255)
  );
  RETURN new;
END;
$function$;

-- 4. Restrict has_role: only callable from RLS / server contexts, not the public API
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
