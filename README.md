# Campaign Manager Platform

A comprehensive multi-channel campaign execution platform with AI-powered content generation, social media integration, SMS/Email capabilities, and member management.

## Features

- **Authentication**: Secure login system (Username: mallick99, Password: nazrulNDC99)
- **Member Management**: Complete CRUD operations for managing member database with batch and membership type filtering
- **AI Content Generation**: OpenAI GPT-4 powered content generation tailored for different channels
- **AI Visual Generation**: DALL-E 3 integration for creating campaign visuals
- **Multi-Channel Distribution**:
  - Email (via Resend)
  - SMS (via Twilio) with Sender ID masking
  - Facebook
  - Instagram
  - LinkedIn
  - WhatsApp
- **Document Upload**: Upload reference documents to provide context for AI generation
- **Campaign Customization**: Modify AI-generated content with suggestions
- **Targeted Campaigns**: Send to all members, specific batches, batch filters (senior/junior/batchmate), or membership types
- **Flexible Sending**: Choose to send text, visuals, or both
- **Scheduled Campaigns**: Schedule campaigns to be sent automatically at specific date and time

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **AI**: OpenAI GPT-4 & DALL-E 3
- **Email**: Resend
- **SMS**: BulkSMSBD.net
- **Social Media**: Meta Graph API, LinkedIn API, WhatsApp Business API
- **Deployment**: Vercel

## Setup Instructions

### 1. Clone and Install

```bash
cd campaignM
npm install
```

### 2. Configure Supabase

1. Create a Supabase account at https://supabase.com
2. Create a new project
3. Go to SQL Editor and run the schema from `supabase-schema.sql`
4. Go to Storage and create a bucket named `campaign-files`
5. Make the bucket public or configure appropriate policies
6. Get your project URL and keys from Settings > API

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
SMS_SENDER_ID=MallickNDC7

# Resend (Email)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com

# Facebook/Instagram
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# LinkedIn
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token

# App URL
NEXTAUTH_URL=http://localhost:3000
```

### 4. Get API Keys

#### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add credits to your account

#### BulkSMSBD.net (SMS)
1. Sign up at http://bulksmsbd.net
2. Get your API key from the dashboard
3. Configure approved sender ID
4. See `BULKSMSBD_SETUP.md` for detailed setup

#### Resend (Email)
1. Sign up at https://resend.com/
2. Verify your domain or use their test domain
3. Create an API key

#### Facebook/Instagram
1. Go to https://developers.facebook.com/
2. Create an app
3. Add Facebook Login and Instagram Basic Display products
4. Get App ID and App Secret
5. Connect your Facebook Page and Instagram Business Account

#### LinkedIn
1. Go to https://www.linkedin.com/developers/
2. Create an app
3. Request access to Share on LinkedIn
4. Get Client ID and Client Secret

#### WhatsApp Business API
1. Sign up for WhatsApp Business Platform
2. Follow Meta's setup guide
3. Get Phone Number ID and Access Token

### 5. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### 6. Login

Use these credentials:
- Username: `mallick99`
- Password: `nazrulNDC99`

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# ... add all other environment variables

# Deploy to production
vercel --prod
```

### Option 2: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to https://vercel.com/
3. Click "Import Project"
4. Select your repository
5. Add all environment variables in the Environment Variables section
6. Click "Deploy"

### Connect to Subdomain

1. In Vercel Dashboard, go to your project settings
2. Go to Domains
3. Add your custom domain or subdomain
4. Follow the DNS configuration instructions
5. Update your DNS records at your domain provider
6. Wait for DNS propagation (can take up to 48 hours)

Example DNS setup:
- Type: CNAME
- Name: campaign (or your subdomain)
- Value: cname.vercel-dns.com

## Usage Guide

### Managing Members

1. Go to Dashboard > Members
2. Click "Add Member" to add new members
3. Fill in: Name, Email, Mobile, Membership Type (GM/LM/FM/OTHER), Batch
4. Edit or delete members as needed
5. Use search to filter members

### Uploading Documents

1. Go to Dashboard > Documents
2. Upload PDFs, DOCs, or text files
3. These documents provide context for AI content generation
4. The AI will reference these when generating campaign content

### Creating and Sending Campaigns

#### Step 1: Generate Content
1. Go to Dashboard > Campaigns
2. Enter campaign title
3. Select channel (Email, SMS, Facebook, Instagram, LinkedIn, WhatsApp)
4. Check "Use uploaded documents as context" if needed
5. Write a content generation prompt
6. Click "Generate Content"
7. Review and edit the generated content
8. Add modification suggestions if needed and regenerate

#### Step 2: Add Visuals
1. Generate visual with AI by describing what you want
2. OR upload your own custom image
3. You can have both AI-generated and custom visuals

#### Step 3: Send Campaign
1. Choose target audience:
   - All Members
   - Specific Batch
   - Membership Type (GM, LM, FM, OTHER)
