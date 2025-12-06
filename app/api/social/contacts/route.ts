import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/get-user';
import axios from 'axios';

/**
 * Fetch and sync contacts from a social media platform
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

    const { platform, connectionId } = await request.json();

    if (!platform || !connectionId) {
      return NextResponse.json(
        { error: 'Platform and connection ID are required' },
        { status: 400 }
      );
    }

    // Get connection details (verify it belongs to current user)
    const { data: connection, error: connError } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', platform)
      .eq('user_id', userId)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found or unauthorized' },
        { status: 404 }
      );
    }

    let contacts: any[] = [];

    // Fetch contacts based on platform
    switch (platform) {
      case 'facebook':
        contacts = await fetchFacebookFriends(connection.access_token, connection.platform_user_id);
        break;
      case 'linkedin':
        contacts = await fetchLinkedInConnections(connection.access_token);
        break;
      case 'whatsapp':
        // WhatsApp contacts are managed differently
        return NextResponse.json(
          { error: 'WhatsApp contacts must be added manually or via phone numbers' },
          { status: 400 }
        );
      default:
        return NextResponse.json(
          { error: 'Unsupported platform' },
          { status: 400 }
        );
    }

    // Store contacts in database
    const contactsToInsert = contacts.map((contact) => ({
      connection_id: connectionId,
      platform,
      contact_id: contact.id,
      name: contact.name,
      profile_picture_url: contact.picture || contact.profile_picture,
      email: contact.email,
      phone: contact.phone,
      metadata: contact.metadata || {},
    }));

    // Upsert contacts (update if exists, insert if new)
    if (contactsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('social_contacts')
        .upsert(contactsToInsert, {
          onConflict: 'connection_id,contact_id',
        });

      if (insertError) {
        console.error('Error inserting contacts:', insertError);
        // Continue even if some contacts fail
      }
    }

    return NextResponse.json({
      success: true,
      synced: contacts.length,
      contacts: contactsToInsert,
    });
  } catch (error: any) {
    console.error('Sync contacts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync contacts' },
      { status: 500 }
    );
  }
}

/**
 * Get contacts for a connection
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connection_id');
    const platform = searchParams.get('platform');

    // First, get all connection IDs for this user
    const { data: userConnections, error: connError } = await supabaseAdmin
      .from('social_connections')
      .select('id')
      .eq('user_id', userId);

    if (connError) throw connError;

    const connectionIds = (userConnections || []).map(c => c.id);

    if (connectionIds.length === 0) {
      return NextResponse.json([]);
    }

    // Build query for contacts
    let query = supabaseAdmin
      .from('social_contacts')
      .select('*')
      .in('connection_id', connectionIds);

    if (connectionId) {
      // Verify connection belongs to user
      if (!connectionIds.includes(connectionId)) {
        return NextResponse.json(
          { error: 'Connection not found or unauthorized' },
          { status: 404 }
        );
      }
      query = query.eq('connection_id', connectionId);
    }

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Get contacts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

/**
 * Fetch Facebook friends
 * Note: Facebook API v18+ requires 'user_friends' permission and app review
 * For production, you need to submit your app for review to get friends list access
 */
async function fetchFacebookFriends(accessToken: string, userId: string): Promise<any[]> {
  try {
    // Try to get friends list
    // Note: This requires 'user_friends' permission which needs app review
    const response = await axios.get(`https://graph.facebook.com/v18.0/${userId}/friends`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,picture',
      },
    });

    return (response.data.data || []).map((friend: any) => ({
      id: friend.id,
      name: friend.name,
      picture: friend.picture?.data?.url,
      metadata: friend,
    }));
  } catch (error: any) {
    console.error('Error fetching Facebook friends:', error.response?.data || error.message);
    
    // If friends permission is not available, try to get tagged friends or mutual friends
    // This is a fallback - the user needs to grant 'user_friends' permission
    if (error.response?.data?.error?.code === 200 || error.response?.data?.error?.code === 10) {
      console.warn('Friends list not accessible. User may need to grant user_friends permission.');
      // Return empty array - user needs to grant permission
    }
    
    return [];
  }
}

/**
 * Fetch LinkedIn connections
 */
async function fetchLinkedInConnections(accessToken: string): Promise<any[]> {
  try {
    // LinkedIn connections API
    const response = await axios.get('https://api.linkedin.com/v2/networkSizes/edge=1', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Note: LinkedIn API has limited access to connections list
    // You may need to use a different endpoint or approach
    // This is a placeholder - adjust based on your LinkedIn API access level
    return [];
  } catch (error: any) {
    console.error('Error fetching LinkedIn connections:', error.response?.data || error.message);
    return [];
  }
}

