# Quick RLS Setup - 2 Steps

If you've already created your tables but RLS is disabled, follow these quick steps:

## Step 1: Run RLS Policies Script

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **"New query"**
3. Copy the entire contents of `supabase-rls-policies.sql`
4. Paste and click **"Run"**
5. You should see success messages

## Step 2: Verify RLS is Enabled

1. Go to **Table Editor** in Supabase Dashboard
2. Select the `members` table
3. Look for the **"RLS"** column
4. It should show **"enabled"** ✅

## That's It!

Your tables now have RLS enabled with policies that allow:
- ✅ API routes to work (using service_role key)
- ✅ Client-side code to work (using anon key with RLS)
- ✅ Proper security layer

## Current Setup

- **API Routes**: Use `supabaseAdmin` (service_role key) - bypasses RLS
- **Client Components**: Use `supabase` (anon key) - respects RLS
- **RLS Policies**: Allow public access (since we use custom auth)

## Need More Details?

See `RLS_SETUP_GUIDE.md` for:
- Detailed explanation of RLS
- How to customize policies
- Security best practices
- Troubleshooting





