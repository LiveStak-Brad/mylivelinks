-- Check if CannaStreams has received any gifts
SELECT 
  g.id,
  g.coin_value,
  g.created_at,
  sender.username as sender_username,
  recipient.username as recipient_username
FROM public.gifts g
JOIN public.profiles sender ON sender.id = g.sender_id
JOIN public.profiles recipient ON recipient.id = g.recipient_id
WHERE recipient.username ILIKE 'CannaStreams'
ORDER BY g.created_at DESC
LIMIT 20;

-- Count total gifts received by CannaStreams
SELECT COUNT(*) as total_gifts, SUM(coin_value) as total_coins
FROM public.gifts g
JOIN public.profiles recipient ON recipient.id = g.recipient_id
WHERE recipient.username ILIKE 'CannaStreams';

