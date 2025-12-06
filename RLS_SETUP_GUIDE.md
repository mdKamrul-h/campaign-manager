# Row Level Security (RLS) Setup Guide

This guide explains how to set up Row Level Security (RLS) for your Campaign Manager application with proper security.

## Understanding RLS and API Keys

### What is Row Level Security (RLS)?

RLS is a PostgreSQL feature that allows you to control access to individual rows in a table based on policies. When RLS is enabled, even if someone has access to the table, they can only see/modify rows that match the policies.

### API Keys Explained

**1. Anon/Public Key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)**
- ✅ Safe to expose in client-side code
- ✅ Respects RLS policies
- ✅ Used for client-side operations
- ✅ Limited by RLS policies you define

**2. Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`)**
- ⚠️ **SECRET** - Never expose in client-side code
- ⚠️ Bypasses all RLS policies
- ✅ Used only in server-side API routes
- ✅ Full admin access to database

## Setup Options

You have two options for setting up security:

### Option 1: Use Service Role Key (Recommended for API Routes)

**When to use:**
- Your API routes need full access to the database
- You want to bypass RLS in server-side code
- You're building a backend API

**Setup:**
1. Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
2. Use `supabaseAdmin` in API routes
3. RLS is enabled but bypassed by service_role key
4. Client-side code uses `supabase` (anon key) which respects RLS

**Pros:**
- Simple setup
- Full control in API routes
- RLS still protects against direct database access

**Cons:**
- Service role key must be kept secret
- If exposed, provides full database access

### Option 2: Use Only Anon Key with RLS (More Secure)

**When to use:**
- You want maximum security
- You don't want to use service_role key
- You're comfortable managing RLS policies

**Setup:**
1. Don't set `SUPABASE_SERVICE_ROLE_KEY` (or remove it)
2. All code uses anon key
3. RLS policies control all access
4. API routes respect RLS policies

**Pros:**
- More secure (no admin key to protect)
- RLS policies control everything
- Better for multi-tenant applications

**Cons:**
- More complex policy management
- All operations must match RLS policies
- May need to adjust policies for your use case

## Recommended Setup (Current Implementation)

The current implementation uses **Option 1** (Service Role Key) because:

1. **API Routes** use `supabaseAdmin` (service_role key) - bypasses RLS
2. **Client Components** use `supabase` (anon key) - respects RLS
3. **RLS is enabled** on all tables for security
4. **Policies allow public access** (since we're using custom auth, not Supabase auth)

## Step-by-Step RLS Setup

### Step 1: Run the Schema

First, run the main schema to create tables:

```sql
-- Run supabase-schema.sql in Supabase SQL Editor
```

### Step 2: Enable RLS and Create Policies

Run the RLS policies script:

```sql
-- Run supabase-rls-policies.sql in Supabase SQL Editor
```

This will:
- Enable RLS on all tables
- Create policies that allow public access (since we use custom auth)
- Verify RLS is enabled

### Step 3: Verify RLS is Enabled

In Supabase Dashboard:
1. Go to **Table Editor**
2. Select any table (e.g., `members`)
3. Check the **"RLS"** column - it should show as **enabled** ✅

### Step 4: Test the Setup

1. **Test with Anon Key** (should work with RLS policies):
   ```javascript
   // This respects RLS
   const { data } = await supabase.from('members').select('*');
   ```

2. **Test with Service Role Key** (bypasses RLS):
   ```javascript
   // This bypasses RLS
   const { data } = await supabaseAdmin.from('members').select('*');
   ```

## Current RLS Policies

The current policies allow **public access** to all tables because:

1. The app uses custom authentication (not Supabase Auth)
2. API routes are protected by your custom auth middleware
3. RLS provides an additional layer of security

### Policy Structure

Each table has 4 policies:
- **SELECT**: Allow reading data
- **INSERT**: Allow creating new records
- **UPDATE**: Allow modifying records
- **DELETE**: Allow removing records

All policies use `USING (true)` which means "allow for everyone" (when using anon key).

## Customizing RLS Policies

If you want to restrict access, you can modify the policies. Examples:

### Example 1: Restrict to Authenticated Users Only

```sql
-- Only allow if user is authenticated (requires Supabase Auth)
CREATE POLICY "Allow authenticated users to read members"
ON members
FOR SELECT
USING (auth.role() = 'authenticated');
```

### Example 2: Restrict by User ID

```sql
-- Only allow users to see their own data
CREATE POLICY "Users can only see their own members"
ON members
FOR SELECT
USING (auth.uid() = user_id);
```

### Example 3: Time-based Access

```sql
-- Only allow access during business hours
CREATE POLICY "Business hours access"
ON members
FOR SELECT
USING (EXTRACT(HOUR FROM NOW()) BETWEEN 9 AND 17);
```

## Security Best Practices

### ✅ DO:

1. **Enable RLS on all tables** - Always enable RLS for production
2. **Use service_role key only in API routes** - Never in client-side code
3. **Keep service_role key secret** - Never commit to Git
4. **Test with anon key** - Verify RLS policies work correctly
5. **Review policies regularly** - Ensure they match your security requirements

### ❌ DON'T:

1. **Don't disable RLS in production** - Always keep it enabled
2. **Don't expose service_role key** - Never in client-side code
3. **Don't use `USING (true)` in production** - Unless you have other security layers
4. **Don't commit keys to Git** - Use environment variables

## Troubleshooting

### Issue: "new row violates row-level security policy"

**Solution:**
- Check your RLS policies
- Verify the policy allows the operation you're trying to perform
- If using anon key, ensure policy allows the action
- If using service_role key, it should bypass RLS (check if key is correct)

### Issue: "permission denied for table"

**Solution:**
- Verify RLS is enabled (check Table Editor)
- Check if policies exist for the operation
- Verify you're using the correct API key

### Issue: Service role key not working

**Solution:**
- Verify key is set in `.env.local`
- Restart development server after adding key
- Check key format (should start with `eyJ...`)
- Verify key is from correct Supabase project

## Migration from No RLS to RLS

If you already have tables without RLS:

1. **Backup your data** (export from Supabase)
2. **Run the RLS policies script** (`supabase-rls-policies.sql`)
3. **Test your application** - everything should work the same
4. **Verify RLS is enabled** in Table Editor

The current policies allow all operations, so your app should work exactly as before, but with RLS enabled for security.

## Next Steps

1. ✅ Run `supabase-rls-policies.sql` in Supabase SQL Editor
2. ✅ Verify RLS is enabled in Table Editor
3. ✅ Test your application
4. ✅ (Optional) Customize policies for your security needs
5. ✅ Review and tighten policies before production

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)



