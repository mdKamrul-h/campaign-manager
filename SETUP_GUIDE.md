# Complete Setup Guide - Campaign Manager

This guide will walk you through setting up the Campaign Manager platform from scratch, including Supabase integration and Excel import functionality.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Installation](#installation)
4. [Environment Variables](#environment-variables)
5. [Database Schema](#database-schema)
6. [Storage Configuration](#storage-configuration)
7. [Running the Application](#running-the-application)
8. [Excel Import Feature](#excel-import-feature)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- A **Supabase account** (free tier is sufficient) ([Sign up](https://supabase.com))
- **Git** (optional, for version control)

## Supabase Setup

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click **"New Project"**
4. Fill in the project details:
   - **Name**: Choose a name for your project (e.g., "campaign-manager")
   - **Database Password**: Set a strong password (save this securely)
   - **Region**: Select the region closest to your users
5. Click **"Create new project"**
6. Wait for the project to be created (this may take 1-2 minutes)

### Step 2: Get Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll see a section called **"Project API keys"** with several keys displayed
3. Copy the following values (you'll need them later):
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
     - Located at the top of the API settings page
   - **anon/public key** (starts with `eyJ...`)
     - This is the **"anon"** or **"public"** key - it's safe to expose in client-side code
     - Usually the first key shown
   - **service_role key** (starts with `eyJ...`) - **⚠️ Keep this secret!**
     - Scroll down to find the **"service_role"** key section
     - Click the **eye icon** 👁️ or **"Reveal"** button to show the key (it's hidden by default)
     - **IMPORTANT**: This key has admin privileges - never expose it in client-side code or commit it to version control
     - Only use it in server-side code (API routes, backend services)

### Step 3: Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Open the `supabase-schema.sql` file from this project
4. Copy the entire contents of the file
5. Paste it into the SQL Editor
6. Click **"Run"** (or press `Ctrl+Enter`)
7. Verify the execution was successful (you should see "Success. No rows returned")
8. Go to **Table Editor** to verify the tables were created:
   - `members`
   - `documents`
   - `campaigns`
   - `social_connections`
   - `campaign_logs`

### Step 4: Enable Row Level Security (RLS)

**IMPORTANT**: This step enables Row Level Security for proper database security.

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Open the `supabase-rls-policies.sql` file from this project
4. Copy the entire contents of the file
5. Paste it into the SQL Editor
6. Click **"Run"** (or press `Ctrl+Enter`)
7. Verify the execution was successful
8. Go to **Table Editor** and verify RLS is enabled:
   - Select any table (e.g., `members`)
   - Check the **"RLS"** column - it should show as **enabled** ✅

**What this does:**
- Enables Row Level Security on all tables
- Creates policies that allow access through the API
- Provides an additional security layer
- Service role key (used in API routes) bypasses RLS
- Anon key (used in client-side) respects RLS policies

**Note**: See `RLS_SETUP_GUIDE.md` for detailed explanation of RLS and security options.

### Step 5: Create Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click **"New bucket"**
3. Configure the bucket:
   - **Name**: `campaign-files`
   - **Public bucket**: Toggle **ON** (or configure RLS policies if you prefer)
4. Click **"Create bucket"**

### Step 6: Configure Storage Policies (Optional but Recommended)

If you didn't make the bucket public, you need to set up Row Level Security (RLS) policies:

1. Go to **Storage** → **Policies**
2. Select the `campaign-files` bucket
3. Click **"New Policy"**
4. Create a policy that allows authenticated users to upload/read files

## Installation

### Step 1: Clone or Navigate to Project

```bash
cd campaignM
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- React
- Supabase client
- Excel parsing library (xlsx)
- And other dependencies

### Step 3: Verify Installation

Check that `node_modules` folder was created and no errors occurred during installation.

## Environment Variables

### Step 1: Create Environment File

Create a `.env.local` file in the root directory of the project:

```bash
# Windows (PowerShell)
New-Item -Path .env.local -ItemType File

# Mac/Linux
touch .env.local
```

### Step 2: Add Required Variables

Open `.env.local` and add the following variables:

```env
# ============================================
# SUPABASE CONFIGURATION (REQUIRED)
# ============================================
# Get these from Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# ============================================
# OPENAI CONFIGURATION (REQUIRED for AI features)
# ============================================
# Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your_openai_key_here

# ============================================
# APPLICATION URL
# ============================================
NEXTAUTH_URL=http://localhost:3000

# ============================================
# OPTIONAL: SMS (BulkSMSBD.net)
# ============================================
# Get from http://bulksmsbd.net
BULKSMSBD_API_KEY=Bh6WCte0rmh9n0CCepCo
SMS_SENDER_ID=Mallick NDC

# ============================================
# OPTIONAL: Email (Resend)
# ============================================
# Get from https://resend.com/api-keys
RESEND_API_KEY=
FROM_EMAIL=onboarding@resend.dev

# ============================================
# OPTIONAL: Social Media APIs
# ============================================
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
```

### Step 3: Fill in Your Values

Replace the placeholder values with your actual credentials:

1. **Supabase values**: From Step 2 of Supabase Setup
2. **OpenAI API Key**: 
   - Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Sign up or log in
   - Click "Create new secret key"
   - Copy the key immediately (it won't be shown again)
   - Add credits to your OpenAI account

3. **Optional services**: Add these later if you need SMS, Email, or Social Media features

## Database Schema and RLS

The database schema is included in `supabase-schema.sql`. After running it, you must also run `supabase-rls-policies.sql` to enable Row Level Security.

### Key Tables:

- **members**: Stores contact information with image support
- **documents**: Stores uploaded reference documents
- **campaigns**: Stores campaign details
- **social_connections**: Stores social media API connections
- **campaign_logs**: Tracks campaign sending status

### Important: Schema Updates

If you're updating an existing database, you may need to add the `image_url` column:

```sql
ALTER TABLE members ADD COLUMN IF NOT EXISTS image_url TEXT;
```

## Storage Configuration

The application uses Supabase Storage for:
- Document uploads
- Member images (from Excel imports)
- Campaign visuals

Ensure the `campaign-files` bucket exists and is accessible (public or with proper RLS policies).

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will start at [http://localhost:3000](http://localhost:3000)

### Default Login Credentials

- **Username**: `mallick99`
- **Password**: `nazrulNDC99`

### Production Build

```bash
npm run build
npm start
```

## Excel Import Feature

### Supported File Formats

- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003)

### Excel File Format

Your Excel file should have the following columns (case-insensitive):

| Column Name | Required | Description | Example |
|------------|----------|-------------|---------|
| Name | ✅ Yes | Full name of the member | John Doe |
| Email | ✅ Yes | Email address | john@example.com |
| Mobile | ✅ Yes | Phone number | +1234567890 |
| Membership Type | No | GM, LM, FM, or OTHER | GM |
| Batch | No | Batch identifier | Batch2023 |
| Image URL | No | Image URL or base64 data | https://example.com/image.jpg |

### Column Name Variations Supported

The import function recognizes these column name variations:
- **Name**: `Name`, `name`, `Full Name`, `FullName`
- **Email**: `Email`, `email`, `E-mail`
- **Mobile**: `Mobile`, `mobile`, `Phone`, `phone`, `Phone Number`
- **Membership Type**: `Membership Type`, `membership_type`, `Membership`, `Type`
- **Batch**: `Batch`, `batch`
- **Image URL**: `Image URL`, `image_url`, `Image`, `Photo`

### Image Support

Images can be provided in two ways:

1. **URL**: Direct link to an image
   ```
   https://example.com/photo.jpg
   ```

2. **Base64**: Base64-encoded image data
   ```
   data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
   ```

Base64 images will be automatically uploaded to Supabase Storage.

### How to Import

1. Go to the **Members** page in the dashboard
2. Click **"Import Excel"** button
3. Click **"Download CSV Template"** to get a sample file format (optional)
4. Prepare your Excel file with the required columns
5. Click **"Select Excel File"** and choose your file
6. Click **"Import Members"**
7. Wait for the import to complete
8. Review the results:
   - Successfully imported members count
   - Any errors with row numbers

### Import Process

1. File is validated (format and size)
2. Excel file is parsed row by row
3. Each row is validated for required fields
4. Images (if base64) are uploaded to Supabase Storage
5. Members are inserted into the database in bulk
6. Results are displayed with success/error counts

### Error Handling

If there are errors during import:
- Invalid rows are skipped
- Error messages show which row had issues
- Valid rows are still imported
- You can fix the Excel file and re-import

## Troubleshooting

### Common Issues

#### 1. "Missing Supabase environment variables"

**Problem**: Application can't connect to Supabase

**Solution**:
- Verify `.env.local` file exists in the root directory
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Restart the development server after adding environment variables

#### 2. "Failed to fetch members"

**Problem**: API can't query the database

**Solution**:
- Verify the database schema was run successfully
- Check that the `members` table exists in Supabase Table Editor
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check Supabase project is active (not paused)

#### 3. "Storage bucket not found"

**Problem**: File uploads fail

**Solution**:
- Verify `campaign-files` bucket exists in Supabase Storage
- Check bucket is public or RLS policies are configured
- Ensure bucket name matches exactly: `campaign-files`

#### 4. Excel import fails

**Problem**: Import returns errors

**Solution**:
- Verify Excel file format (.xlsx or .xls)
- Check required columns (Name, Email, Mobile) are present
- Ensure column names match supported variations
- Check file size (very large files may timeout)
- Review error messages for specific row issues

#### 5. Images not uploading

**Problem**: Base64 images don't appear

**Solution**:
- Verify base64 string starts with `data:image/...`
- Check image format is supported (PNG, JPG, JPEG)
- Ensure `campaign-files` bucket exists and is accessible
- Check browser console for specific error messages

#### 6. "Table 'contacts' does not exist"

**Problem**: Old code references wrong table name

**Solution**:
- This should be fixed in the updated code
- If you see this error, ensure you're using the latest version
- The correct table name is `members`, not `contacts`

### Verifying Setup

Run these checks to verify everything is set up correctly:

1. **Database Tables**:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
   Should show: members, documents, campaigns, social_connections, campaign_logs

2. **Storage Bucket**:
   - Go to Supabase → Storage
   - Verify `campaign-files` bucket exists

3. **Environment Variables**:
   ```bash
   # Check if variables are loaded (in development)
   # They won't show in production for security
   ```

4. **API Endpoints**:
   - Visit `http://localhost:3000/api/members`
   - Should return JSON array (may be empty initially)

### Getting Help

If you encounter issues:

1. Check the browser console for errors
2. Check the terminal/command prompt for server errors
3. Verify all environment variables are set correctly
4. Ensure Supabase project is active
5. Review the error messages for specific guidance

## Next Steps

After setup is complete:

1. **Test the application**:
   - Login with default credentials
   - Add a test member manually
   - Try importing an Excel file
   - Upload a document

2. **Configure optional services**:
   - Set up Twilio for SMS
   - Set up Resend for Email
   - Connect social media accounts

3. **Customize**:
   - Update default login credentials
   - Modify branding/styling
   - Add additional features

## Production Deployment

For production deployment:

1. Set environment variables in your hosting platform (Vercel, etc.)
2. Update `NEXTAUTH_URL` to your production domain
3. Ensure Supabase project is in production mode
4. Configure proper RLS policies for security
5. Set up monitoring and error tracking

---

**Need help?** Check the other documentation files:
- `README.md` - Project overview
- `QUICK_START.md` - Quick setup guide
- `DEPLOYMENT_GUIDE.md` - Production deployment guide



