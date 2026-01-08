# Railway SMS Setup Guide

This guide explains how to set up SMS sending through Railway's static outbound IP to solve BulkSMSBD IP whitelisting issues.

## Two Approaches

### Option 1: Deploy Entire App to Railway (Recommended)

**Simplest approach** - Deploy your entire Next.js app to Railway Pro:

1. **Deploy to Railway Pro** (see `DEPLOY_TO_RAILWAY.md`)
2. **Enable static outbound IPs** in Railway settings
3. **Whitelist Railway IP** in BulkSMSBD
4. **Done!** Your existing SMS routes will automatically use Railway's static IP

**Pros:**
- ✅ Simplest setup
- ✅ No code changes needed
- ✅ All API calls use static IP

**Cons:**
- ⚠️ Requires Railway Pro ($20/month)
- ⚠️ Need to migrate entire app from Vercel

### Option 2: Proxy SMS Through Railway (Hybrid) ✅ **RECOMMENDED**

**Keep main app on Vercel, route SMS through Railway:**

1. **Deploy SMS proxy service to Railway** (project name: `bulksms_proxy`)
2. **Enable static outbound IPs** in Railway
3. **Whitelist Railway IP** in BulkSMSBD
4. **Configure main app** to use Railway proxy

**Pros:**
- ✅ Keep main app on Vercel (free)
- ✅ Only SMS goes through Railway
- ✅ No code changes needed (already configured)
- ✅ Simple setup

**Cons:**
- ⚠️ Requires Railway Pro ($20/month) for SMS service
- ⚠️ Two services to manage

## Quick Start: Option 2 (Hybrid Approach)

### Step 1: Deploy SMS Proxy to Railway

1. **Create Railway project**
   - Go to https://railway.app
   - Click "New Project"
   - **Name it: `bulksms_proxy`**
   - Select "Deploy from GitHub repo" or "Empty Project"

2. **Connect the `bulksms_proxy` directory**
   - If using GitHub: Push the `bulksms_proxy` directory to a repo
   - If using Railway CLI: 
     ```bash
     cd bulksms_proxy
     railway link
     ```

3. **Set Environment Variables in Railway:**
   ```
   BULKSMSBD_API_KEY=your_api_key_here
   SMS_SENDER_ID=MALLICK NDC
   BULKSMSBD_API_URL=http://bulksmsbd.net/api
   PORT=3001
   ```

4. **Enable Static Outbound IPs:**
   - Go to Railway service → **Settings** → **Networking**
   - Toggle **"Enable Static IPs"** to ON
   - **Note your static IP** (e.g., `185.xxx.xxx.xxx`)

5. **Deploy:**
   - Railway will auto-detect Node.js and deploy
   - Wait for deployment to complete
   - Get your service URL (e.g., `https://bulksms-proxy.up.railway.app`)

### Step 2: Whitelist Railway IP in BulkSMSBD

1. **Get your Railway static IP:**
   ```bash
   curl https://bulksms-proxy.up.railway.app/api/ip
   ```
   Or check Railway Settings → Networking → Static Outbound IPs
   
   **Note:** Replace `bulksms-proxy.up.railway.app` with your actual Railway service URL.

2. **Whitelist in BulkSMSBD:**
   - Log into BulkSMSBD dashboard
   - Go to **Phonebook** or **IP Whitelist**
   - Add your Railway static IP
   - Save

### Step 3: Configure Main App (Vercel)

1. **Add Environment Variable in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add new variable:
     ```
     RAILWAY_SMS_SERVICE_URL=https://bulksms-proxy.up.railway.app
     ```
   - **Replace** `bulksms-proxy.up.railway.app` with your actual Railway service URL
   - Select **Production**, **Preview**, and **Development** environments
   - Save

2. **Redeploy Vercel app** after adding the variable
   - The main app is already configured to use the proxy if `RAILWAY_SMS_SERVICE_URL` is set
   - No code changes needed!

### Step 4: Test

1. **Test Railway service:**
   ```bash
   # Health check
   curl https://bulksms-proxy.up.railway.app/health
   
   # Get IP
   curl https://bulksms-proxy.up.railway.app/api/ip
   
   # Test SMS
   curl -X POST https://bulksms-proxy.up.railway.app/api/send-sms \
     -H "Content-Type: application/json" \
     -d '{
       "to": "8801712345678",
       "message": "Test from Railway"
     }'
   ```
   
   **Note:** Replace `bulksms-proxy.up.railway.app` with your actual Railway service URL.

