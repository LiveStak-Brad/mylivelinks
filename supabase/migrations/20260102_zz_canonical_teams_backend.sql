BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_member_role') THEN
    CREATE TYPE public.team_member_role AS ENUM ('Team_Admin','Team_Moderator','Team_Member');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_membership_status') THEN
    CREATE TYPE public.team_membership_status AS ENUM ('requested','approved','rejected','banned','left');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL,
  team_tag text NOT NULL,
  description text,
  rules text,
  icon_url text,
  banner_url text,
  theme_color text,
  approved_member_count int NOT NULL DEFAULT 0,
  pending_request_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teams_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{5,62}[a-z0-9]$'),
  CONSTRAINT teams_tag_format CHECK (team_tag ~ '^[A-Z0-9]{3,5}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_teams_created_by ON public.teams(created_by);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_teams_slug ON public.teams(slug);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_teams_team_tag ON public.teams(team_tag);

CREATE TABLE IF NOT EXISTS public.team_memberships (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.team_membership_status NOT NULL DEFAULT 'requested',
  role public.team_member_role NOT NULL DEFAULT 'Team_Member',
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  left_at timestamptz,
  banned_at timestamptz,
  last_status_changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_memberships_status_ts_consistency CHECK (
    (status <> 'approved' OR approved_at IS NOT NULL)
    AND (status <> 'rejected' OR rejected_at IS NOT NULL)
    AND (status <> 'left' OR left_at IS NOT NULL)
    AND (status <> 'banned' OR banned_at IS NOT NULL)
  ),
  PRIMARY KEY (team_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_team_memberships_team_status ON public.team_memberships(team_id, status);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team_role ON public.team_memberships(team_id, role);
CREATE INDEX IF NOT EXISTS idx_team_memberships_profile_status ON public.team_memberships(profile_id, status);

CREATE OR REPLACE FUNCTION public.recompute_team_member_counts(p_team_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  UPDATE public.teams t
  SET
    approved_member_count = (
      SELECT COUNT(*)
      FROM public.team_memberships m
      WHERE m.team_id = p_team_id
        AND m.status = 'approved'
    ),
    pending_request_count = (
      SELECT COUNT(*)
      FROM public.team_memberships m
      WHERE m.team_id = p_team_id
        AND m.status = 'requested'
    ),
    updated_at = now()
  WHERE t.id = p_team_id;
$$;

CREATE OR REPLACE FUNCTION public.trg_team_memberships_recount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  PERFORM public.recompute_team_member_counts(COALESCE(NEW.team_id, OLD.team_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_team_memberships_recount ON public.team_memberships;
CREATE TRIGGER trigger_team_memberships_recount
AFTER INSERT OR UPDATE OR DELETE ON public.team_memberships
FOR EACH ROW EXECUTE FUNCTION public.trg_team_memberships_recount();

CREATE TABLE IF NOT EXISTS public.team_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  banned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_team_bans_team ON public.team_bans(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_bans_profile ON public.team_bans(profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.team_mutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('team_chat','team_live_chat','all')),
  live_stream_id int REFERENCES public.live_streams(id) ON DELETE CASCADE,
  muted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_mutes_scope_stream_consistency CHECK ((scope <> 'team_live_chat') OR (live_stream_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_team_mutes_team ON public.team_mutes(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_mutes_profile ON public.team_mutes(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_mutes_team_profile ON public.team_mutes(team_id, profile_id);

CREATE TABLE IF NOT EXISTS public.team_permissions (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_key text NOT NULL CHECK (
    permission_key IN (
      'can_start_live',
      'can_post',
      'can_comment',
      'can_react',
      'can_upload_assets',
      'can_manage_emotes'
    )
  ),
  is_allowed boolean NOT NULL DEFAULT true,
  set_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, profile_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_team_permissions_team ON public.team_permissions(team_id);

CREATE TABLE IF NOT EXISTS public.team_feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_content text NOT NULL,
  media_url text,
  is_pinned boolean NOT NULL DEFAULT false,
  pinned_at timestamptz,
  comment_count int NOT NULL DEFAULT 0,
  reaction_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_feed_posts_team_created
  ON public.team_feed_posts(team_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_team_feed_posts_team_pinned
  ON public.team_feed_posts(team_id, is_pinned DESC, pinned_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_feed_posts_author
  ON public.team_feed_posts(author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.team_feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.team_feed_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_content text NOT NULL,
  parent_comment_id uuid REFERENCES public.team_feed_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_feed_comments_post_created
  ON public.team_feed_comments(post_id, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_team_feed_comments_team_created
  ON public.team_feed_comments(team_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.team_feed_reactions (
  post_id uuid NOT NULL REFERENCES public.team_feed_posts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, profile_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_team_feed_reactions_post_id ON public.team_feed_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_team_feed_reactions_profile_id ON public.team_feed_reactions(profile_id);

CREATE TABLE IF NOT EXISTS public.team_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  is_pinned boolean NOT NULL DEFAULT false,
  pinned_at timestamptz,
  reply_count int NOT NULL DEFAULT 0,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_threads_team_activity
  ON public.team_threads(team_id, last_activity_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_team_threads_team_new
  ON public.team_threads(team_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS public.team_thread_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.team_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_thread_comments_thread_created
  ON public.team_thread_comments(thread_id, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_team_thread_comments_team_created
  ON public.team_thread_comments(team_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.trg_team_thread_comment_bump()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  UPDATE public.team_threads
  SET reply_count = reply_count + 1,
      last_activity_at = now(),
      updated_at = now()
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_team_thread_comment_bump ON public.team_thread_comments;
CREATE TRIGGER trigger_team_thread_comment_bump
AFTER INSERT ON public.team_thread_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_team_thread_comment_bump();

CREATE TABLE IF NOT EXISTS public.team_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('icon','banner','emote','media')),
  storage_path text NOT NULL,
  public_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_assets_team_created
  ON public.team_assets(team_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.team_emotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  shortcode text NOT NULL CHECK (shortcode ~ '^[a-z0-9_]{2,20}$'),
  asset_id uuid NOT NULL REFERENCES public.team_assets(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, shortcode)
);

CREATE INDEX IF NOT EXISTS idx_team_emotes_team
  ON public.team_emotes(team_id);

CREATE TABLE IF NOT EXISTS public.team_live_rooms (
  live_stream_id int PRIMARY KEY REFERENCES public.live_streams(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, live_stream_id)
);

CREATE INDEX IF NOT EXISTS idx_team_live_rooms_team
  ON public.team_live_rooms(team_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_team_approved_member(p_team_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships m
    WHERE m.team_id = p_team_id
      AND m.profile_id = p_profile_id
      AND m.status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.team_role(p_team_id uuid, p_profile_id uuid)
RETURNS public.team_member_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT m.role
  FROM public.team_memberships m
  WHERE m.team_id = p_team_id
    AND m.profile_id = p_profile_id
    AND m.status = 'approved';
$$;

CREATE OR REPLACE FUNCTION public.team_can_moderate(p_team_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships m
    WHERE m.team_id = p_team_id
      AND m.profile_id = p_profile_id
      AND m.status = 'approved'
      AND m.role IN ('Team_Admin','Team_Moderator')
  );
$$;

CREATE OR REPLACE FUNCTION public.team_id_for_live_stream(p_stream_id int)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT tlr.team_id
  FROM public.team_live_rooms tlr
  WHERE tlr.live_stream_id = p_stream_id;
$$;

CREATE OR REPLACE FUNCTION public.is_team_muted(p_team_id uuid, p_profile_id uuid, p_stream_id int)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_mutes m
    WHERE m.team_id = p_team_id
      AND m.profile_id = p_profile_id
      AND (m.expires_at IS NULL OR m.expires_at > now())
      AND (
        m.scope IN ('all','team_chat')
        OR (m.scope = 'team_live_chat' AND m.live_stream_id = p_stream_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_banned(p_team_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_bans b
    WHERE b.team_id = p_team_id
      AND b.profile_id = p_profile_id
      AND (b.expires_at IS NULL OR b.expires_at > now())
  );
$$;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_feed_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_thread_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_emotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_live_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teams_select_public ON public.teams;
CREATE POLICY teams_select_public
ON public.teams FOR SELECT
USING (true);

DROP POLICY IF EXISTS teams_update_admin_mod ON public.teams;
CREATE POLICY teams_update_admin_mod
ON public.teams FOR UPDATE
USING (public.team_can_moderate(id, auth.uid()))
WITH CHECK (public.team_can_moderate(id, auth.uid()));

DROP POLICY IF EXISTS team_memberships_select ON public.team_memberships;
CREATE POLICY team_memberships_select
ON public.team_memberships FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    profile_id = auth.uid()
    OR (public.is_team_approved_member(team_id, auth.uid()) AND status = 'approved')
    OR public.team_can_moderate(team_id, auth.uid())
  )
);

DROP POLICY IF EXISTS team_memberships_insert_request ON public.team_memberships;
CREATE POLICY team_memberships_insert_request
ON public.team_memberships FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND profile_id = auth.uid()
  AND status = 'requested'
);

DROP POLICY IF EXISTS team_memberships_update_leave ON public.team_memberships;
CREATE POLICY team_memberships_update_leave
ON public.team_memberships FOR UPDATE
USING (auth.uid() IS NOT NULL AND profile_id = auth.uid())
WITH CHECK (
  auth.uid() IS NOT NULL
  AND profile_id = auth.uid()
  AND status = 'left'
);

DROP POLICY IF EXISTS team_bans_select ON public.team_bans;
CREATE POLICY team_bans_select
ON public.team_bans FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (public.team_can_moderate(team_id, auth.uid()) OR profile_id = auth.uid())
);

DROP POLICY IF EXISTS team_bans_write_mod ON public.team_bans;
CREATE POLICY team_bans_write_mod
ON public.team_bans FOR ALL
USING (public.team_can_moderate(team_id, auth.uid()))
WITH CHECK (public.team_can_moderate(team_id, auth.uid()));

DROP POLICY IF EXISTS team_mutes_select ON public.team_mutes;
CREATE POLICY team_mutes_select
ON public.team_mutes FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (public.team_can_moderate(team_id, auth.uid()) OR profile_id = auth.uid())
);

DROP POLICY IF EXISTS team_mutes_write_mod ON public.team_mutes;
CREATE POLICY team_mutes_write_mod
ON public.team_mutes FOR ALL
USING (public.team_can_moderate(team_id, auth.uid()))
WITH CHECK (public.team_can_moderate(team_id, auth.uid()));

DROP POLICY IF EXISTS team_permissions_select ON public.team_permissions;
CREATE POLICY team_permissions_select
ON public.team_permissions FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (public.team_can_moderate(team_id, auth.uid()) OR profile_id = auth.uid())
);

DROP POLICY IF EXISTS team_permissions_write_mod ON public.team_permissions;
CREATE POLICY team_permissions_write_mod
ON public.team_permissions FOR ALL
USING (public.team_can_moderate(team_id, auth.uid()))
WITH CHECK (public.team_can_moderate(team_id, auth.uid()));

DROP POLICY IF EXISTS team_feed_posts_select ON public.team_feed_posts;
CREATE POLICY team_feed_posts_select
ON public.team_feed_posts FOR SELECT
USING (public.is_team_approved_member(team_id, auth.uid()));

DROP POLICY IF EXISTS team_feed_posts_insert ON public.team_feed_posts;
CREATE POLICY team_feed_posts_insert
ON public.team_feed_posts FOR INSERT
WITH CHECK (
  public.is_team_approved_member(team_id, auth.uid())
  AND author_id = auth.uid()
);

DROP POLICY IF EXISTS team_feed_posts_update_author_or_mod ON public.team_feed_posts;
CREATE POLICY team_feed_posts_update_author_or_mod
ON public.team_feed_posts FOR UPDATE
USING (
  public.is_team_approved_member(team_id, auth.uid())
  AND (author_id = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
)
WITH CHECK (
  public.is_team_approved_member(team_id, auth.uid())
  AND (author_id = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
);

DROP POLICY IF EXISTS team_feed_posts_delete_author_or_mod ON public.team_feed_posts;
CREATE POLICY team_feed_posts_delete_author_or_mod
ON public.team_feed_posts FOR DELETE
USING (
  public.is_team_approved_member(team_id, auth.uid())
  AND (author_id = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
);

DROP POLICY IF EXISTS team_feed_comments_select ON public.team_feed_comments;
CREATE POLICY team_feed_comments_select
ON public.team_feed_comments FOR SELECT
USING (public.is_team_approved_member(team_id, auth.uid()));

DROP POLICY IF EXISTS team_feed_comments_insert ON public.team_feed_comments;
CREATE POLICY team_feed_comments_insert
ON public.team_feed_comments FOR INSERT
WITH CHECK (
  public.is_team_approved_member(team_id, auth.uid())
  AND author_id = auth.uid()
);

DROP POLICY IF EXISTS team_feed_comments_update_author_or_mod ON public.team_feed_comments;
CREATE POLICY team_feed_comments_update_author_or_mod
ON public.team_feed_comments FOR UPDATE
USING (
  public.is_team_approved_member(team_id, auth.uid())
  AND (author_id = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
)
WITH CHECK (
  public.is_team_approved_member(team_id, auth.uid())
  AND (author_id = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
);

DROP POLICY IF EXISTS team_feed_comments_delete_author_or_mod ON public.team_feed_comments;
CREATE POLICY team_feed_comments_delete_author_or_mod
ON public.team_feed_comments FOR DELETE
USING (
  public.is_team_approved_member(team_id, auth.uid())
  AND (author_id = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
);

DROP POLICY IF EXISTS team_feed_reactions_select ON public.team_feed_reactions;
CREATE POLICY team_feed_reactions_select
ON public.team_feed_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.team_feed_posts p
    WHERE p.id = team_feed_reactions.post_id
      AND public.is_team_approved_member(p.team_id, auth.uid())
  )
);

DROP POLICY IF EXISTS team_feed_reactions_insert ON public.team_feed_reactions;
CREATE POLICY team_feed_reactions_insert
ON public.team_feed_reactions FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND profile_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.team_feed_posts p
    WHERE p.id = team_feed_reactions.post_id
      AND public.is_team_approved_member(p.team_id, auth.uid())
  )
);

DROP POLICY IF EXISTS team_feed_reactions_delete_self_or_mod ON public.team_feed_reactions;
CREATE POLICY team_feed_reactions_delete_self_or_mod
ON public.team_feed_reactions FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.team_feed_posts p
      WHERE p.id = team_feed_reactions.post_id
        AND public.team_can_moderate(p.team_id, auth.uid())
    )
  )
);

DROP POLICY IF EXISTS team_threads_select ON public.team_threads;
CREATE POLICY team_threads_select
ON public.team_threads FOR SELECT
USING (public.is_team_approved_member(team_id, auth.uid()));

DROP POLICY IF EXISTS team_threads_insert ON public.team_threads;
CREATE POLICY team_threads_insert
ON public.team_threads FOR INSERT
WITH CHECK (
  public.is_team_approved_member(team_id, auth.uid())
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS team_threads_update_author_or_mod ON public.team_threads;
CREATE POLICY team_threads_update_author_or_mod
ON public.team_threads FOR UPDATE
USING (
  public.is_team_approved_member(team_id, auth.uid())
  AND (created_by = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
)
WITH CHECK (
  public.is_team_approved_member(team_id, auth.uid())
  AND (created_by = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
);

DROP POLICY IF EXISTS team_threads_delete_author_or_mod ON public.team_threads;
CREATE POLICY team_threads_delete_author_or_mod
ON public.team_threads FOR DELETE
USING (
  public.is_team_approved_member(team_id, auth.uid())
  AND (created_by = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
);

DROP POLICY IF EXISTS team_thread_comments_select ON public.team_thread_comments;
CREATE POLICY team_thread_comments_select
ON public.team_thread_comments FOR SELECT
USING (public.is_team_approved_member(team_id, auth.uid()));

DROP POLICY IF EXISTS team_thread_comments_insert ON public.team_thread_comments;
CREATE POLICY team_thread_comments_insert
ON public.team_thread_comments FOR INSERT
WITH CHECK (
  public.is_team_approved_member(team_id, auth.uid())
  AND author_id = auth.uid()
);

DROP POLICY IF EXISTS team_thread_comments_update_author_or_mod ON public.team_thread_comments;
CREATE POLICY team_thread_comments_update_author_or_mod
ON public.team_thread_comments FOR UPDATE
USING (
  public.is_team_approved_member(team_id, auth.uid())
  AND (author_id = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
)
WITH CHECK (
  public.is_team_approved_member(team_id, auth.uid())
  AND (author_id = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
);

DROP POLICY IF EXISTS team_thread_comments_delete_author_or_mod ON public.team_thread_comments;
CREATE POLICY team_thread_comments_delete_author_or_mod
ON public.team_thread_comments FOR DELETE
USING (
  public.is_team_approved_member(team_id, auth.uid())
  AND (author_id = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
);

DROP POLICY IF EXISTS team_assets_select ON public.team_assets;
CREATE POLICY team_assets_select
ON public.team_assets FOR SELECT
USING (public.is_team_approved_member(team_id, auth.uid()));

DROP POLICY IF EXISTS team_assets_insert ON public.team_assets;
CREATE POLICY team_assets_insert
ON public.team_assets FOR INSERT
WITH CHECK (
  public.is_team_approved_member(team_id, auth.uid())
  AND uploaded_by = auth.uid()
);

DROP POLICY IF EXISTS team_assets_update_author_or_mod ON public.team_assets;
CREATE POLICY team_assets_update_author_or_mod
ON public.team_assets FOR UPDATE
USING (
  public.is_team_approved_member(team_id, auth.uid())
  AND (uploaded_by = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
)
WITH CHECK (
  public.is_team_approved_member(team_id, auth.uid())
  AND (uploaded_by = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
);

DROP POLICY IF EXISTS team_assets_delete_author_or_mod ON public.team_assets;
CREATE POLICY team_assets_delete_author_or_mod
ON public.team_assets FOR DELETE
USING (
  public.is_team_approved_member(team_id, auth.uid())
  AND (uploaded_by = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
);

DROP POLICY IF EXISTS team_emotes_select ON public.team_emotes;
CREATE POLICY team_emotes_select
ON public.team_emotes FOR SELECT
USING (public.is_team_approved_member(team_id, auth.uid()));

DROP POLICY IF EXISTS team_emotes_insert ON public.team_emotes;
CREATE POLICY team_emotes_insert
ON public.team_emotes FOR INSERT
WITH CHECK (
  public.is_team_approved_member(team_id, auth.uid())
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS team_emotes_update_author_or_mod ON public.team_emotes;
CREATE POLICY team_emotes_update_author_or_mod
ON public.team_emotes FOR UPDATE
USING (
  public.is_team_approved_member(team_id, auth.uid())
  AND (created_by = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
)
WITH CHECK (
  public.is_team_approved_member(team_id, auth.uid())
  AND (created_by = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
);

DROP POLICY IF EXISTS team_emotes_delete_author_or_mod ON public.team_emotes;
CREATE POLICY team_emotes_delete_author_or_mod
ON public.team_emotes FOR DELETE
USING (
  public.is_team_approved_member(team_id, auth.uid())
  AND (created_by = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
);

DROP POLICY IF EXISTS team_live_rooms_select ON public.team_live_rooms;
CREATE POLICY team_live_rooms_select
ON public.team_live_rooms FOR SELECT
USING (public.is_team_approved_member(team_id, auth.uid()));

DROP POLICY IF EXISTS team_live_rooms_write_mod ON public.team_live_rooms;
CREATE POLICY team_live_rooms_write_mod
ON public.team_live_rooms FOR ALL
USING (public.team_can_moderate(team_id, auth.uid()))
WITH CHECK (public.team_can_moderate(team_id, auth.uid()));

DROP POLICY IF EXISTS chat_messages_select_scoped ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_insert_scoped ON public.chat_messages;

CREATE POLICY chat_messages_select_scoped ON public.chat_messages
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    (room_id IS NOT NULL AND room_id <> '' AND live_stream_id IS NULL)
    OR (
      (live_stream_id IS NOT NULL AND live_stream_id > 0 AND room_id IS NULL)
      AND (
        public.team_id_for_live_stream(live_stream_id) IS NULL
        OR (
          public.team_id_for_live_stream(live_stream_id) IS NOT NULL
          AND public.is_team_approved_member(public.team_id_for_live_stream(live_stream_id), auth.uid())
          AND NOT public.is_team_banned(public.team_id_for_live_stream(live_stream_id), auth.uid())
          AND NOT public.is_team_muted(public.team_id_for_live_stream(live_stream_id), auth.uid(), live_stream_id)
        )
      )
    )
  )
);

CREATE POLICY chat_messages_insert_scoped ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND profile_id = auth.uid()
  AND (
    (room_id IS NOT NULL AND room_id <> '' AND live_stream_id IS NULL)
    OR (
      (live_stream_id IS NOT NULL AND live_stream_id > 0 AND room_id IS NULL)
      AND (
        public.team_id_for_live_stream(live_stream_id) IS NULL
        OR (
          public.team_id_for_live_stream(live_stream_id) IS NOT NULL
          AND public.is_team_approved_member(public.team_id_for_live_stream(live_stream_id), auth.uid())
          AND NOT public.is_team_banned(public.team_id_for_live_stream(live_stream_id), auth.uid())
          AND NOT public.is_team_muted(public.team_id_for_live_stream(live_stream_id), auth.uid(), live_stream_id)
        )
      )
    )
  )
);

CREATE OR REPLACE FUNCTION public.rpc_create_team(
  p_name text,
  p_slug text,
  p_team_tag text,
  p_description text DEFAULT NULL,
  p_rules text DEFAULT NULL,
  p_icon_url text DEFAULT NULL,
  p_banner_url text DEFAULT NULL,
  p_theme_color text DEFAULT NULL
)
RETURNS public.teams
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team public.teams;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF EXISTS (SELECT 1 FROM public.teams t WHERE t.created_by = auth.uid()) THEN
    RAISE EXCEPTION 'one_team_per_creator';
  END IF;

  INSERT INTO public.teams (
    created_by,
    name,
    slug,
    team_tag,
    description,
    rules,
    icon_url,
    banner_url,
    theme_color
  )
  VALUES (
    auth.uid(),
    p_name,
    p_slug,
    p_team_tag,
    p_description,
    p_rules,
    p_icon_url,
    p_banner_url,
    p_theme_color
  )
  RETURNING * INTO v_team;

  INSERT INTO public.team_memberships (
    team_id,
    profile_id,
    status,
    role,
    requested_at,
    approved_at,
    last_status_changed_at
  )
  VALUES (
    v_team.id,
    auth.uid(),
    'approved',
    'Team_Admin',
    now(),
    now(),
    now()
  )
  ON CONFLICT (team_id, profile_id) DO NOTHING;

  RETURN v_team;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_request_join_team(p_team_slug text)
RETURNS TABLE(team_id uuid, status public.team_membership_status, role public.team_member_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE t.slug = p_team_slug;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF public.is_team_banned(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'banned';
  END IF;

  INSERT INTO public.team_memberships (
    team_id,
    profile_id,
    status,
    role,
    requested_at,
    approved_at,
    rejected_at,
    left_at,
    banned_at,
    last_status_changed_at
  )
  VALUES (
    v_team_id,
    auth.uid(),
    'requested',
    'Team_Member',
    now(),
    NULL,
    NULL,
    NULL,
    NULL,
    now()
  )
  ON CONFLICT (team_id, profile_id) DO UPDATE
    SET status = 'requested',
        role = 'Team_Member',
        requested_at = now(),
        approved_at = NULL,
        rejected_at = NULL,
        left_at = NULL,
        banned_at = NULL,
        last_status_changed_at = now();

  RETURN QUERY
  SELECT m.team_id, m.status, m.role
  FROM public.team_memberships m
  WHERE m.team_id = v_team_id
    AND m.profile_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_approve_member(p_team_id uuid, p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT public.team_can_moderate(p_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.team_memberships
  SET
    status = 'approved',
    approved_at = now(),
    rejected_at = NULL,
    left_at = NULL,
    banned_at = NULL,
    last_status_changed_at = now()
  WHERE team_id = p_team_id
    AND profile_id = p_profile_id
    AND status = 'requested';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_requested_or_missing';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_reject_member(p_team_id uuid, p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT public.team_can_moderate(p_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.team_memberships
  SET
    status = 'rejected',
    rejected_at = now(),
    last_status_changed_at = now()
  WHERE team_id = p_team_id
    AND profile_id = p_profile_id
    AND status = 'requested';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_requested_or_missing';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_set_member_role(
  p_team_id uuid,
  p_profile_id uuid,
  p_role public.team_member_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_caller_role public.team_member_role;
  v_target_role public.team_member_role;
  v_admin_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_caller_role := public.team_role(p_team_id, auth.uid());
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_caller_role = 'Team_Moderator' THEN
    IF p_role <> 'Team_Member' THEN
      RAISE EXCEPTION 'moderator_cannot_grant_roles';
    END IF;
  END IF;

  SELECT m.role
  INTO v_target_role
  FROM public.team_memberships m
  WHERE m.team_id = p_team_id
    AND m.profile_id = p_profile_id
    AND m.status = 'approved';

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'member_not_approved_or_missing';
  END IF;

  IF v_target_role = 'Team_Admin' AND p_role <> 'Team_Admin' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.team_memberships m
    WHERE m.team_id = p_team_id
      AND m.status = 'approved'
      AND m.role = 'Team_Admin';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'cannot_remove_last_admin';
    END IF;
  END IF;

  UPDATE public.team_memberships
  SET role = p_role,
      last_status_changed_at = now()
  WHERE team_id = p_team_id
    AND profile_id = p_profile_id
    AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_approved_or_missing';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_team_home(p_team_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team public.teams;
  v_member public.team_memberships;
  v_can_moderate boolean := false;
  v_posts_7d bigint;
  v_live_now bigint;
BEGIN
  SELECT * INTO v_team
  FROM public.teams
  WHERE slug = p_team_slug;

  IF v_team.id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT * INTO v_member
    FROM public.team_memberships
    WHERE team_id = v_team.id
      AND profile_id = auth.uid();

    v_can_moderate := public.team_can_moderate(v_team.id, auth.uid());
  END IF;

  SELECT COUNT(*) INTO v_posts_7d
  FROM public.team_feed_posts
  WHERE team_id = v_team.id
    AND created_at >= now() - interval '7 days';

  SELECT COUNT(*) INTO v_live_now
  FROM public.team_live_rooms tlr
  JOIN public.live_streams ls ON ls.id = tlr.live_stream_id
  WHERE tlr.team_id = v_team.id
    AND ls.status = 'live'
    AND ls.live_available = true;

  RETURN jsonb_build_object(
    'team', jsonb_build_object(
      'id', v_team.id,
      'name', v_team.name,
      'slug', v_team.slug,
      'team_tag', v_team.team_tag,
      'description', v_team.description,
      'rules', v_team.rules,
      'icon_url', v_team.icon_url,
      'banner_url', v_team.banner_url,
      'theme_color', v_team.theme_color,
      'approved_member_count', v_team.approved_member_count,
      'pending_request_count', CASE WHEN v_can_moderate THEN v_team.pending_request_count ELSE NULL END
    ),
    'viewer_state', jsonb_build_object(
      'is_authenticated', auth.uid() IS NOT NULL,
      'membership_status', COALESCE(v_member.status::text, 'none'),
      'role', CASE WHEN v_member.status = 'approved' THEN v_member.role::text ELSE NULL END,
      'can_moderate', v_can_moderate
    ),
    'stats', jsonb_build_object(
      'posts_last_7d', COALESCE(v_posts_7d, 0),
      'live_now', COALESCE(v_live_now, 0)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_team_feed(
  p_team_slug text,
  p_limit int,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS TABLE(
  post_id uuid,
  team_id uuid,
  author_id uuid,
  author_username text,
  author_avatar_url text,
  text_content text,
  media_url text,
  is_pinned boolean,
  pinned_at timestamptz,
  comment_count int,
  reaction_count int,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
  v_l int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE t.slug = p_team_slug;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF NOT public.is_team_approved_member(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_l := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);

  RETURN QUERY
  SELECT
    p.id,
    p.team_id,
    p.author_id,
    pr.username,
    pr.avatar_url,
    p.text_content,
    p.media_url,
    p.is_pinned,
    p.pinned_at,
    p.comment_count,
    p.reaction_count,
    p.created_at
  FROM public.team_feed_posts p
  JOIN public.profiles pr ON pr.id = p.author_id
  WHERE p.team_id = v_team_id
    AND (
      p_before_created_at IS NULL
      OR (p.created_at, p.id) < (p_before_created_at, p_before_id)
    )
  ORDER BY p.is_pinned DESC, p.pinned_at DESC NULLS LAST, p.created_at DESC, p.id DESC
  LIMIT v_l;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_create_team_post(
  p_team_slug text,
  p_text_content text,
  p_media_url text DEFAULT NULL
)
RETURNS public.team_feed_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
  v_post public.team_feed_posts;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE t.slug = p_team_slug;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF public.is_team_banned(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'banned';
  END IF;

  IF NOT public.is_team_approved_member(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.team_feed_posts (team_id, author_id, text_content, media_url)
  VALUES (v_team_id, auth.uid(), p_text_content, p_media_url)
  RETURNING * INTO v_post;

  RETURN v_post;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_create_team_comment(
  p_post_id uuid,
  p_text_content text,
  p_parent_comment_id uuid DEFAULT NULL
)
RETURNS public.team_feed_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_post_team_id uuid;
  v_parent_team_id uuid;
  v_comment public.team_feed_comments;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT p.team_id INTO v_post_team_id
  FROM public.team_feed_posts p
  WHERE p.id = p_post_id;

  IF v_post_team_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  IF p_parent_comment_id IS NOT NULL THEN
    SELECT c.team_id INTO v_parent_team_id
    FROM public.team_feed_comments c
    WHERE c.id = p_parent_comment_id;

    IF v_parent_team_id IS NULL OR v_parent_team_id <> v_post_team_id THEN
      RAISE EXCEPTION 'parent_comment_team_mismatch';
    END IF;
  END IF;

  IF public.is_team_banned(v_post_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'banned';
  END IF;

  IF NOT public.is_team_approved_member(v_post_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.team_feed_comments (team_id, post_id, author_id, text_content, parent_comment_id)
  VALUES (v_post_team_id, p_post_id, auth.uid(), p_text_content, p_parent_comment_id)
  RETURNING * INTO v_comment;

  UPDATE public.team_feed_posts
  SET comment_count = comment_count + 1,
      updated_at = now()
  WHERE id = p_post_id;

  RETURN v_comment;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_react_team_post(
  p_post_id uuid,
  p_reaction_type text DEFAULT 'like'
)
RETURNS TABLE(reaction_count int, is_reacted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
  v_rowcount int := 0;
  v_inserted boolean := false;
  v_cnt int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_reaction_type IS NULL OR p_reaction_type <> 'like' THEN
    RAISE EXCEPTION 'invalid_reaction_type';
  END IF;

  SELECT p.team_id INTO v_team_id
  FROM public.team_feed_posts p
  WHERE p.id = p_post_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  IF public.is_team_banned(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'banned';
  END IF;

  IF NOT public.is_team_approved_member(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.team_feed_reactions (post_id, profile_id, reaction_type)
  VALUES (p_post_id, auth.uid(), p_reaction_type)
  ON CONFLICT (post_id, profile_id, reaction_type) DO NOTHING;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  v_inserted := (COALESCE(v_rowcount, 0) > 0);

  IF v_inserted THEN
    UPDATE public.team_feed_posts
    SET reaction_count = reaction_count + 1,
        updated_at = now()
    WHERE id = p_post_id;
  END IF;

  SELECT reaction_count INTO v_cnt
  FROM public.team_feed_posts
  WHERE id = p_post_id;

  RETURN QUERY SELECT COALESCE(v_cnt, 0), true;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_team_members(
  p_team_slug text,
  p_status text DEFAULT 'approved',
  p_role text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS TABLE(
  profile_id uuid,
  username text,
  avatar_url text,
  status public.team_membership_status,
  role public.team_member_role,
  requested_at timestamptz,
  approved_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
  v_can_moderate boolean := false;
  v_limit int;
  v_status public.team_membership_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE t.slug = p_team_slug;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  v_can_moderate := public.team_can_moderate(v_team_id, auth.uid());

  IF NOT v_can_moderate THEN
    v_status := 'approved';
  ELSE
    BEGIN
      v_status := p_status::public.team_membership_status;
    EXCEPTION WHEN others THEN
      v_status := 'approved';
    END;
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 50);

  RETURN QUERY
  SELECT
    m.profile_id,
    pr.username,
    pr.avatar_url,
    m.status,
    m.role,
    m.requested_at,
    m.approved_at
  FROM public.team_memberships m
  JOIN public.profiles pr ON pr.id = m.profile_id
  WHERE m.team_id = v_team_id
    AND m.status = v_status
    AND (p_role IS NULL OR m.role::text = p_role)
    AND (p_search IS NULL OR pr.username ILIKE ('%' || p_search || '%'))
  ORDER BY pr.username ASC
  LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_team_live_rooms(p_team_slug text)
RETURNS TABLE(
  live_stream_id int,
  host_profile_id uuid,
  host_username text,
  host_avatar_url text,
  started_at timestamptz,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE t.slug = p_team_slug;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF NOT public.is_team_approved_member(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    ls.id::int,
    ls.profile_id,
    pr.username,
    pr.avatar_url,
    ls.started_at,
    ls.status
  FROM public.team_live_rooms tlr
  JOIN public.live_streams ls ON ls.id = tlr.live_stream_id
  JOIN public.profiles pr ON pr.id = ls.profile_id
  WHERE tlr.team_id = v_team_id
  ORDER BY ls.started_at DESC;
END;
$$;

 CREATE OR REPLACE VIEW public.v_team_roster AS
 SELECT
   t.id AS team_id,
   t.slug AS team_slug,
   t.team_tag,
   t.name AS team_name,
   m.profile_id,
   p.username,
   p.avatar_url,
   m.status,
   m.role,
   m.requested_at,
   m.approved_at,
   m.rejected_at,
   m.left_at,
   m.banned_at,
   m.last_status_changed_at
 FROM public.team_memberships m
 JOIN public.teams t ON t.id = m.team_id
 JOIN public.profiles p ON p.id = m.profile_id;

 REVOKE ALL ON public.v_team_roster FROM PUBLIC;
 GRANT SELECT ON public.v_team_roster TO anon, authenticated;

REVOKE ALL ON FUNCTION public.recompute_team_member_counts(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_team_memberships_recount() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_team_thread_comment_bump() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_team_approved_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.team_role(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.team_can_moderate(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.team_id_for_live_stream(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_team_muted(uuid, uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_team_banned(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_create_team(text, text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_request_join_team(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_approve_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_reject_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_set_member_role(uuid, uuid, public.team_member_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_team_home(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_team_feed(text, int, timestamptz, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_create_team_post(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_create_team_comment(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_react_team_post(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_team_members(text, text, text, text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_team_live_rooms(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.recompute_team_member_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trg_team_memberships_recount() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trg_team_thread_comment_bump() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_approved_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_can_moderate(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_id_for_live_stream(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_muted(uuid, uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_banned(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_team(text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_request_join_team(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_approve_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_reject_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_set_member_role(uuid, uuid, public.team_member_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_team_home(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_team_feed(text, int, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_team_post(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_team_comment(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_react_team_post(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_team_members(text, text, text, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_team_live_rooms(text) TO authenticated;

GRANT SELECT ON TABLE public.teams TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_bans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_mutes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_feed_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_feed_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_feed_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_thread_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_emotes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_live_rooms TO authenticated;

COMMIT;
