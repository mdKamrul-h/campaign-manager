import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Get total members
    const { count: totalMembers, error: membersError } = await supabaseAdmin
      .from('members')
      .select('*', { count: 'exact', head: true });

    if (membersError) {
      console.error('Error fetching members count:', membersError);
    }

    // Get total campaigns
    const { count: totalCampaigns, error: campaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('*', { count: 'exact', head: true });

    if (campaignsError) {
      console.error('Error fetching campaigns count:', campaignsError);
    }

    // Get sent campaigns
    const { count: sentCampaigns, error: sentError } = await supabaseAdmin
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent');

    if (sentError) {
      console.error('Error fetching sent campaigns count:', sentError);
    }

    // Get scheduled campaigns
    const { count: scheduledCampaigns, error: scheduledError } = await supabaseAdmin
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled');

    if (scheduledError) {
      console.error('Error fetching scheduled campaigns count:', scheduledError);
    }

    // Get draft campaigns
    const { count: draftCampaigns, error: draftError } = await supabaseAdmin
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft');

    if (draftError) {
      console.error('Error fetching draft campaigns count:', draftError);
    }

    // Get total documents
    const { count: totalDocuments, error: documentsError } = await supabaseAdmin
      .from('documents')
      .select('*', { count: 'exact', head: true });

    if (documentsError) {
      console.error('Error fetching documents count:', documentsError);
    }

    // Get total campaign logs (messages sent)
    const { count: totalMessagesSent, error: logsError } = await supabaseAdmin
      .from('campaign_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'success');

    if (logsError) {
      console.error('Error fetching campaign logs count:', logsError);
    }

    // Get failed messages
    const { count: failedMessages, error: failedError } = await supabaseAdmin
      .from('campaign_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    if (failedError) {
      console.error('Error fetching failed messages count:', failedError);
    }

    return NextResponse.json({
      totalMembers: totalMembers || 0,
      totalCampaigns: totalCampaigns || 0,
      sentCampaigns: sentCampaigns || 0,
      scheduledCampaigns: scheduledCampaigns || 0,
      draftCampaigns: draftCampaigns || 0,
      totalDocuments: totalDocuments || 0,
      totalMessagesSent: totalMessagesSent || 0,
      failedMessages: failedMessages || 0,
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      {
        totalMembers: 0,
        totalCampaigns: 0,
        sentCampaigns: 0,
        scheduledCampaigns: 0,
        draftCampaigns: 0,
        totalDocuments: 0,
        totalMessagesSent: 0,
        failedMessages: 0,
        error: error.message,
      },
      { status: 200 }
    );
  }
}
