import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/get-user';

/**
 * Manual WhatsApp connection setup
 * Users provide their WhatsApp Business API credentials
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { phoneNumberId, accessToken, businessName } = await request.json();

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'Phone Number ID and Access Token are required' },
        { status: 400 }
      );
    }

    // Check if connection already exists
    const { data: existing } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'whatsapp')
      .single();

    if (existing) {
      // Update existing connection
      const { error } = await supabaseAdmin
        .from('social_connections')
        .update({
          access_token: accessToken,
          platform_user_id: phoneNumberId,
          platform_username: businessName || `WhatsApp Business (${userId})`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Create new connection
      const { error } = await supabaseAdmin
        .from('social_connections')
        .insert({
          user_id: userId,
          platform: 'whatsapp',
          access_token: accessToken,
          platform_user_id: phoneNumberId,
          platform_username: businessName || `WhatsApp Business (${userId})`,
        });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('WhatsApp connect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect WhatsApp' },
      { status: 500 }
    );
  }
}





