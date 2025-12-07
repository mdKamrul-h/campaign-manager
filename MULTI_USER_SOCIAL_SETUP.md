# Multi-User Social Media Integration Guide

This guide explains how the multi-user social media integration works, where each user can connect their own Facebook, LinkedIn, and WhatsApp accounts and send messages to their contacts.

## 🎯 Overview

The app now supports **multi-user social media connections**:
- ✅ Each user connects their own social media accounts
- ✅ Connections are stored separately per user
- ✅ Users can only see and use their own connections
- ✅ Users can sync and message their own contacts
- ✅ Secure OAuth flow for each platform

## 📋 Database Schema Updates

### Social Connections Table
The `social_connections` table now includes a `user_id` field to associate connections with specific users:

```sql
CREATE TABLE social_connections (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,  -- Username from auth system
    platform VARCHAR(20) NOT NULL,
    access_token TEXT NOT NULL,
    platform_user_id VARCHAR(255),
    platform_username VARCHAR(255),
    ...
    UNIQUE(user_id, platform)  -- One connection per platform per user
);
```

### Migration
If you have an existing database, run `SUPABASE_FIXES.sql` which will:
- Add `user_id` column if missing
- Add unique constraint for `(user_id, platform)`
- Set default user_id for existing connections (you may want to update these)

## 🔐 Authentication

The app uses the existing authentication system:
- Users log in with username/password
- Username is stored in auth cookie
- All API routes verify the user is authenticated
- Connections are filtered by `user_id` (username)

## 🔗 Platform-Specific Setup

### 1. Facebook Setup

