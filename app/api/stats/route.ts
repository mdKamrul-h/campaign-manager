import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Get total members
    const { count: totalMembers } = await supabaseAdmin
      .from('contacts')
      .select('*', { count: 'exact', head: true });

    // Get total campaigns
    const { count: totalCampaigns } = await supabaseAdmin
      .from('campaigns')
      .select('*', { count: 'exact', head: true });

    // Get sent campaigns
    const { count: sentCampaigns } = await supabaseAdmin
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent');

    // Get total documents
    const { count: totalDocuments } = await supabaseAdmin
      .from('documents')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      totalMembers: totalMembers || 0,
      totalCampaigns: totalCampaigns || 0,
      sentCampaigns: sentCampaigns || 0,
      totalDocuments: totalDocuments || 0,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      {
        totalMembers: 0,
        totalCampaigns: 0,
        sentCampaigns: 0,
        totalDocuments: 0,
      },
      { status: 200 }
    );
  }
}
