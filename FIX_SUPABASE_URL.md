# Fix Supabase URL Connection Error

## The Error

```
getaddrinfo ENOTFOUND ezancaoowipcxgxkxkis.supabase.co
```

This means your application cannot find your Supabase project. The URL `ezancaoowipcxgxkxkis.supabase.co` doesn't exist or is incorrect.

## Quick Fix (3 Steps)

### Step 1: Verify Your Project Exists

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Log in to your account
3. Check if you see a project in the list
4. Look for a project with ID similar to `ezancaoowipcxgxkxkis`

**If project doesn't exist:**
- The project may have been deleted
- You might be logged into the wrong account
- You need to create a new project

### Step 2: Get the Correct URL

1. Click on your Supabase project
2. Go to **Settings** → **API**
3. At the top, you'll see **"Project URL"**
4. It should look like: `https://xxxxxxxxxxxxx.supabase.co`
5. **Copy this exact URL** (including `https://`)

### Step 3: Update Your `.env.local` File

1. Open `d:\work\campaignM\.env.local`
2. Find the line: `NEXT_PUBLIC_SUPABASE_URL=...`
3. Replace it with the correct URL from Step 2:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
   ```
4. **Save the file**
5. **Restart your development server**:
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

## Verify Your Configuration

Run the verification script:

```bash
npm run verify-supabase
```

This will check:
- ✅ If environment variables are set
- ✅ If URL format is correct
- ✅ If DNS can resolve the domain
- ✅ If HTTP connection works

## Common Issues

### Issue 1: URL Missing `https://`

**Wrong:**
```env
NEXT_PUBLIC_SUPABASE_URL=ezancaoowipcxgxkxkis.supabase.co
```

**Correct:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://ezancaoowipcxgxkxkis.supabase.co
```

### Issue 2: Project Doesn't Exist

**Solution:**
1. Create a new Supabase project
2. Run the schema: `supabase-schema.sql`
3. Run the RLS policies: `supabase-rls-policies.sql`
4. Get new credentials from Settings → API
5. Update `.env.local` with new credentials

### Issue 3: Project is Paused

**Solution:**
1. Go to Supabase Dashboard
2. Click on your project
3. If it shows "Paused", click "Restore" or "Resume"
4. Wait for project to become active

### Issue 4: Wrong Account

**Solution:**
1. Check if you're logged into the correct Supabase account
2. The project might be in a different organization
3. Switch to the correct account/organization

## Step-by-Step: Create New Project (If Needed)

If your project doesn't exist, create a new one:

1. **Go to Supabase Dashboard**
   - Visit [https://supabase.com/dashboard](https://supabase.com/dashboard)

2. **Create New Project**
   - Click "New Project"
   - Fill in:
     - **Name**: campaign-manager (or any name)
     - **Database Password**: Create a strong password (save it!)
     - **Region**: Choose closest to you
   - Click "Create new project"
   - Wait 1-2 minutes for setup

3. **Get Credentials**
   - Go to **Settings** → **API**
   - Copy:
     - **Project URL**: `https://xxxxx.supabase.co`
     - **anon public key**: `eyJ...`
     - **service_role key**: Click reveal, then copy

4. **Update `.env.local`**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-new-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_new_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key
   ```

5. **Run Schema**
   - Go to **SQL Editor**
   - Run `supabase-schema.sql`
   - Run `supabase-rls-policies.sql`

6. **Create Storage Bucket**
   - Go to **Storage**
   - Create bucket: `campaign-files`
   - Make it public

7. **Restart Server**
   ```bash
   npm run dev
   ```

## Still Having Issues?

1. **Check your `.env.local` file location**
   - Should be in: `d:\work\campaignM\.env.local`
   - Same folder as `package.json`

2. **Verify file format**
   - No spaces around `=`
   - No quotes around values (unless needed)
   - Correct format:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
     ```

3. **Restart everything**
   - Stop the dev server completely
   - Close and reopen terminal
   - Run `npm run dev` again

4. **Test manually**
   - Open browser
   - Go to: `https://your-project-id.supabase.co`
   - Should see Supabase API response (or 404, but connection works)

## Quick Test

Test if your URL works:

```bash
# Windows PowerShell
Test-NetConnection your-project-id.supabase.co -Port 443

# Or in browser, try:
https://your-project-id.supabase.co/rest/v1/
```

If this fails, the project doesn't exist or the URL is wrong.



