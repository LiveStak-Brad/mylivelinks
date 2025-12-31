-- Quick check: what type is post_comments.id?
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'post_comments' 
  AND column_name = 'id';
