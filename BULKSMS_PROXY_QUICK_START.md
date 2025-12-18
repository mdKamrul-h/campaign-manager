# BulkSMS Proxy Quick Start Guide

**Project Name:** `bulksms_proxy`  
**Approach:** Hybrid (Main app on Vercel, SMS through Railway)

## Quick Setup (5 Steps)

### 1. Deploy to Railway

1. Go to https://railway.app
2. Click **"New Project"**
3. **Name it: `bulksms_proxy`**
4. Select **"Deploy from GitHub repo"** or **"Empty Project"**
5. Connect the `bulksms_proxy` directory

### 2. Set Environment Variables in Railway

Go to Railway service → **Variables** tab, add:

```
BULKSMSBD_API_KEY=your_api_key_here
SMS_SENDER_ID=MALLICK NDC
BULKSMSBD_API_URL=http://bulksmsbd.net/api
PORT=3001
```

### 3. Enable Static Outbound IPs

1. Go to Railway service → **Settings** → **Networking**
2. Toggle **"Enable Static IPs"** to ON
3. **Note your static IP** (e.g., `185.xxx.xxx.xxx`)

### 4. Whitelist IP in BulkSMSBD

1. Get your Railway IP:
   ```bash
   curl https://bulksms-proxy.up.railway.app/api/ip
   ```
   Or check Railway Settings → Networking

2. Log into BulkSMSBD dashboard
3. Go to **Phonebook** or **IP Whitelist**
4. Add your Railway static IP
5. Save

### 5. Configure Main App (Vercel)

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add:
   ```
   RAILWAY_SMS_SERVICE_URL=https://bulksms-proxy.up.railway.app
   ```
   (Replace with your actual Railway URL)
3. Select **Production**, **Preview**, **Development**
4. **Redeploy** Vercel app

## Done! ✅

Your SMS campaigns will now use Railway's static IP automatically!

## Testing

```bash
# Test Railway service
curl https://bulksms-proxy.up.railway.app/health

# Get IP
curl https://bulksms-proxy.up.railway.app/api/ip

# Test SMS
curl -X POST https://bulksms-proxy.up.railway.app/api/send-sms \
  -H "Content-Type: application/json" \
  -d '{"to": "8801712345678", "message": "Test"}'
```

## How It Works

```
Your App (Vercel) 
  → /api/sms/proxy (checks RAILWAY_SMS_SERVICE_URL)
  → Railway bulksms_proxy (static IP)
  → BulkSMSBD API ✅
```

## Requirements

- ✅ Railway Pro plan ($20/month) - for static outbound IPs
- ✅ BulkSMSBD API key
- ✅ Main app on Vercel (or any platform)

## Files

- `bulksms_proxy/` - Railway service directory
- `app/api/sms/proxy/route.ts` - Proxy route in main app
- `app/api/send/campaign/route.ts` - Already configured to use proxy

## Troubleshooting

**SMS not working?**
- ✅ Check Railway service is running (`/health` endpoint)
- ✅ Verify `RAILWAY_SMS_SERVICE_URL` is set in Vercel
- ✅ Confirm Railway static IP is whitelisted in BulkSMSBD
- ✅ Check Railway logs for errors

**Need help?**
- See `RAILWAY_SMS_SETUP.md` for detailed guide
- See `bulksms_proxy/README.md` for service details





