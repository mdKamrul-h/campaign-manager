import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Get all templates
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaign_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Get templates error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * Create a new template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, title, content, channel, visual_url } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('campaign_templates')
      .insert([{
        name,
        title: title || '',
        content,
        channel: channel || 'email',
        visual_url: visual_url || null,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Create template error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    );
  }
}







