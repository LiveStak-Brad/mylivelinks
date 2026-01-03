-- Quick check: Does the function still have the bug (SELECT *)?
SELECT 
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%wa.%*%' OR pg_get_functiondef(oid) LIKE '%wr.%*%' 
    THEN 'BROKEN - Still has SELECT * bug'
    WHEN pg_get_functiondef(oid) LIKE '%role_text%' 
    THEN 'FIXED - Has role_text'
    ELSE 'UNKNOWN'
  END AS status,
  LENGTH(pg_get_functiondef(oid)) AS function_length
FROM pg_proc
WHERE proname = 'rpc_get_team_chat_messages_v2'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
