import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Get a single campaign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Get campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

/**
 * Update a campaign
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, content, visual_url, custom_visual_url, channel, status, target_audience, scheduled_at } = body;

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update({
        title,
        content,
        visual_url,
        custom_visual_url,
        channel,
        status,
        target_audience,
        scheduled_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Update campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

/**
 * Delete a campaign
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}

