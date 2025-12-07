# Troubleshooting Supabase Connection Issues

## Error: `getaddrinfo ENOTFOUND xxx.supabase.co`

This error means your application cannot find/connect to your Supabase project. Here's how to fix it:

## Quick Fix Checklist

### 1. Verify Your Supabase Project Exists

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Log in to your account
3. Check if your project is listed
4. **If project is missing**: Create a new project or check if it was deleted

### 2. Check Project Status

- Click on your project in the dashboard
- Check if the project status shows as **"Active"**
- If it shows **"Paused"** or **"Inactive"**, you need to restore/activate it
- Free tier projects may pause after inactivity

### 3. Verify Your Environment Variables

Check your `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Common Issues:**

❌ **Wrong URL format:**
- ❌ `https://supabase.com/project/xxx` (WRONG)
- ❌ `ezancaoowipcxgxkxkis.supabase.co` (MISSING https://)
- ✅ `https://ezancaoowipcxgxkxkis.supabase.co` (CORRECT)

❌ **Typo in project ID:**
- Double-check the project ID matches exactly what's in Supabase dashboard

❌ **Missing https://:**
- The URL must start with `https://`

### 4. Get the Correct URL from Supabase

1. Go to Supabase Dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Look for **"Project URL"** at the top
5. It should look like: `https://xxxxxxxxxxxxx.supabase.co`
6. Copy this **exact** URL (including `https://`)

### 5. Restart Your Development Server

After updating `.env.local`:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

**Important**: Environment variables are only loaded when the server starts. You must restart after changing them.

### 6. Verify Network Connection

Test if you can reach Supabase:

```bash
# Windows PowerShell
Test-NetConnection ezancaoowipcxgxkxkis.supabase.co -Port 443

# Mac/Linux
curl -I https://ezancaoowipcxgxkxkis.supabase.co
```

If this fails, there might be:
- Firewall blocking the connection
- VPN interfering
- Network connectivity issues

## Step-by-Step Fix

### Step 1: Open Your `.env.local` File

Located in the root of your project: `d:\work\campaignM\.env.local`

### Step 2: Check the Supabase URL

Make sure it looks like this:
```env
NEXT_PUBLIC_SUPABASE_URL=https://ezancaoowipcxgxkxkis.supabase.co
```

**Verify:**
- ✅ Starts with `https://`
- ✅ Has `.supabase.co` at the end
- ✅ No extra spaces or characters
- ✅ Matches exactly what's in Supabase dashboard

### Step 3: Verify Project Exists

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Find project with ID: `ezancaoowipcxgxkxkis`
3. If not found:
   - Project might have been deleted
   - You might be logged into wrong account
   - Project ID might be different

### Step 4: Get Fresh Credentials

If the project exists:

1. Go to **Settings** → **API**
2. Copy **Project URL** (should be at the top)
3. Copy **anon public** key
4. Copy **service_role** key (click reveal)
5. Update your `.env.local` with these exact values

### Step 5: Restart Server

```bash
# Stop current server (Ctrl+C in terminal)
npm run dev
```

## Common Scenarios

### Scenario 1: Project Was Deleted

**Solution**: Create a new Supabase project and update your `.env.local`

### Scenario 2: Wrong Project ID

**Solution**: 
1. Check Supabase dashboard for correct project ID
2. Update `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
3. Restart server

### Scenario 3: Project is Paused

**Solution**:
1. Go to Supabase dashboard
2. Click on your project
3. If paused, click "Restore" or "Resume"
4. Wait for project to become active

### Scenario 4: Typo in URL

**Solution**:
- Check for missing `https://`
- Check for extra spaces
- Verify the project ID is correct

### Scenario 5: Environment File Not Loading

**Solution**:
1. Make sure file is named exactly `.env.local` (not `.env.local.txt`)
2. Make sure it's in the project root (same folder as `package.json`)
3. Restart the development server
4. Check for syntax errors in the file (no spaces around `=`)

## Testing Your Connection

After fixing, test the connection:

1. Restart your dev server
2. Try to add a member
3. Check the terminal for errors
4. If still failing, check browser console (F12) for client-side errors

## Still Not Working?

If you've tried everything:

1. **Create a new Supabase project** (if old one is gone)
2. **Run the schema** (`supabase-schema.sql`) in the new project
3. **Create the storage bucket** (`campaign-files`)
4. **Update `.env.local`** with new project credentials
5. **Restart the server**

## Quick Verification Script

You can test your Supabase connection by creating a test file:

```javascript
// test-supabase.js (temporary file)
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
supabase.from('members').select('count').then(({ error }) => {
  if (error) {
    console.error('Connection failed:', error.message);
  } else {
    console.log('✅ Connection successful!');
  }
});
```

Run with: `node test-supabase.js` (after installing dotenv: `npm install dotenv`)