2. **Test from main app:**
   - Create a test SMS campaign
   - Send to a test number
   - Should work without IP whitelist errors! ✅

## How It Works

### Without Railway Proxy (Current - Vercel)
```
Your App (Vercel) → BulkSMSBD API
❌ Dynamic IP → IP whitelist error
```

### With Railway Proxy
```
Your App (Vercel) → Railway SMS Service (Static IP) → BulkSMSBD API
✅ Static IP → Works!
```

### Code Flow

1. **Campaign sends SMS:**
   - `app/api/send/campaign/route.ts` calls SMS endpoint
   - Checks for `RAILWAY_SMS_SERVICE_URL` environment variable
   - If set: Uses `/api/sms/proxy` (proxies to Railway)
   - If not set: Uses `/api/send/sms` (direct to BulkSMSBD)

2. **Proxy route:**
   - `app/api/sms/proxy/route.ts` receives request
   - Forwards to Railway SMS service
   - Returns Railway's response

3. **Railway SMS service:**
   - `bulksms_proxy/server.js` receives request
   - Uses Railway's static outbound IP
   - Calls BulkSMSBD API
   - Returns result

## Files Created

1. **`app/api/sms/proxy/route.ts`**
   - Proxy route in main app
   - Forwards SMS requests to Railway service

2. **`bulksms_proxy/server.js`**
   - Express.js service for Railway
   - Handles SMS sending with static IP
   - Project name: `bulksms_proxy`

3. **`bulksms_proxy/package.json`**
   - Dependencies for Railway service

4. **`bulksms_proxy/README.md`**
   - Detailed setup instructions

## Environment Variables

### Main App (Vercel)
```
RAILWAY_SMS_SERVICE_URL=https://bulksms-proxy.up.railway.app
```

**Note:** Replace `bulksms-proxy.up.railway.app` with your actual Railway service URL.

### Railway SMS Service
```
BULKSMSBD_API_KEY=your_api_key
SMS_SENDER_ID=MALLICK NDC
BULKSMSBD_API_URL=http://bulksmsbd.net/api
PORT=3001
```

## Troubleshooting

### Railway Service Not Responding
- ✅ Check Railway service is deployed and running
- ✅ Verify service URL is correct
- ✅ Check Railway logs for errors
- ✅ Test `/health` endpoint

### SMS Still Failing
- ✅ Verify Railway static IP is enabled
- ✅ Confirm IP is whitelisted in BulkSMSBD
- ✅ Check `RAILWAY_SMS_SERVICE_URL` is set correctly
- ✅ Test Railway service directly with `/api/send-sms`

### Proxy Errors
- ✅ Check `RAILWAY_SMS_SERVICE_URL` environment variable
- ✅ Verify Railway service is accessible
- ✅ Check network connectivity
- ✅ Review Railway service logs

## Cost Comparison

| Approach | Main App | SMS Service | Total/Month |
|----------|----------|-------------|-------------|
| **Option 1: Full Railway** | Railway Pro $20 | Included | $20 |
| **Option 2: Hybrid** | Vercel Free | Railway Pro $20 | $20 |
| **VPS Alternative** | Contabo €5 | Included | ~$5.50 |

## Recommendation

- **If you want easiest setup**: Use Option 1 (deploy entire app to Railway)
- **If you want to keep Vercel**: Use Option 2 (hybrid with Railway proxy)
- **If you want cheapest**: Use Contabo/Namecheap VPS ($5-6/month)

## Next Steps (Hybrid Approach - Option 2)

1. ✅ **Deploy `bulksms_proxy` to Railway**
   - Create Railway project named `bulksms_proxy`
   - Connect the `bulksms_proxy` directory
   - Set environment variables
   - Enable static outbound IPs

2. ✅ **Whitelist Railway IP in BulkSMSBD**
   - Get IP from `/api/ip` endpoint
   - Add to BulkSMSBD whitelist

3. ✅ **Configure main app (Vercel)**
   - Set `RAILWAY_SMS_SERVICE_URL` environment variable
   - Redeploy Vercel app

4. ✅ **Test SMS sending**
   - Create test SMS campaign
   - Should work without IP whitelist errors! 🎉

**That's it!** The main app is already configured to use the Railway proxy automatically when `RAILWAY_SMS_SERVICE_URL` is set.











