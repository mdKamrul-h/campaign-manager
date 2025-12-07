import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/get-user';
import axios from 'axios';

/**
 * OAuth callback handler for social media platforms
 * This handles the OAuth redirect and stores the access token
 * Each user's connections are stored separately with their user_id
 */

/**
 * OAuth callback handler for social media platforms
 * This handles the OAuth redirect and stores the access token
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const platform = params.platform;
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/social?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/social?error=no_code', request.url)
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/social/callback/${platform}`;

    let accessToken = '';
    let refreshToken = '';
    let expiresAt: Date | null = null;
    let platformUserId = '';
    let platformUsername = '';

    // Exchange code for access token
    switch (platform) {
      case 'facebook':
        const fbAppId = process.env.FACEBOOK_APP_ID;
        const fbAppSecret = process.env.FACEBOOK_APP_SECRET;
        
        if (!fbAppId || !fbAppSecret) {
          throw new Error('Facebook credentials not configured');
        }

        // Exchange code for access token
        const fbTokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
          params: {
            client_id: fbAppId,
            client_secret: fbAppSecret,
            redirect_uri: redirectUri,
            code: code,
          },
        });

        accessToken = fbTokenResponse.data.access_token;
        expiresAt = new Date(Date.now() + (fbTokenResponse.data.expires_in * 1000));

        // Get user info
        const fbUserResponse = await axios.get('https://graph.facebook.com/v18.0/me', {
          params: { access_token: accessToken },
        });

        platformUserId = fbUserResponse.data.id;
        platformUsername = fbUserResponse.data.name || '';

        // Get pages (for posting and messaging)
        try {
          const pagesResponse = await axios.get(`https://graph.facebook.com/v18.0/me/accounts`, {
            params: { access_token: accessToken },
          });

          if (pagesResponse.data.data && pagesResponse.data.data.length > 0) {
            // Use first page for posting
            platformUserId = pagesResponse.data.data[0].id;
            platformUsername = pagesResponse.data.data[0].name || '';
          }
        } catch (pagesError) {
          // If pages API fails, use user account
          console.warn('Could not fetch pages, using user account:', pagesError);
        }
        break;

      case 'linkedin':
        const linkedinClientId = process.env.LINKEDIN_CLIENT_ID;
        const linkedinClientSecret = process.env.LINKEDIN_CLIENT_SECRET;
        
        if (!linkedinClientId || !linkedinClientSecret) {
          throw new Error('LinkedIn credentials not configured');
        }

        // Exchange code for access token
        const linkedinTokenResponse = await axios.post(
          'https://www.linkedin.com/oauth/v2/accessToken',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: linkedinClientId,
            client_secret: linkedinClientSecret,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        accessToken = linkedinTokenResponse.data.access_token;
        expiresAt = new Date(Date.now() + (linkedinTokenResponse.data.expires_in * 1000));

        // Get user info
        const linkedinUserResponse = await axios.get('https://api.linkedin.com/v2/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        platformUserId = linkedinUserResponse.data.id;
        platformUsername = linkedinUserResponse.data.localizedFirstName + ' ' + linkedinUserResponse.data.localizedLastName;
        break;

      default:
        throw new Error('Unsupported platform');
    }

    // Get current user
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.redirect(
        new URL('/?error=not_authenticated', request.url)
      );
    }

    // Check if connection already exists for this user
    const { data: existing } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();

    if (existing) {
      // Update existing connection
      const { error } = await supabaseAdmin
        .from('social_connections')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken || existing.refresh_token,
          expires_at: expiresAt,
          platform_user_id: platformUserId,
          platform_username: platformUsername,
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
          platform,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          platform_user_id: platformUserId,
          platform_username: platformUsername,
        });

      if (error) throw error;
    }

    // Redirect back to social page with success
    return NextResponse.redirect(
      new URL(`/dashboard/social?connected=${platform}`, request.url)
    );
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/dashboard/social?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}





