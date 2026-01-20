-- MyLiveLinks test gift (idempotent insert/update)
-- Requires gift_types table with name unique or indexed.

DO $$
DECLARE
  has_emoji boolean;
  has_animation boolean;
  has_icon boolean;
  has_sound boolean;
  insert_cols text := 'name, coin_cost, tier, display_order, is_active';
  insert_vals text := quote_literal('MyLiveLinks') || ', 100, 2, 1, true';
  update_sets text := 'coin_cost = EXCLUDED.coin_cost, tier = EXCLUDED.tier, display_order = EXCLUDED.display_order, is_active = EXCLUDED.is_active';
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gift_types' AND column_name = 'emoji'
  ) INTO has_emoji;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gift_types' AND column_name = 'animation_url'
  ) INTO has_animation;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gift_types' AND column_name = 'icon_url'
  ) INTO has_icon;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gift_types' AND column_name = 'sound_url'
  ) INTO has_sound;

  IF has_emoji THEN
    insert_cols := insert_cols || ', emoji';
    insert_vals := insert_vals || ', ' || quote_literal('MLL');
    update_sets := update_sets || ', emoji = EXCLUDED.emoji';
  END IF;

  IF has_animation THEN
    insert_cols := insert_cols || ', animation_url';
    insert_vals := insert_vals || ', ' || quote_literal('/gifts/logogift.mp4');
    update_sets := update_sets || ', animation_url = EXCLUDED.animation_url';
  END IF;

  IF has_icon THEN
    insert_cols := insert_cols || ', icon_url';
    insert_vals := insert_vals || ', ' || quote_literal('/gifts/mylivelinks_logo.png');
    update_sets := update_sets || ', icon_url = EXCLUDED.icon_url';
  END IF;

  IF has_sound THEN
    insert_cols := insert_cols || ', sound_url';
    insert_vals := insert_vals || ', ' || quote_literal('/sfx/live_alert.wav');
    update_sets := update_sets || ', sound_url = EXCLUDED.sound_url';
  END IF;

  EXECUTE format(
    'INSERT INTO gift_types (%s) VALUES (%s) ON CONFLICT (name) DO UPDATE SET %s;',
    insert_cols,
    insert_vals,
    update_sets
  );
END $$;
