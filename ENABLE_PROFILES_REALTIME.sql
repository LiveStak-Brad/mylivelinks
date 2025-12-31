-- ============================================
-- ENABLE PROFILES REALTIME FOR CHAT CUSTOMIZATION
-- Allow chat styling updates to reflect in real-time
-- ============================================

-- Step 1: Add profiles to realtime publication (if not already)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    RAISE NOTICE '✅ Added profiles to realtime publication';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE '✅ profiles already in realtime publication';
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Error adding to publication: %', SQLERRM;
  END;
END $$;

-- Step 2: Verify profiles is in publication
SELECT 
  'Publication check' as check_type,
  COUNT(*) as count
FROM pg_publication_tables 
WHERE tablename = 'profiles' AND pubname = 'supabase_realtime';

-- Step 3: Check RLS policies for profiles (should allow SELECT for chat to work)
SELECT 
  'RLS policies' as check_type,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

SELECT '✅ Setup complete! Profile updates will now broadcast in real-time.' as status;
