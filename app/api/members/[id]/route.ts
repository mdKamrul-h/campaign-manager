import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, email, mobile, membership_type, batch, image_url } = body;

    if (!name || !email || !mobile || !membership_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('members')
      .update({
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        membership_type,
        batch: batch?.trim() || null,
        image_url: image_url || null
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Update member error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update member' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin
      .from('members')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete member error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete member' },
      { status: 500 }
    );
  }
}