2. **For SMS campaigns**: Set custom Sender ID (e.g., "MallickNDC7")
   - This displays as the sender name instead of phone number
   - Max 11 characters, alphanumeric only
   - Works in most countries (not USA/Canada)
   - See `SMS_SENDER_ID_GUIDE.md` for details
3. Choose what to send:
   - Text content
   - Visual
   - Both
4. Review preview
5. Click "Send Campaign"

### Monitoring Campaign Performance

1. Go to Dashboard to see overview statistics
2. View total members, campaigns, and sent campaigns
3. Campaign logs are stored in Supabase for detailed analytics

## Database Schema

### Members Table
- id (UUID)
- name (VARCHAR)
- email (VARCHAR)
- mobile (VARCHAR)
- membership_type (GM/LM/FM/OTHER)
- batch (VARCHAR)
- created_at, updated_at (TIMESTAMP)

### Documents Table
- id (UUID)
- name (VARCHAR)
- file_path (TEXT)
- file_type (VARCHAR)
- content_text (TEXT)
- uploaded_at (TIMESTAMP)

### Campaigns Table
- id (UUID)
- title (VARCHAR)
- content (TEXT)
- visual_url (TEXT)
- custom_visual_url (TEXT)
- status (draft/scheduled/sent)
- channel (VARCHAR)
- target_audience (JSONB)
- created_at, updated_at, scheduled_at, sent_at (TIMESTAMP)

### Social Connections Table
- id (UUID)
- platform (facebook/instagram/linkedin)
- access_token (TEXT)
- refresh_token (TEXT)
- expires_at (TIMESTAMP)
- platform_user_id (VARCHAR)
- platform_username (VARCHAR)
- connected_at, updated_at (TIMESTAMP)

### Campaign Logs Table
- id (UUID)
- campaign_id (UUID)
- member_id (UUID)
- channel (VARCHAR)
- status (success/failed/pending)
- error_message (TEXT)
- sent_at (TIMESTAMP)

## Security Notes

1. Change the default login credentials in `lib/auth.ts` for production
2. Keep all API keys secure and never commit them to version control
3. Use environment variables for all sensitive data
4. Enable RLS (Row Level Security) policies in Supabase for production
5. Configure CORS properly for API endpoints
6. Use HTTPS in production

## Scheduled Campaigns

The platform supports scheduling campaigns to be sent automatically at a specific date and time. 

### How It Works

1. When creating a campaign, set a scheduled date and time using the datetime picker
2. The campaign will be saved with status "scheduled"
3. A cron job runs every minute to check for scheduled campaigns that are ready to send
4. When the scheduled time arrives, the campaign is automatically executed

### Setting Up the Cron Job

#### For Vercel Deployment

The cron job is automatically configured in `vercel.json` to run every minute. No additional setup is required.

#### For Other Platforms

If deploying to a platform other than Vercel, you need to set up a cron job that calls:
```
GET /api/cron/execute-scheduled-campaigns
```

**Recommended schedule**: Every minute (`* * * * *`)

**Optional Security**: Set the `CRON_SECRET` environment variable and include it as a Bearer token in the Authorization header:
```
Authorization: Bearer YOUR_CRON_SECRET
```

### Manual Execution

You can also manually trigger the cron job by calling:
```bash
curl -X GET https://your-domain.com/api/cron/execute-scheduled-campaigns
```

## Batch Filtering

The platform now supports filtering members by batch year ranges:

- **Senior**: Members with batches before 1999 (batch < 1999)
- **Junior**: Members with batches after 1999 (batch > 1999)
- **Batchmate**: Members with batch 1999 (batch = 1999)

When using batch filters, members without a batch value are automatically excluded.

## Troubleshooting

### Scheduled Campaigns Not Sending

1. **Check cron job is running**: Verify the cron job is configured and running
   - For Vercel: Check the Cron Jobs section in your Vercel dashboard
   - For other platforms: Verify your cron service is active
2. **Check campaign status**: Ensure the campaign status is "scheduled" in the database
3. **Verify scheduled time**: Check that `scheduled_at` is in the past
4. **Check logs**: Review API logs for errors when the cron job executes
5. **Manual trigger**: Try manually calling the cron endpoint to test

### OpenAI API Errors
- Check if you have sufficient credits
- Verify API key is correct
- Check rate limits

### SMS Not Sending
- Verify Twilio credentials
- Check if phone number is verified (in trial mode)
- Ensure phone numbers are in E.164 format (+1234567890)

### Email Not Sending
- Verify Resend API key
- Check domain verification
- Review email content for spam triggers

### Social Media Posting Fails
- Check access token expiration
- Verify app permissions
- Review platform-specific requirements (e.g., Instagram requires images)

### Database Connection Issues
- Verify Supabase URL and keys
- Check if database is paused (free tier)
- Review Supabase logs for errors

## Support

For issues or questions:
1. Check the environment variables are correctly set
2. Review Supabase logs
3. Check browser console for frontend errors
4. Review API logs in Vercel

## License

Private - All rights reserved

## Version

1.0.0 - Initial Release
