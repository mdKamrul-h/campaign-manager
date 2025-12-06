# How to Find Your Supabase Service Role Key

## Quick Guide

The **service_role key** is located in your Supabase project's API settings. Here's exactly where to find it:

## Step-by-Step Instructions

### 1. Log in to Supabase
- Go to [https://supabase.com](https://supabase.com)
- Sign in to your account

### 2. Select Your Project
- Click on your project from the dashboard
- If you don't have a project yet, create one first

### 3. Navigate to API Settings
- In the left sidebar, click on **"Settings"** (gear icon ⚙️)
- Then click on **"API"** in the settings menu

### 4. Find the Service Role Key
- Scroll down on the API settings page
- Look for the section labeled **"service_role"** or **"service_role key"**
- The key will be hidden by default (shown as dots: `••••••••`)
- Click the **eye icon** 👁️ or **"Reveal"** button next to it
- The full key will be displayed (starts with `eyJ...`)

### 5. Copy the Key
- Click the **copy icon** 📋 next to the revealed key
- Or manually select and copy the entire key
- Paste it into your `.env.local` file as `SUPABASE_SERVICE_ROLE_KEY`

## Visual Guide

```
Supabase Dashboard
├── Your Project
    ├── Settings (⚙️)
        ├── API
            ├── Project URL: https://xxxxx.supabase.co
            ├── anon public key: eyJhbGc... (visible)
            └── service_role key: •••••••• [👁️ Reveal] ← Click here!
```

## Important Security Notes

⚠️ **CRITICAL**: The service_role key has **full admin access** to your database!

- ✅ **DO**: Use it only in server-side code (Next.js API routes, backend services)
- ✅ **DO**: Store it in environment variables (`.env.local`)
- ✅ **DO**: Add `.env.local` to `.gitignore` (never commit it)
- ❌ **DON'T**: Expose it in client-side JavaScript
- ❌ **DON'T**: Commit it to Git/GitHub
- ❌ **DON'T**: Share it publicly

## What Each Key Is Used For

### `NEXT_PUBLIC_SUPABASE_URL`
- **Location**: Top of API settings page
- **Usage**: Public URL of your Supabase project
- **Security**: Safe to expose (public)

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Location**: API settings, "anon" or "public" key section
- **Usage**: Client-side operations with Row Level Security (RLS)
- **Security**: Safe to expose (protected by RLS policies)

### `SUPABASE_SERVICE_ROLE_KEY`
- **Location**: API settings, "service_role" section (hidden by default)
- **Usage**: Server-side operations that bypass RLS
- **Security**: **SECRET** - Never expose!

## Troubleshooting

### "I can't see the service_role key"
- Make sure you're logged in as the project owner/admin
- Try refreshing the page
- Check if you have the correct permissions for the project

### "The reveal button doesn't work"
- Try clicking directly on the eye icon
- Some browsers may block the reveal - try a different browser
- Check if JavaScript is enabled

### "I accidentally exposed my service_role key"
1. **Immediately** go to Supabase Dashboard → Settings → API
2. Click **"Reset service_role key"** or **"Rotate key"**
3. This will generate a new key and invalidate the old one
4. Update your `.env.local` file with the new key
5. Restart your application

## Alternative: Using the anon key (Limited Functionality)

If you can't access the service_role key or prefer not to use it:
- You can use the `anon` key, but you'll need to configure proper Row Level Security (RLS) policies
- Some operations may not work without the service_role key
- The service_role key is recommended for server-side operations

## Still Having Issues?

If you're still having trouble finding the key:
1. Check the Supabase documentation: [https://supabase.com/docs/guides/api](https://supabase.com/docs/guides/api)
2. Make sure you're the project owner or have admin access
3. Contact Supabase support if you're the project owner but still can't see the key

