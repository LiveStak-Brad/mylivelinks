-- Check column names for all the tables we're adding RLS policies to
SELECT 
  table_name,
  string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'diamond_wallets',
    'gifter_levels', 
    'admin_allowlist',
    'vip_unlocks',
    'stripe_events',
    'stripe_connected_accounts',
    'gift_payout_config',
    'leaderboard_cache',
    'withdrawal_config',
    'vip_pack_purchases'
  )
GROUP BY table_name
ORDER BY table_name;
