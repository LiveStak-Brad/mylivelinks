# DO NOT TOUCH: Gifting (P0)

Gifting is a production-critical money surface.

If gifting is working: **do not change it casually**.

## Locked artifacts

- public.send_gift_v2(uuid, uuid, bigint, bigint, bigint, varchar, text)
- public.send_gift_v2(uuid, uuid, bigint, bigint, bigint, varchar) (back-compat wrapper)
- public.ledger_entries (authoritative wallet/ledger)
- public.gifts (gift event log)
- supabase/verification/GIFTING_SMOKE_TEST.sql
- supabase/migrations/20260110b_lock_send_gift_v2_signature.sql

## Rules

- If anyone proposes changes to gifting or money flows:
  - Update/extend the smoke test.
  - Provide evidence (SQL outputs) showing the signature + smoke test still pass.
  - Do not merge without running the smoke test.

## How to verify before merging

- Run the SQL smoke test: supabase/verification/GIFTING_SMOKE_TEST.sql
- Confirm the locked signature migration still succeeds: supabase/migrations/20260110b_lock_send_gift_v2_signature.sql
