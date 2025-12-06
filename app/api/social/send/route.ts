import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/get-user';
import axios from 'axios';

/**
 * Send message to specific social media contacts
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

    const {
      platform,
      connectionId,
      contactIds,
      message,
      imageUrl,
      generateContent,
      contentPrompt,
    } = await request.json();

    if (!platform || !connectionId || !contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: 'Platform, connection ID, and contact IDs are required' },
        { status: 400 }
      );
    }

    // Get connection (verify it belongs to current user)
    const { data: connection, error: connError } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', platform)
      .eq('user_id', userId)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found or expired' },
        { status: 404 }
      );
    }

    // Generate content if requested
    let finalMessage = message;
    if (generateContent && contentPrompt) {
      try {
        const contentResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/generate/content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: contentPrompt,
            channel: platform,
            useDocuments: false,
          }),
        });

        const contentData = await contentResponse.json();
        if (contentData.content) {
          finalMessage = contentData.content;
        }
      } catch (error) {
        console.error('Failed to generate content:', error);
        // Continue with original message if generation fails
      }
    }

    if (!finalMessage || !finalMessage.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Get contact details (verify they belong to user's connection)
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('social_contacts')
      .select(`
        *,
        social_connections!inner(user_id)
      `)
      .in('id', contactIds)
      .eq('platform', platform)
      .eq('social_connections.user_id', userId)
      .eq('social_connections.id', connectionId);

    if (contactsError || !contacts || contacts.length === 0) {
      return NextResponse.json(
        { error: 'Contacts not found or unauthorized' },
        { status: 404 }
      );
    }

    // Send messages to each contact
    const results = [];
    for (const contact of contacts) {
      try {
        let result;
        switch (platform) {
          case 'facebook':
            // Send Facebook message (requires Messenger API setup)
            result = await sendFacebookMessage(connection.access_token, contact.contact_id, finalMessage, imageUrl);
            break;
          case 'linkedin':
            // Send LinkedIn message (requires LinkedIn Messaging API)
            result = await sendLinkedInMessage(connection.access_token, contact.contact_id, finalMessage, imageUrl);
            break;
          case 'whatsapp':
            // Send WhatsApp message using connection's credentials
            result = await sendWhatsAppMessage(
              contact.phone || contact.contact_id,
              finalMessage,
              connection.access_token,
              connection.platform_user_id, // This is the phone number ID for WhatsApp
              imageUrl
            );
            break;
          default:
            throw new Error('Unsupported platform for direct messaging');
        }

        results.push({
          contactId: contact.id,
          contactName: contact.name,
          success: true,
          result,
        });
      } catch (error: any) {
        results.push({
          contactId: contact.id,
          contactName: contact.name,
          success: false,
          error: error.message || 'Failed to send message',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      total: contacts.length,
      sent: successCount,
      failed: contacts.length - successCount,
      results,
    });
  } catch (error: any) {
    console.error('Send social message error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send messages' },
      { status: 500 }
    );
  }
}

/**
 * Send Facebook message (requires Messenger API)
 * Note: This requires the recipient to have started a conversation with your page
 * or you need to use a valid message tag for first-time messaging
 */
async function sendFacebookMessage(
  accessToken: string,
  recipientId: string,
  message: string,
  imageUrl?: string
): Promise<any> {
  try {
    // Try to send via Messenger API
    // First, get the page access token (if using page)
    const url = `https://graph.facebook.com/v18.0/me/messages`;

    const payload: any = {
      recipient: { id: recipientId },
      message: {
        text: message,
      },
      messaging_type: 'MESSAGE_TAG',
      tag: 'NON_PROMOTIONAL_SUBSCRIPTION', // For non-promotional messages
    };

    if (imageUrl) {
      payload.message.attachment = {
        type: 'image',
        payload: {
          url: imageUrl,
          is_reusable: true,
        },
      };
    }

    const response = await axios.post(url, payload, {
      params: { access_token: accessToken },
    });

    return response.data;
  } catch (error: any) {
    // If Messenger API fails, try posting to user's timeline (fallback)
    if (error.response?.data?.error?.code === 10 || error.response?.data?.error?.code === 200) {
      // Permission denied or recipient not available
      throw new Error('Cannot send message. Recipient may not have started a conversation with your page, or you need additional permissions.');
    }
    throw error;
  }
}

/**
 * Send LinkedIn message
 */
async function sendLinkedInMessage(
  accessToken: string,
  recipientId: string,
  message: string,
  imageUrl?: string
): Promise<any> {
  // LinkedIn messaging requires specific API setup
  // This is a placeholder - adjust based on LinkedIn Messaging API
  const url = 'https://api.linkedin.com/v2/messaging/conversations';

  // Note: LinkedIn messaging API has specific requirements
  // You may need to create conversations first
  throw new Error('LinkedIn direct messaging requires additional API setup');
}

/**
 * Send WhatsApp message
 * Uses the connection's access token and phone number ID (user-specific)
 */
async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  accessToken: string,
  phoneNumberId: string,
  imageUrl?: string
): Promise<any> {
  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials not configured for this connection');
  }

  // Format phone number (remove + and ensure proper format)
  const formattedPhone = phoneNumber.replace(/[^\d]/g, '');

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const payload: any = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'text',
    text: {
      body: message,
    },
  };

  if (imageUrl) {
    payload.type = 'image';
    payload.image = {
      link: imageUrl,
    };
  }

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}



