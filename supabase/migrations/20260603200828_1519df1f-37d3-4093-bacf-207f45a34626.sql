
-- Remove broad public listing on moha bucket; public URLs still serve files
DROP POLICY IF EXISTS "Public can read moha bucket" ON storage.objects;

CREATE POLICY "Users can read their own files in moha"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'moha'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Revoke direct execute on internal trigger functions
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
