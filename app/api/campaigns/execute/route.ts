import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Execute a scheduled campaign (auto-send)
 * This endpoint is called by a cron job or scheduler to send scheduled campaigns
 */
export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Get campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('status', 'scheduled')
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or not scheduled' },
        { status: 404 }
      );
    }

    // Check if it's time to send
    const now = new Date();
    const scheduledAt = new Date(campaign.scheduled_at!);

    if (scheduledAt > now) {
      return NextResponse.json(
        { error: 'Campaign is scheduled for a future time', scheduledAt: campaign.scheduled_at },
        { status: 400 }
      );
    }

    // Parse target audience
    const targetAudience = campaign.target_audience as any;
    const targetType = targetAudience?.type || 'all';
    const targetValue = targetAudience?.value || '';
    const selectedMemberIds = targetAudience?.selectedMemberIds;

    // Get target members
    let query = supabaseAdmin.from('members').select('*');

    if (targetType === 'select-members' && selectedMemberIds && Array.isArray(selectedMemberIds) && selectedMemberIds.length > 0) {
      // Use specific member IDs for select-members option
      query = query.in('id', selectedMemberIds);
    } else if (targetType === 'batch' && targetValue) {
      if (selectedMemberIds && Array.isArray(selectedMemberIds) && selectedMemberIds.length > 0) {
        query = query.in('id', selectedMemberIds);
      } else {
        query = query.eq('batch', targetValue);
      }
    } else if (targetType === 'membership' && targetValue) {
      // Use pattern matching for membership types (GM-*, DM-*, FM-*, LM-*)
      query = query.like('membership_type', `${targetValue}-%`);
    }

    const { data: members, error: membersError } = await query;

    if (membersError) throw membersError;

    if (!members || members.length === 0) {
      return NextResponse.json(
        { error: 'No members found matching the criteria' },
        { status: 400 }
      );
    }

    // Determine what to send
    const sendText = !!campaign.content;
    const sendVisual = !!(campaign.visual_url || campaign.custom_visual_url);
    const visualUrl = campaign.custom_visual_url || campaign.visual_url;

    // Send campaign using the existing send logic
    const sendResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send/campaign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: campaign.title,
        content: campaign.content,
        visual_url: visualUrl,
        channel: campaign.channel,
        targetType,
        targetValue,
        selectedMemberIds,
        sendText,
        sendVisual,
      }),
    });

    const sendResult = await sendResponse.json();

    if (sendResponse.ok && sendResult.success) {
      // Update campaign status to sent
      await supabaseAdmin
        .from('campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      return NextResponse.json({
        success: true,
        campaignId,
        sent: sendResult.sent,
        total: sendResult.total,
        message: `Campaign sent successfully to ${sendResult.sent} members`,
      });
    } else {
      return NextResponse.json(
        { error: sendResult.error || 'Failed to send campaign', details: sendResult },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Execute campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute campaign' },
      { status: 500 }
    );
  }
}

/**
 * Get campaigns ready to be sent (scheduled and past due)
 */
export async function GET() {
  try {
    const now = new Date().toISOString();

    const { data: campaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(campaigns || []);
  } catch (error: any) {
    console.error('Get ready campaigns error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ready campaigns' },
      { status: 500 }
    );
  }
}



