import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get pending reminders
    const { data: reminders, error: fetchError } = await supabaseAdmin.rpc(
      'get_pending_event_reminders'
    );

    if (fetchError) {
      console.error('Error fetching reminders:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No pending reminders' });
    }

    let processed = 0;
    const errors: string[] = [];

    for (const reminder of reminders) {
      try {
        // Create notification for the user
        // Using existing notifications table schema: recipient_id, actor_id, type, entity_type, entity_id, message
        const { error: notifError } = await supabaseAdmin
          .from('notifications')
          .insert({
            recipient_id: reminder.user_id,
            actor_id: reminder.profile_id,
            type: 'event_reminder',
            entity_type: 'event',
            entity_id: reminder.event_id,
            message: `${reminder.event_title || 'An event'} by @${reminder.profile_username} is happening today!${reminder.event_location ? ` at ${reminder.event_location}` : ''}`,
            read: false,
          });

        if (notifError) {
          console.error(`Error creating notification for reminder ${reminder.reminder_id}:`, notifError);
          errors.push(`Notification error for ${reminder.reminder_id}: ${notifError.message}`);
          continue;
        }

        // Mark reminder as notified
        const { error: markError } = await supabaseAdmin.rpc(
          'mark_reminder_notified',
          { p_reminder_id: reminder.reminder_id }
        );

        if (markError) {
          console.error(`Error marking reminder ${reminder.reminder_id} as notified:`, markError);
          errors.push(`Mark error for ${reminder.reminder_id}: ${markError.message}`);
          continue;
        }

        processed++;
      } catch (err: any) {
        console.error(`Error processing reminder ${reminder.reminder_id}:`, err);
        errors.push(`Processing error for ${reminder.reminder_id}: ${err.message}`);
      }
    }

    return NextResponse.json({
      processed,
      total: reminders.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
