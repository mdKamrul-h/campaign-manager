# Vercel Environment Variables Setup for Railway SMS Proxy

## Required Environment Variable

Add this to your Vercel project:

### Option 1: Using SMS_PROXY_URL (Recommended)
```
SMS_PROXY_URL=https://bulksms-proxy-production.up.railway.app
```

### Option 2: Using RAILWAY_SMS_SERVICE_URL (Also supported)
```
RAILWAY_SMS_SERVICE_URL=https://bulksms-proxy-production.up.railway.app
```

## How to Add in Vercel

1. Go to **Vercel Dashboard** → Your Project
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Enter:
   - **Key**: `SMS_PROXY_URL`
   - **Value**: `https://bulksms-proxy-production.up.railway.app`
   - **Environment**: Select **Production**, **Preview**, and **Development**
5. Click **Save**
6. **Redeploy** your application

## How It Works

When `SMS_PROXY_URL` or `RAILWAY_SMS_SERVICE_URL` is set:

1. Campaign route (`app/api/send/campaign/route.ts`) detects the environment variable
2. Automatically uses `/api/sms/proxy` instead of `/api/send/sms`
3. Proxy route (`app/api/sms/proxy/route.ts`) forwards requests to Railway
4. Railway service uses static IP to call BulkSMSBD API
5. Response is returned to your app

## Testing

After setting the environment variable and redeploying:

1. Create a test SMS campaign
2. Send to a test number
3. Check logs to verify it's using Railway proxy
4. SMS should work without IP whitelist errors! ✅

## Troubleshooting

**SMS still going direct?**
- ✅ Verify environment variable is set in Vercel
- ✅ Make sure you selected all environments (Production, Preview, Development)
- ✅ Redeploy after adding the variable
- ✅ Check Vercel logs to see which endpoint is being used

**Railway connection errors?**
- ✅ Verify Railway service is running: `https://bulksms-proxy-production.up.railway.app`
- ✅ Check Railway service health: `https://bulksms-proxy-production.up.railway.app/`
- ✅ Verify Railway static IP is whitelisted in BulkSMSBD

**Need to disable Railway proxy?**
- Remove or unset `SMS_PROXY_URL` and `RAILWAY_SMS_SERVICE_URL` in Vercel
- Redeploy
- App will automatically fall back to direct BulkSMSBD API calls
