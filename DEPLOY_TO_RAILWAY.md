# Deploy to Railway - Complete Guide

## Quick Answer: Yes, Railway Can Solve the IP Whitelist Issue! ✅

**Important**: Railway supports **static outbound IPs** for SMS API calls, but you need the **Pro plan** ($20/month).

## Railway Plans & Static IPs

| Plan | Static Outbound IP | Cost | SMS Compatible |
|------|-------------------|------|----------------|
| **Hobby** (Free) | ❌ No | Free | ❌ No (dynamic IP) |
| **Pro** | ✅ Yes | $20/month | ✅ Yes |

## Why Railway Pro Works for SMS

- ✅ **Static Outbound IP**: Railway Pro provides a permanent static IP for outbound traffic
- ✅ **Perfect for SMS APIs**: BulkSMSBD whitelisting works with static outbound IPs
- ✅ **Easy Deployment**: Similar to Vercel - automatic deployments from GitHub
- ✅ **No Server Management**: Fully managed platform
- ✅ **Auto SSL**: Automatic HTTPS certificates

## Comparison: Railway vs Other Options

| Feature | Railway Pro | Vercel | Namecheap VPS | Contabo VPS |
|---------|-------------|--------|---------------|-------------|
| **Static IP** | ✅ Yes (Pro only) | ❌ No | ✅ Yes | ✅ Yes |
| **SMS Compatible** | ✅ Yes (Pro) | ❌ No | ✅ Yes | ✅ Yes |
| **Setup Time** | 5-10 min | 5-10 min | 30-60 min | 30-60 min |
| **Cost** | $20/month | Free/$20 | $6/month | €5/month |
| **Server Management** | None | None | You manage | You manage |
| **Auto-Deploy** | ✅ Yes | ✅ Yes | ⚠️ Manual | ⚠️ Manual |

## Step-by-Step Deployment Guide

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub (recommended)
3. Complete account setup

### Step 2: Upgrade to Pro Plan (Required for Static IP)

1. Go to **Account Settings** → **Billing**
2. Upgrade to **Pro Plan** ($20/month)
3. This enables static outbound IPs

### Step 3: Create New Project

1. Click **New Project**
2. Select **Deploy from GitHub repo**
3. Choose your repository: `mdKamrul-h/campaign-manager`
4. Railway will automatically detect it's a Next.js app

### Step 4: Configure Build Settings

Railway usually auto-detects Next.js, but verify:

1. Go to your service → **Settings** → **Build**
2. Verify:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Root Directory**: `./` (or leave empty)

### Step 5: Enable Static Outbound IP

**This is the key step for SMS!**

1. Go to your service → **Settings** → **Networking**
2. Find **Static Outbound IPs** section
3. Toggle **Enable Static IPs** to ON
4. Railway will assign a permanent static IP for outbound traffic
5. **Note the IP address** - you'll whitelist this in BulkSMSBD!

### Step 6: Set Environment Variables

Go to your service → **Variables** tab and add:

```bash
# REQUIRED - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# REQUIRED - App URL (IMPORTANT: Use your Railway URL)
NEXTAUTH_URL=https://your-app.up.railway.app
# Or if using custom domain: https://your-domain.com

# REQUIRED - OpenAI (for AI features)
OPENAI_API_KEY=sk-your_openai_key

# REQUIRED - Email (for email campaigns)
RESEND_API_KEY=re_your_resend_key
FROM_EMAIL=Mallick NDC99 Ballot 7 <vote@mallicknazrul.com>
REPLY_TO_EMAIL=vote@mallicknazrul.com

# REQUIRED - SMS (for SMS campaigns)
BULKSMSBD_API_KEY=your_key
SMS_SENDER_ID=MALLICK NDC
BULKSMSBD_API_URL=http://bulksmsbd.net/api

# OPTIONAL - Social Media
FACEBOOK_APP_ID=your_id
FACEBOOK_APP_SECRET=your_secret
LINKEDIN_CLIENT_ID=your_id
LINKEDIN_CLIENT_SECRET=your_secret
```

**Important Notes:**
- Railway automatically provides a URL like `your-app.up.railway.app`
- Set `NEXTAUTH_URL` to your Railway URL (or custom domain if configured)
- After adding variables, Railway will automatically redeploy

### Step 7: Deploy

1. Railway will automatically deploy when you:
   - Push to GitHub (if connected)
   - Add environment variables
   - Enable static IPs

2. Watch the deployment logs:
   - Go to **Deployments** tab
   - Click on the latest deployment
   - Monitor build progress

3. Wait for deployment to complete (usually 2-5 minutes)

### Step 8: Get Your Static Outbound IP

After enabling static IPs and deploying:

1. Go to **Settings** → **Networking**
2. Find **Static Outbound IPs** section
3. Your static IP will be displayed (e.g., `185.xxx.xxx.xxx`)
4. **Copy this IP** - you'll need it for BulkSMSBD whitelisting

**Alternative method to get your IP:**
```bash
# Railway provides a way to check your outbound IP
# You can also create a test endpoint in your app:
# GET /api/check-ip
# That makes an outbound request and shows the IP
```

### Step 9: Whitelist IP in BulkSMSBD

