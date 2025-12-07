import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/get-user';

/**
 * Get all social media connections for current user
 */
export async function GET() {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .order('connected_at', { ascending: false });

    if (error) throw error;

    // Don't expose access tokens in response
    const safeData = (data || []).map((conn: any) => ({
      id: conn.id,
      platform: conn.platform,
      platform_user_id: conn.platform_user_id,
      platform_username: conn.platform_username,
      connected_at: conn.connected_at,
      expires_at: conn.expires_at,
      is_expired: conn.expires_at ? new Date(conn.expires_at) < new Date() : false,
    }));

    return NextResponse.json(safeData);
  } catch (error: any) {
    console.error('Get connections error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

/**
 * Delete a social media connection
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Verify the connection belongs to the current user
    const { data: connection, error: checkError } = await supabaseAdmin
      .from('social_connections')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    if (connection.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('social_connections')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete connection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete connection' },
      { status: 500 }
    );
  }
}





