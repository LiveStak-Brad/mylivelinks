-- Check which version of send_gift_v2 is currently deployed
-- Looking for ON CONFLICT clauses in the function definition

SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'send_gift_v2'
AND pronamespace = 'public'::regnamespace;

-- Also check if the idempotency_key constraint exists on ledger_entries
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.ledger_entries'::regclass
  AND conname LIKE '%idempotency%';

-- Check indexes on ledger_entries
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'ledger_entries'
  AND schemaname = 'public';