1. **Log into BulkSMSBD dashboard**
2. Go to **Phonebook** or **IP Whitelist** section
3. Add your Railway static IP (from Step 8)
4. Save

### Step 10: Test SMS Sending

1. Go to your deployed app
2. Create a test SMS campaign
3. Send to a test number
4. Should work without IP whitelist errors! ✅

### Step 11: Configure Custom Domain (Optional)

1. Go to **Settings** → **Networking** → **Custom Domain**
2. Add your domain (e.g., `campaignm.mallicknazrul.com`)
3. Railway will provide DNS records to add:
   - Type: `CNAME`
   - Name: `@` or subdomain
   - Value: Railway-provided CNAME
4. Add DNS records at your domain registrar
5. Wait for DNS propagation (up to 48 hours)
6. Railway will automatically provision SSL certificate

### Step 12: Update NEXTAUTH_URL

If you added a custom domain:

1. Update `NEXTAUTH_URL` environment variable:
   ```
   NEXTAUTH_URL=https://your-domain.com
   ```
2. Railway will automatically redeploy

## Managing Your Railway Deployment

### View Logs
- Go to **Deployments** → Click on deployment → View logs
- Or use Railway CLI: `railway logs`

### Restart Service
- Go to **Settings** → **General** → Click **Restart**

### Update Application
- Just push to GitHub - Railway auto-deploys!
- Or manually trigger: **Deployments** → **Redeploy**

### Check Static IP
- Go to **Settings** → **Networking** → **Static Outbound IPs**
- Your IP is displayed there

## Railway CLI (Optional)

Install Railway CLI for advanced management:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# View logs
railway logs

# Open shell
railway shell

# Set environment variables
railway variables set KEY=value
```

## Important Notes About Railway Static IPs

### Outbound Traffic Only
- ✅ Static IP works for **outbound** API calls (SMS, Email, etc.)
- ❌ Cannot use for **inbound** traffic (your app URL)
- ✅ Perfect for BulkSMSBD API calls!

### Shared IPs
- The static IP may be shared with other Railway Pro customers
- This is usually fine for IP whitelisting
- If you need a dedicated IP, contact Railway support

### Region-Specific
- Static IP is tied to your deployment region
- If you change regions, IP will change
- Choose a region and stick with it

### IP Persistence
- IP remains static as long as:
  - You stay on Pro plan
  - You don't change regions
  - Service remains active

## Cost Breakdown

**Railway Pro Plan:**
- **Base Cost**: $20/month
- **Includes**: 
  - Static outbound IP ✅
  - Unlimited deployments
  - Custom domains
  - Auto SSL
  - Team collaboration

**Comparison:**
- Railway Pro: $20/month (static IP included)
- Vercel Pro: $20/month (no static IP)
- Namecheap VPS: $6/month (static IP included)
- Contabo VPS: €5/month (~$5.50) (static IP included)

## Troubleshooting

### Static IP Not Showing
- ✅ Make sure you're on **Pro plan**
- ✅ Enable static IPs in **Settings** → **Networking**
- ✅ Redeploy after enabling

### SMS Still Failing
1. Verify static IP is enabled and deployed
2. Check your static IP in Railway settings
3. Confirm IP is whitelisted in BulkSMSBD
4. Check SMS API logs in Railway deployment logs

### Build Failures
- Check deployment logs for errors
- Verify all environment variables are set
- Ensure `package.json` has correct build scripts

### Environment Variables Not Working
- Make sure variables are set for the correct environment
- Redeploy after adding/updating variables
- Check variable names match exactly (case-sensitive)

## Benefits of Railway for SMS Campaigns

✅ **Static Outbound IP**: Solves BulkSMSBD whitelist issue
✅ **Easy Deployment**: Automatic from GitHub
✅ **No Server Management**: Fully managed platform
✅ **Auto SSL**: Automatic HTTPS certificates
✅ **Auto-Deploy**: Deploys on every git push
✅ **Simple Setup**: Much easier than VPS

## When to Use Railway

**Use Railway Pro If:**
- ✅ You want easy deployment (like Vercel)
- ✅ You need static IP for SMS
- ✅ You don't want to manage servers
- ✅ $20/month is acceptable
- ✅ You want automatic deployments

**Use VPS (Namecheap/Contabo) If:**
- ✅ You want cheaper option ($5-6/month)
- ✅ You're comfortable with server management
- ✅ You want full control
- ✅ You don't mind manual deployments

## Next Steps

1. ✅ Sign up for Railway
2. ✅ Upgrade to Pro plan ($20/month)
3. ✅ Deploy your Next.js app
4. ✅ Enable static outbound IPs
5. ✅ Get your static IP from Railway
6. ✅ Whitelist IP in BulkSMSBD
7. ✅ Test SMS - should work! 🎉

## Summary

**Railway Pro is perfect for SMS campaigns** because:
- ✅ Provides static outbound IP (solves whitelist issue)
- ✅ Easy deployment (automatic from GitHub)
- ✅ No server management needed
- ✅ Similar to Vercel but with static IP support

The only requirement is the **Pro plan ($20/month)**, but you get:
- Static outbound IP for SMS
- Automatic deployments
- Zero server management
- Auto SSL certificates

Your SMS campaigns will work reliably with Railway Pro! 🚀




