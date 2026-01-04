import { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createRouteHandlerClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/admin';

const DEFAULT_OWNER_IDS = ['2b4a1178-3c39-4179-94ea-314dd824a818'];

function parseOwnerIdsEnv(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function getOwnerProfileIds(): string[] {
  const explicitIds = parseOwnerIdsEnv(process.env.OWNER_PROFILE_IDS);
  const singleId = process.env.OWNER_PROFILE_ID ? [process.env.OWNER_PROFILE_ID] : [];
  const combined = [...explicitIds, ...singleId, ...DEFAULT_OWNER_IDS];
  return Array.from(new Set(combined.filter(Boolean)));
}

export function isOwnerProfile(profileId?: string | null): boolean {
  if (!profileId) return false;
  return getOwnerProfileIds().includes(profileId);
}

export function assertOwnerProfile(profileId?: string | null) {
  if (!isOwnerProfile(profileId)) {
    throw new Error('FORBIDDEN');
  }
}

export type ViewerContext = {
  user: User;
  is_owner: boolean;
  is_app_admin: boolean;
  room_roles: Array<{ room_id: string; role: 'room_admin' | 'room_moderator' }>;
};

export async function requireUser(request?: NextRequest): Promise<User> {
  const user = await getSessionUser(request);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function getViewerContext(request?: NextRequest): Promise<ViewerContext> {
  const user = await requireUser(request);

  const supabase = request ? createRouteHandlerClient(request) : createServerSupabaseClient();

  const [{ data: isOwner }, { data: isAppAdmin }, { data: roomRoles }] = await Promise.all([
    supabase.rpc('is_owner', { p_profile_id: user.id }),
    supabase.rpc('is_app_admin', { p_profile_id: user.id }),
    supabase
      .from('room_roles')
      .select('room_id, role')
      .eq('profile_id', user.id),
  ]);

  return {
    user,
    is_owner: isOwner === true,
    is_app_admin: isAppAdmin === true,
    room_roles: ((roomRoles ?? []) as unknown as ViewerContext['room_roles']),
  };
}

export async function requireOwner(request?: NextRequest): Promise<User> {
  const user = await requireUser(request);
  const supabase = request ? createRouteHandlerClient(request) : createServerSupabaseClient();
  const { data: isOwner, error } = await supabase.rpc('is_owner', { p_profile_id: user.id });
  if (error || isOwner !== true) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function requireAppAdmin(request?: NextRequest): Promise<User> {
  const user = await requireUser(request);
  const supabase = request ? createRouteHandlerClient(request) : createServerSupabaseClient();
  const { data: ok, error } = await supabase.rpc('is_app_admin', { p_profile_id: user.id });
  if (error || ok !== true) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function requireCanManageRoomRoles(params: {
  request: NextRequest;
  roomId: string;
}): Promise<User> {
  const user = await requireUser(params.request);
  const supabase = createRouteHandlerClient(params.request);
  const { data: ok, error } = await supabase.rpc('can_manage_room_roles', {
    p_profile_id: user.id,
    p_room_id: params.roomId,
  });
  if (error || ok !== true) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function requireCanAssignRoomModerator(params: {
  request: NextRequest;
  roomId: string;
}): Promise<User> {
  const user = await requireUser(params.request);
  const supabase = createRouteHandlerClient(params.request);
  const { data: ok, error } = await supabase.rpc('can_assign_room_moderator', {
    p_grantor: user.id,
    p_room_id: params.roomId,
  });
  if (error || ok !== true) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function getRoomPermissions(params: {
  request: NextRequest;
  roomId: string;
}): Promise<{ canModerate: boolean; canManageRoles: boolean; canManageRoom: boolean }> {
  const user = await requireUser(params.request);
  const supabase = createRouteHandlerClient(params.request);

  const [{ data: isAppAdmin }, { data: isRoomAdmin }, { data: isRoomModerator }] = await Promise.all([
    supabase.rpc('is_app_admin', { p_profile_id: user.id }),
    supabase.rpc('is_room_admin', { p_profile_id: user.id, p_room_id: params.roomId }),
    supabase.rpc('is_room_moderator', { p_profile_id: user.id, p_room_id: params.roomId }),
  ]);

  const isAdmin = isAppAdmin === true;
  const canModerate = isAdmin || isRoomModerator === true;
  const canManageRoles = isAdmin || isRoomAdmin === true;
  const canManageRoom = isAdmin || isRoomAdmin === true;

  return { canModerate, canManageRoles, canManageRoom };
}