**For App Owner (Admin):**
1. Create Facebook App at [developers.facebook.com](https://developers.facebook.com)
2. Add "Facebook Login" product
3. Add "Pages" product
4. Configure OAuth Redirect URI: `https://yourdomain.com/api/social/callback/facebook`
5. Get App ID and App Secret
6. Add to `.env.local`:
   ```env
   FACEBOOK_APP_ID=your_app_id
   FACEBOOK_APP_SECRET=your_app_secret
   ```

**For End Users:**
1. Click "Connect Account" for Facebook
2. Authorize the app in the popup
3. Grant permissions:
   - `user_friends` - Access friends list
   - `pages_messaging` - Send messages via Messenger
   - `pages_manage_posts` - Post to pages
   - `user_posts` - Access user posts

**Note:** `user_friends` permission requires Facebook App Review for production use.

### 2. LinkedIn Setup

**For App Owner (Admin):**
1. Create LinkedIn App at [linkedin.com/developers](https://www.linkedin.com/developers)
2. Add "Sign In with LinkedIn" product
3. Configure OAuth Redirect URI: `https://yourdomain.com/api/social/callback/linkedin`
4. Get Client ID and Client Secret
5. Add to `.env.local`:
   ```env
   LINKEDIN_CLIENT_ID=your_client_id
   LINKEDIN_CLIENT_SECRET=your_client_secret
   ```

**For End Users:**
1. Click "Connect Account" for LinkedIn
2. Authorize the app
3. Grant permissions:
   - `w_member_social` - Post on behalf of user
   - `w_messages` - Send messages
   - `r_liteprofile` - Read basic profile
   - `r_emailaddress` - Read email

### 3. WhatsApp Setup

**For End Users (Each User Provides Their Own Credentials):**
1. Click "Connect Account" for WhatsApp
2. A modal will appear asking for:
   - **Phone Number ID** - From Meta Business Suite
   - **Access Token** - From Meta Business Suite
   - **Business Name** (optional)
3. Enter credentials and click "Connect"

**How Users Get WhatsApp Credentials:**
1. Go to [Meta Business Suite](https://business.facebook.com)
2. Navigate to **WhatsApp → API Setup**
3. Copy **Phone Number ID** and **Access Token**
4. Paste into the connection modal

**Note:** Each user needs their own WhatsApp Business API account. The app owner's credentials are NOT used.

## 🚀 How It Works

### Connection Flow

1. **User clicks "Connect Account"**
   - For Facebook/LinkedIn: Opens OAuth popup
   - For WhatsApp: Shows credential input modal

2. **OAuth Authorization (Facebook/LinkedIn)**
   - User is redirected to platform's login
   - User grants permissions
   - Platform redirects back with authorization code

3. **Token Exchange**
   - App exchanges code for access token
   - App fetches user profile information
   - Connection is stored with `user_id`

4. **Connection Stored**
   - Saved to `social_connections` table
   - Associated with current user's `user_id`
   - Access token encrypted/stored securely

### Contacts Sync Flow

1. **User clicks "Sync Contacts"**
   - API fetches contacts from platform using user's access token
   - Contacts are stored in `social_contacts` table
   - Linked to user's connection via `connection_id`

2. **Contacts Displayed**
   - Only contacts from user's connections are shown
   - Filtered by `user_id` through connection relationship

### Messaging Flow

1. **User selects contacts and composes message**
   - Can generate content with AI
   - Can type custom message

2. **Message Sent**
   - Uses user's connection access token
   - Sends to selected contacts
   - Results logged per contact

## 🔒 Security Features

1. **User Isolation**
   - Each user only sees their own connections
   - API routes verify `user_id` matches authenticated user
   - Connections cannot be accessed by other users

2. **Token Security**
   - Access tokens stored in database (server-side only)
   - Never exposed to client
   - Tokens are user-specific

3. **Authorization Checks**
   - All API routes check authentication
   - Connection ownership verified before operations
   - Unauthorized access returns 403/404

## 📝 API Endpoints

### Get User's Connections
```
GET /api/social/connections
Returns: List of current user's connections
```

### Connect Account
```
POST /api/social/connect
Body: { "platform": "facebook" | "linkedin" }
Returns: { "authUrl": "..." }
```

### Connect WhatsApp (Manual)
```
POST /api/social/whatsapp/connect
Body: {
  "phoneNumberId": "...",
  "accessToken": "...",
  "businessName": "..."
}
```

### Sync Contacts
```
POST /api/social/contacts
Body: { "platform": "...", "connectionId": "..." }
Returns: { "synced": 10 }
```

### Get Contacts
```
GET /api/social/contacts?connection_id=...
Returns: List of contacts for user's connection
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
```

## 🎨 User Interface

The Social Media page (`/dashboard/social`) shows:

1. **Connection Status Cards**
   - One card per platform (Facebook, LinkedIn, WhatsApp)
   - Shows connection status (Connected/Not Connected)
   - "Connect Account" button for each

2. **Contacts List** (when connection selected)
   - Shows all contacts from that connection
   - "Sync Contacts" button to refresh
   - Checkboxes to select contacts

3. **Message Composition**
   - Text input or AI generation
   - Preview of selected contacts
   - Send button

4. **WhatsApp Connection Modal**
   - Form to enter Phone Number ID and Access Token
   - Instructions on how to get credentials
   - Connect button

## ⚠️ Important Notes

### Facebook Friends List
- `user_friends` permission requires **Facebook App Review**
- Without approval, friends list will be empty
- Users need to grant permission during OAuth

### LinkedIn Messaging
- Direct messaging requires LinkedIn Messaging API
- May need additional permissions/approval
- Some features may be limited

### WhatsApp
- Each user must have their own WhatsApp Business API account
- Cannot share credentials between users
- Users need to set up their own Meta Business account

## 🐛 Troubleshooting

### "Connection not found or unauthorized"
- User is trying to access another user's connection
- Check that `user_id` matches authenticated user

### "Friends list is empty"
- Facebook: User needs to grant `user_friends` permission
- LinkedIn: API may have limited access
- Try clicking "Sync Contacts" again

### "Failed to send message"
- Check access token hasn't expired
- Verify recipient has accepted friend request (Facebook)
- Check platform-specific API requirements

### "WhatsApp not configured"
- User needs to provide their own credentials
- Use the WhatsApp connection modal
- Verify credentials are correct in Meta Business Suite

## 📚 Next Steps

1. **Run Database Migration**
   ```sql
   -- Run SUPABASE_FIXES.sql in Supabase SQL Editor
   ```

2. **Configure OAuth Apps**
   - Set up Facebook App
   - Set up LinkedIn App
   - Configure redirect URIs

3. **Test Connection Flow**
   - Log in as a user
   - Connect Facebook account
   - Sync contacts
   - Send test message

4. **Production Considerations**
   - Submit Facebook app for review (for friends list)
   - Configure production redirect URIs
   - Set up proper error handling
   - Consider token refresh logic

## ✅ Features Implemented

- ✅ Multi-user connection storage
- ✅ User-specific contact lists
- ✅ Secure OAuth flow
- ✅ WhatsApp manual connection
- ✅ Contact syncing per user
- ✅ Message sending to user's contacts
- ✅ AI content generation
- ✅ Connection management UI
- ✅ Authorization checks

All features are ready for multi-user use! 🎉





