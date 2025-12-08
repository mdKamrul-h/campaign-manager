import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Cron job endpoint to check and execute scheduled campaigns
 * This should be called periodically (e.g., every minute) by a cron service
 * 
 * For Vercel: Add this to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/execute-scheduled-campaigns",
 *     "schedule": "* * * * *"
 *   }]
 * }
 * 
 * For other platforms: Set up a cron job to call this endpoint every minute
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // If CRON_SECRET is set, require authentication
      // Otherwise, allow access (for development)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date().toISOString();

    // Get all campaigns that are scheduled and past their scheduled time
    const { data: campaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching scheduled campaigns:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch scheduled campaigns' },
        { status: 500 }
      );
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No scheduled campaigns ready to send',
        executed: 0,
      });
    }

    // Execute each campaign
    const results = [];
    for (const campaign of campaigns) {
      try {
        const executeResponse = await fetch(
          `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/campaigns/execute`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId: campaign.id }),
          }
        );

        const executeResult = await executeResponse.json();
        
        results.push({
          campaignId: campaign.id,
          title: campaign.title,
          success: executeResponse.ok && executeResult.success,
          message: executeResult.message || executeResult.error,
        });
      } catch (error: any) {
        console.error(`Error executing campaign ${campaign.id}:`, error);
        results.push({
          campaignId: campaign.id,
          title: campaign.title,
          success: false,
          message: error.message || 'Failed to execute campaign',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Executed ${successCount} campaign(s), ${failCount} failed`,
      executed: successCount,
      failed: failCount,
      results,
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute cron job' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
