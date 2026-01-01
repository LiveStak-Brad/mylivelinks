-- Check post_likes table RLS and permissions
-- Run this to see what's wrong

-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'post_likes';

-- 2. Check what policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'post_likes';

-- 3. Check grants
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'post_likes' AND table_schema = 'public';
