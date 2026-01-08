# Vercel Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. Vercel Not Detecting GitHub Pushes

**Problem:** You push to GitHub but Vercel doesn't trigger a deployment.

**Solutions:**

#### Check Vercel-GitHub Connection
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Git**
4. Verify:
   - ✅ Repository is connected
   - ✅ Production branch is set (usually `main` or `master`)
   - ✅ Auto-deploy is enabled

#### Reconnect Repository
1. In Vercel Dashboard → Settings → Git
2. Click **Disconnect** (if connected)
3. Click **Connect Git Repository**
4. Select your GitHub repository
5. Choose the correct branch

#### Check GitHub Webhook
1. Go to your GitHub repository
2. Settings → Webhooks
3. Verify there's a webhook for Vercel
4. If missing, Vercel will create it when you reconnect

### 2. Build Failures

**Problem:** Deployment fails during build.

**Check Build Logs:**
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the failed deployment
3. Check the build logs for errors

**Common Build Errors:**

#### Missing Environment Variables
```
Error: NEXT_PUBLIC_SUPABASE_URL is not defined
```

**Solution:** Add all required environment variables in Vercel:
1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all variables from your `.env.local` file
3. Make sure to set them for **Production**, **Preview**, and **Development**

**Required Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
RESEND_API_KEY
FROM_EMAIL
REPLY_TO_EMAIL
NEXTAUTH_URL
BULKSMSBD_API_KEY (optional)
SMS_SENDER_ID (optional)
CRON_SECRET (optional, for cron job security)
```

#### TypeScript Errors
If you see TypeScript errors in build logs:
1. Run `npm run build` locally to check for errors
2. Fix any TypeScript errors
3. Commit and push again

#### Missing Dependencies
If build fails with "module not found":
1. Make sure `package.json` is committed
2. Make sure `package-lock.json` is committed
3. Vercel will run `npm install` automatically

### 3. Database Migration Not Run

**Problem:** App deploys but doesn't work because database tables are missing.

**Solution:** Run the SQL migrations in Supabase:
1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase-schema.sql`
3. Run `supabase-templates-migration.sql` (for templates feature)
4. Run `SUPABASE_FIXES.sql` if needed

### 4. Cron Job Not Working

**Problem:** Scheduled campaigns not executing.

**Important:** Vercel Hobby plan does NOT support built-in cron jobs. You must use an external service.

**Solutions for Hobby Plan:**

1. **cron-job.org (Recommended - Free)**
   - Sign up at https://cron-job.org
   - Create cron job pointing to: `https://your-app.vercel.app/api/cron/execute-scheduled-campaigns`
   - Schedule: Every minute
   - See `SETUP_CRON_HOBBY_PLAN.md` for detailed instructions

2. **GitHub Actions (Free, Unlimited)**
   - The file `.github/workflows/cron.yml` is already created
   - Set GitHub secrets: `VERCEL_URL` and optionally `CRON_SECRET`
   - Actions will run automatically every minute

3. **Other Services:**
   - EasyCron: https://www.easycron.com
   - Uptime Robot: https://uptimerobot.com

**For Vercel Pro Plan:**
- Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
- Add cron job with path: `/api/cron/execute-scheduled-campaigns`
- Schedule: `* * * * *` (every minute)

### 5. Manual Deployment Trigger

If automatic deployment isn't working:

1. **Via Vercel Dashboard:**
   - Go to Vercel Dashboard → Your Project
   - Click **Deployments** tab
   - Click **Redeploy** on the latest deployment

2. **Via Vercel CLI:**
   ```bash
   npm i -g vercel
   vercel login
   vercel --prod
   ```

### 6. Check Deployment Status

1. Go to Vercel Dashboard → Your Project → Deployments
2. Check the status:
   - ✅ **Ready** - Deployment successful
   - ⏳ **Building** - Currently building
   - ❌ **Error** - Check logs
   - ⚠️ **Canceled** - Deployment was canceled

### 7. Environment Variables Not Updating

**Problem:** Changed environment variables but changes not reflected.

**Solution:**
1. Update environment variables in Vercel Dashboard
2. **Redeploy** the project (environment variables are only loaded at build time)
3. Go to Deployments → Click three dots → **Redeploy**

### 8. Build Timeout

**Problem:** Build takes too long and times out.

**Solution:**
- Vercel Hobby plan: 45 seconds build timeout
- Vercel Pro plan: 5 minutes build timeout
- Check build logs for slow operations
- Optimize build process if needed

## Step-by-Step Deployment Checklist

### Pre-Deployment
- [ ] Code is pushed to GitHub
- [ ] All environment variables are set in Vercel
- [ ] Database migrations are run in Supabase
- [ ] `vercel.json` is committed
- [ ] `package.json` is committed

### Vercel Setup
- [ ] Project is connected to GitHub repository
- [ ] Production branch is set correctly
- [ ] Auto-deploy is enabled
- [ ] All environment variables are added
- [ ] Cron job is configured (if using Pro plan)

### Post-Deployment
- [ ] Check deployment status in Vercel Dashboard
- [ ] Visit your deployed URL
- [ ] Test login functionality
- [ ] Test a basic feature (add member, create campaign)
- [ ] Check Vercel logs for any runtime errors

## Quick Fix Commands

### Force Redeploy
```bash
# Via CLI
vercel --prod

# Or trigger via GitHub
git commit --allow-empty -m "Trigger deployment"
git push
```

### Check Build Locally
```bash
npm run build
```

### Check for TypeScript Errors
```bash
npx tsc --noEmit
```

## Still Not Working?

1. **Check Vercel Status:** https://www.vercel-status.com
2. **Check Build Logs:** Vercel Dashboard → Deployments → Click failed deployment
3. **Check Runtime Logs:** Vercel Dashboard → Your Project → Logs
4. **Contact Support:** If issue persists, check Vercel documentation or support

## Important Notes

- **Environment Variables:** Must be set in Vercel Dashboard, not just in `.env.local`
- **NEXTAUTH_URL:** Must be set to your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
- **Database:** Make sure Supabase project is active (not paused)
- **Cron Jobs:** Only work on Vercel Pro plan, use external service for Hobby plan













