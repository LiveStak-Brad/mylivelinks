import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/* =============================================================================
   COMPOSER PROJECT ACCESS RESOLVER
   
   Route: GET /api/composer/project/{id}
   
   Purpose: Validate access to composer project before deep linking from mobile
   
   Returns:
   - 200: Project metadata + has_access flag
   - 403: User doesn't have access
   - 404: Project not found
   - 401: Not authenticated
   
   Auth: Requires valid Supabase JWT token
============================================================================= */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const projectId = params.id;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // TODO: When composer_projects table exists, query it here
    // For now, return placeholder structure
    
    // Example future query:
    // const { data: project, error } = await supabase
    //   .from('composer_projects')
    //   .select('id, title, owner_profile_id, actor_ids')
    //   .eq('id', projectId)
    //   .single();
    //
    // if (error || !project) {
    //   return NextResponse.json(
    //     { error: 'Project not found' },
    //     { status: 404 }
    //   );
    // }
    //
    // // Check access: user is owner OR listed as actor
    // const { data: profile } = await supabase
    //   .from('profiles')
    //   .select('id')
    //   .eq('id', user.id)
    //   .single();
    //
    // const hasAccess = 
    //   project.owner_profile_id === profile?.id ||
    //   (project.actor_ids && project.actor_ids.includes(profile?.id));
    //
    // if (!hasAccess) {
    //   return NextResponse.json(
    //     {
    //       project_id: projectId,
    //       has_access: false,
    //       error: "You don't have permission to access this project"
    //     },
    //     { status: 403 }
    //   );
    // }

    // Placeholder response until backend is wired
    // Mobile can still use direct deep links: /composer/project/{id}
    return NextResponse.json({
      project_id: projectId,
      title: 'Project Title (Backend Not Implemented)',
      owner_profile_id: user.id,
      has_access: true,
      redirect_url: `/composer/project/${projectId}`,
      note: 'This is a placeholder. Composer backend not yet implemented.'
    });

  } catch (error) {
    console.error('Composer project resolver error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

