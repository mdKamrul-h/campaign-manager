# Quick Vercel Deployment Fix

## Most Common Issue: Vercel Not Connected to GitHub

### Step 1: Check Connection
1. Go to https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **Git**
4. Check if repository is connected

### Step 2: Reconnect if Needed
1. If not connected or wrong repo:
   - Click **Disconnect** (if connected)
   - Click **Connect Git Repository**
   - Select your GitHub repository
   - Choose branch (usually `main` or `master`)
   - Click **Deploy**

### Step 3: Verify Auto-Deploy
- Make sure **Auto-deploy** is enabled
- Production branch should match your GitHub branch name

## If Still Not Deploying

### Manual Trigger
1. In Vercel Dashboard → Your Project
2. Click **Deployments** tab
3. Click **Redeploy** button
4. Or push an empty commit:
   ```bash
   git commit --allow-empty -m "Trigger Vercel deployment"
   git push
   ```

## Required Environment Variables

Make sure these are set in **Vercel Dashboard → Settings → Environment Variables**:

**CRITICAL (App won't work without these):**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_URL=https://your-app.vercel.app
```

**IMPORTANT (For features to work):**
```
OPENAI_API_KEY=sk-your_key
RESEND_API_KEY=re_your_key
FROM_EMAIL=your_email@domain.com
REPLY_TO_EMAIL=your_email@domain.com
```

**OPTIONAL:**
```
BULKSMSBD_API_KEY=your_key
SMS_SENDER_ID=Mallick NDC
CRON_SECRET=your_secret (for cron job security)
```

**⚠️ IMPORTANT:** 
- Set `NEXTAUTH_URL` to your actual Vercel URL (e.g., `https://your-app.vercel.app`)
- After adding/updating environment variables, you MUST redeploy

**📅 Cron Jobs (Scheduled Campaigns):**
- Vercel Hobby plan does NOT support cron jobs
- You must use an external service (see `SETUP_CRON_HOBBY_PLAN.md`)
- Quick setup: Use cron-job.org (free) or GitHub Actions (already configured)

## Check Deployment Status

1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Look for the latest deployment
3. Click on it to see:
   - Build logs
   - Runtime logs
   - Any errors

## Common Build Errors

### Error: "Module not found"
**Fix:** Make sure `package.json` and `package-lock.json` are committed to Git

### Error: "Environment variable not defined"
**Fix:** Add missing variable in Vercel Dashboard → Settings → Environment Variables

### Error: "Build timeout"
**Fix:** 
- Check build logs for slow operations
- Consider upgrading to Vercel Pro (5 min timeout vs 45 sec)

## Still Not Working?

1. **Check Vercel Status:** https://www.vercel-status.com
2. **Check Build Logs:** Vercel Dashboard → Deployments → Click deployment → View logs
3. **Verify Git Push:** Make sure your code is actually pushed to GitHub
   ```bash
   git status
   git log --oneline -5
   ```

## Quick Test

After deployment, test your app:
1. Visit your Vercel URL
2. Try to login
3. Check browser console for errors (F12)
4. Check Vercel logs for backend errors

