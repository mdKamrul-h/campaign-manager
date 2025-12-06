import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { platform, message, imageUrl } = await request.json();

    // Get social connection for platform
    const { data: connection, error } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('platform', platform)
      .single();

    if (error || !connection) {
      return NextResponse.json(
        { error: `${platform} not connected. Please connect your account first.` },
        { status: 400 }
      );
    }

    let result;

    switch (platform) {
      case 'facebook':
        result = await postToFacebook(connection.access_token, connection.platform_user_id, message, imageUrl);
        break;
      case 'instagram':
        result = await postToInstagram(connection.access_token, connection.platform_user_id, message, imageUrl);
        break;
      case 'linkedin':
        result = await postToLinkedIn(connection.access_token, connection.platform_user_id, message, imageUrl);
        break;
      case 'whatsapp':
        result = await sendToWhatsApp(message, imageUrl);
        break;
      default:
        throw new Error('Unsupported platform');
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Social post error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to post to social media' },
      { status: 500 }
    );
  }
}

async function postToFacebook(accessToken: string, pageId: string, message: string, imageUrl?: string) {
  const url = `https://graph.facebook.com/v18.0/${pageId}/feed`;

  const payload: any = {
    message,
    access_token: accessToken,
  };

  if (imageUrl) {
    payload.link = imageUrl;
  }

  const response = await axios.post(url, payload);
  return response.data;
}

async function postToInstagram(accessToken: string, accountId: string, message: string, imageUrl?: string) {
  if (!imageUrl) {
    throw new Error('Instagram posts require an image');
  }

  // Create media container
  const containerUrl = `https://graph.facebook.com/v18.0/${accountId}/media`;
  const containerResponse = await axios.post(containerUrl, {
    image_url: imageUrl,
    caption: message,
    access_token: accessToken,
  });

  // Publish media
  const publishUrl = `https://graph.facebook.com/v18.0/${accountId}/media_publish`;
  const publishResponse = await axios.post(publishUrl, {
    creation_id: containerResponse.data.id,
    access_token: accessToken,
  });

  return publishResponse.data;
}

async function postToLinkedIn(accessToken: string, userId: string, message: string, imageUrl?: string) {
  const url = 'https://api.linkedin.com/v2/ugcPosts';

  const payload: any = {
    author: `urn:li:person:${userId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: message,
        },
        shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  if (imageUrl) {
    payload.specificContent['com.linkedin.ugc.ShareContent'].media = [
      {
        status: 'READY',
        media: imageUrl,
      },
    ];
  }

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function sendToWhatsApp(message: string, imageUrl?: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials not configured');
  }

  // Note: This requires WhatsApp Business API setup
  // You'll need to implement recipient logic based on your requirements
  throw new Error('WhatsApp integration requires additional setup');
}
