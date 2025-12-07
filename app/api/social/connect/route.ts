import { NextRequest, NextResponse } from 'next/server';

/**
 * Initiate OAuth connection for social media platforms
 * This returns the OAuth URL for the user to authorize
 */
export async function POST(request: NextRequest) {
  try {
    const { platform } = await request.json();

    if (!platform || !['facebook', 'linkedin', 'whatsapp'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Supported: facebook, linkedin, whatsapp' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/social/callback/${platform}`;

    let authUrl = '';

    switch (platform) {
      case 'facebook':
        const fbAppId = process.env.FACEBOOK_APP_ID;
        if (!fbAppId) {
          return NextResponse.json(
            { error: 'Facebook App ID not configured. Set FACEBOOK_APP_ID in .env.local' },
            { status: 500 }
          );
        }
        // Facebook OAuth URL with permissions for messaging and friends
        // Scope includes: user_friends (friends list), pages_messaging (send messages), pages_manage_posts (posting)
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,user_friends,read_insights,pages_messaging,user_posts&response_type=code`;
        break;

      case 'linkedin':
        const linkedinClientId = process.env.LINKEDIN_CLIENT_ID;
        if (!linkedinClientId) {
          return NextResponse.json(
            { error: 'LinkedIn Client ID not configured. Set LINKEDIN_CLIENT_ID in .env.local' },
            { status: 500 }
          );
        }
        // LinkedIn OAuth URL with messaging permissions
        authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedinClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid profile email w_member_social r_liteprofile r_emailaddress w_messages`;
        break;

      case 'whatsapp':
        // WhatsApp Business API uses different authentication
        // For now, return instructions for manual setup
        return NextResponse.json({
          success: true,
          platform: 'whatsapp',
          message: 'WhatsApp requires manual setup. Please configure WhatsApp Business API credentials in .env.local',
          requiresManualSetup: true,
          instructions: [
            '1. Go to https://business.facebook.com/',
            '2. Create a WhatsApp Business Account',
            '3. Get your Phone Number ID and Access Token',
            '4. Add them to .env.local as WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN'
          ]
        });

      default:
        return NextResponse.json(
          { error: 'Unsupported platform' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      platform,
      authUrl,
      redirectUri
    });
  } catch (error: any) {
    console.error('Social connect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate connection' },
      { status: 500 }
    );
  }
}





