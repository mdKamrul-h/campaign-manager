# Social Media Connections Setup Guide

This guide explains how to set up and use the Social Media Connections feature to connect your accounts, view contacts, and send messages directly from the app.

## Features

- ✅ Connect Facebook, LinkedIn, and WhatsApp accounts
- ✅ View and sync your friends/contacts list
- ✅ Generate AI-powered content for each platform
- ✅ Send messages to specific contacts
- ✅ Manage all social media from one place

## Setup Instructions

### 1. Facebook Setup

1. **Create Facebook App**
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create a new app
   - Add "Facebook Login" product
   - Add "Pages" product
   - Add "Instagram Basic Display" product (if needed)

2. **Configure OAuth Settings**
   - Go to Settings → Basic
   - Add OAuth Redirect URI: `http://localhost:3000/api/social/callback/facebook` (for dev)
   - Add production URL when deploying

3. **Get Credentials**
   - Copy **App ID** → `FACEBOOK_APP_ID`
   - Copy **App Secret** → `FACEBOOK_APP_SECRET`

4. **Required Permissions**
   - `pages_manage_posts` - Post to Facebook Pages
   - `pages_read_engagement` - Read page insights
   - `user_friends` - Access friends list (may require app review)
   - `read_insights` - Read page insights

### 2. LinkedIn Setup

1. **Create LinkedIn App**
   - Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
   - Create a new app
   - Add "Sign In with LinkedIn" product

2. **Configure OAuth Settings**
   - Go to Auth tab
   - Add Redirect URL: `http://localhost:3000/api/social/callback/linkedin`
   - Add production URL when deploying

3. **Get Credentials**
   - Copy **Client ID** → `LINKEDIN_CLIENT_ID`
   - Copy **Client Secret** → `LINKEDIN_CLIENT_SECRET`

4. **Required Permissions**
   - `w_member_social` - Post on behalf of user
   - `r_liteprofile` - Read basic profile
   - `r_emailaddress` - Read email address

### 3. WhatsApp Setup

WhatsApp requires manual configuration:

1. **Create WhatsApp Business Account**
   - Go to [Meta Business](https://business.facebook.com/)
   - Set up WhatsApp Business API
   - Get your Phone Number ID and Access Token

2. **Add to Environment Variables**
   ```env
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_ACCESS_TOKEN=your_access_token
   ```

3. **Note**: WhatsApp contacts are managed via phone numbers, not through OAuth

## Environment Variables

Add these to your `.env.local`:

```env
# Facebook
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# LinkedIn
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# WhatsApp (Manual Setup)
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
```

## Database Setup

Run the updated schema to add the `social_contacts` table:

```sql
-- This is already included in supabase-schema.sql
-- Just run the schema file in Supabase SQL Editor
```

Then run the RLS policies:

```sql
-- Run supabase-rls-policies.sql
-- This includes policies for social_contacts table
```

## How to Use

### Step 1: Connect Your Accounts

1. Go to **Dashboard** → **Social Media**
2. Click **"Connect Account"** for the platform you want
3. Authorize the app in the popup window
4. You'll be redirected back with your account connected

### Step 2: Sync Contacts

1. After connecting, click **"View Contacts"**
2. Click **"Sync Contacts"** to fetch your friends/connections
3. Wait for the sync to complete
4. Your contacts will appear in the list

### Step 3: Send Messages

1. **Select Contacts**: Click on contacts to select them (checkmark appears)
2. **Compose Message**:
   - Option A: Type your message directly
   - Option B: Enable "Generate content with AI" and provide a prompt
3. **Send**: Click "Send to X Contacts"

## Platform-Specific Notes

### Facebook

- **Friends List**: May require app review for `user_friends` permission
- **Messaging**: Requires Messenger API setup for direct messages
- **Posting**: Posts to your connected Facebook Page

### LinkedIn

- **Connections**: LinkedIn API has limited access to connections list
- **Messaging**: Requires LinkedIn Messaging API setup
- **Posting**: Posts to your LinkedIn profile

### WhatsApp

- **Contacts**: Managed via phone numbers (not OAuth)
- **Messaging**: Uses WhatsApp Business API
- **Setup**: Manual configuration required

## API Endpoints

### Connect Account
```
POST /api/social/connect
Body: { "platform": "facebook" | "linkedin" | "whatsapp" }
Returns: { "authUrl": "...", "redirectUri": "..." }
```

### OAuth Callback
```
GET /api/social/callback/[platform]?code=...
Handles OAuth redirect and stores access token
```

### Get Connections
```
GET /api/social/connections
Returns: List of connected accounts
```

### Sync Contacts
```
POST /api/social/contacts
Body: { "platform": "...", "connectionId": "..." }
Returns: { "success": true, "synced": 10 }
```

### Get Contacts
```
GET /api/social/contacts?connection_id=...
Returns: List of contacts for a connection
```

### Send Messages
```
POST /api/social/send
Body: {
  "platform": "...",
  "connectionId": "...",
  "contactIds": ["..."],
  "message": "...",
  "generateContent": false,
  "contentPrompt": "..."
}
Returns: { "success": true, "sent": 5, "total": 5 }
```

## Troubleshooting

### Issue: "Connection failed" or OAuth error

**Solutions:**
- Check OAuth redirect URLs are correct in app settings
- Verify App ID/Secret are correct
- Check if app is in development mode (may need to add test users)
- Ensure required permissions are requested

### Issue: "Friends list is empty" or "No contacts found"

**Solutions:**
- Facebook: `user_friends` permission may require app review
- LinkedIn: API has limited access to connections
- Try clicking "Sync Contacts" again
- Check if you have friends/connections on the platform

### Issue: "Failed to send message"

**Solutions:**
- Verify access token hasn't expired
- Check if recipient has accepted your friend request (Facebook)
- Ensure Messenger API is set up (for Facebook messages)
- Check WhatsApp credentials are correct

### Issue: "Access token expired"

**Solutions:**
- Disconnect and reconnect the account
- The system will refresh tokens automatically when possible

## Security Notes

- Access tokens are stored securely in the database
- Tokens are never exposed to the client
- RLS policies protect social_connections and social_contacts tables
- OAuth flow uses secure HTTPS redirects

## Next Steps

1. ✅ Add environment variables
2. ✅ Run database schema updates
3. ✅ Connect your social media accounts
4. ✅ Sync contacts
5. ✅ Start sending messages!

For detailed API documentation, see the individual API route files in `app/api/social/`.



