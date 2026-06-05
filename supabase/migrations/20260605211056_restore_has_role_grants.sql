-- Restore EXECUTE on has_role to authenticated role.
-- It is SECURITY DEFINER and only reads user_roles, so it is safe to expose
-- to authenticated users; without this, every RLS policy that calls
-- has_role() fails with "permission denied for function has_role".
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
