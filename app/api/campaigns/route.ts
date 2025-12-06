import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Get all campaigns
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Get campaigns error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

/**
 * Create a new campaign (draft)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, visual_url, custom_visual_url, channel, status, target_audience, scheduled_at } = body;

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .insert([{
        title,
        content,
        visual_url,
        custom_visual_url,
        channel,
        status: status || 'draft',
        target_audience: target_audience || null,
        scheduled_at: scheduled_at || null,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Create campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
