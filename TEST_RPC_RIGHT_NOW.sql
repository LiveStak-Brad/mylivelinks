-- Test the RPC directly to see if it works
SELECT get_public_profile_with_adult_filtering('CannaStreams', NULL, 'web');

-- If this works, the problem is NOT in Supabase, it's in Vercel

