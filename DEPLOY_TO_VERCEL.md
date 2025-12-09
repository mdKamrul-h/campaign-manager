# Deploy to Vercel - Step by Step Guide

## Quick Checklist

### ✅ Step 1: Verify GitHub Push
```bash
# Make sure your code is pushed
git status
git log --oneline -3

# If not pushed:
git add .
git commit -m "Your commit message"
git push origin main  # or master
```

### ✅ Step 2: Connect Vercel to GitHub

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Sign in with GitHub

2. **Import Project**
   - Click **Add New** → **Project**
   - Select your GitHub repository
   - Click **Import**

3. **Configure Project**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (leave as is)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

4. **Set Environment Variables**
   - Click **Environment Variables** section
   - Add all required variables (see below)
   - Make sure to select **Production**, **Preview**, and **Development**

5. **Deploy**
   - Click **Deploy**
   - Wait for build to complete

### ✅ Step 3: Required Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```bash
# REQUIRED - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# REQUIRED - App URL (IMPORTANT: Use your Vercel URL)
NEXTAUTH_URL=https://your-app-name.vercel.app

# REQUIRED - OpenAI (for AI features)
OPENAI_API_KEY=sk-your_openai_key

# REQUIRED - Email (for email campaigns)
RESEND_API_KEY=re_your_resend_key
FROM_EMAIL=your_email@domain.com
REPLY_TO_EMAIL=your_email@domain.com

# OPTIONAL - SMS
BULKSMSBD_API_KEY=your_key
SMS_SENDER_ID=Mallick NDC

# OPTIONAL - Cron Security
CRON_SECRET=your_random_secret_string
```

**⚠️ CRITICAL:** 
- Set `NEXTAUTH_URL` to your actual Vercel deployment URL
- After adding variables, you MUST redeploy

### ✅ Step 4: Verify Deployment

1. **Check Deployment Status**
   - Vercel Dashboard → Your Project → Deployments
   - Status should be ✅ **Ready**

2. **Visit Your App**
   - Click on the deployment
   - Click **Visit** or use the URL shown
   - Test login (username: `mallick99`, password: `nazrulNDC99`)

3. **Check Logs if Issues**
   - Vercel Dashboard → Your Project → Logs
   - Look for any errors

## Troubleshooting

### Issue: "Deployment not triggered"

**Solution:**
1. Check Vercel Dashboard → Settings → Git
2. Verify repository is connected
3. Check if branch matches (main/master)
4. Try manual redeploy:
   - Deployments → Click three dots → Redeploy

### Issue: "Build failed"

**Check Build Logs:**
1. Vercel Dashboard → Deployments
2. Click on failed deployment
3. Check **Build Logs** tab
4. Look for error messages

**Common Fixes:**
- Missing environment variables → Add them
- TypeScript errors → Fix in code
- Missing dependencies → Check `package.json`

### Issue: "App works but features don't"

**Check:**
1. Environment variables are set correctly
2. `NEXTAUTH_URL` matches your Vercel URL
3. Database migrations are run in Supabase
4. Check Vercel logs for API errors

## After Successful Deployment

1. **Update NEXTAUTH_URL**
   - Get your Vercel URL (e.g., `https://your-app.vercel.app`)
   - Update `NEXTAUTH_URL` environment variable in Vercel
   - Redeploy

2. **Run Database Migrations**
   - Go to Supabase SQL Editor
   - Run `supabase-schema.sql`
   - Run `supabase-templates-migration.sql`

3. **Set Up Cron Job (For Scheduled Campaigns)**
   - **If on Vercel Pro:** Configure in Vercel Dashboard → Settings → Cron Jobs
   - **If on Vercel Hobby:** Use external service (see `SETUP_CRON_HOBBY_PLAN.md`)
     - Recommended: cron-job.org (free, easy setup)
     - Alternative: GitHub Actions (already configured in `.github/workflows/cron.yml`)

4. **Test Features**
   - Login
   - Add a member
   - Create a campaign
   - Test email sending
   - Test scheduled campaigns (after setting up cron)

## Manual Deployment (Alternative)

If automatic deployment isn't working:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## Verify Everything Works

- [ ] App loads at Vercel URL
- [ ] Login works
- [ ] Can add members
- [ ] Can create campaigns
- [ ] Can send emails (if configured)
- [ ] Scheduled campaigns work (if cron is set up)

## Need More Help?

1. Check `VERCEL_DEPLOYMENT_TROUBLESHOOTING.md` for detailed troubleshooting
2. Check Vercel documentation: https://vercel.com/docs
3. Check build logs in Vercel Dashboard

