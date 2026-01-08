# Vercel Deployment Checklist - Railway SMS Proxy

**Railway Service URL:** `bulksms-proxy-production.up.railway.app`

## ✅ Pre-Deployment Checklist

### 1. Railway Service Status
- [ ] Railway service is deployed and running
- [ ] Service is accessible at: `https://bulksms-proxy-production.up.railway.app`
- [ ] Health check works: `curl https://bulksms-proxy-production.up.railway.app`
- [ ] Static outbound IP is enabled in Railway
- [ ] IP is whitelisted in BulkSMSBD

### 2. Code Status
- [x] `app/api/sms/proxy/route.ts` - Updated to use Railway format
- [x] `app/api/send/campaign/route.ts` - Updated to handle Railway responses
- [x] Both files support `SMS_PROXY_URL` environment variable

## 🚀 Vercel Deployment Steps

### Step 1: Add Environment Variable in Vercel

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Select your project

2. **Navigate to Environment Variables**
   - Click **Settings** → **Environment Variables**

3. **Add New Variable**
   - Click **Add New**
   - **Key:** `SMS_PROXY_URL`
   - **Value:** `https://bulksms-proxy-production.up.railway.app`
   - ⚠️ **IMPORTANT:** Make sure to include `https://` at the beginning!
   - **Environment:** Select all (Production, Preview, Development)
   - Click **Save**
   
   **Note:** The code will automatically add `https://` if missing, but it's better to include it explicitly.

### Step 2: Verify Existing Environment Variables

Make sure these are also set (if not already):

```
NEXTAUTH_URL=https://your-vercel-app.vercel.app
BULKSMSBD_API_KEY=your_key (optional - Railway handles this)
SMS_SENDER_ID=MALLICK NDC (optional - Railway handles this)
```

**Note:** The `BULKSMSBD_API_KEY` and `SMS_SENDER_ID` are now handled by Railway, but you can keep them for fallback if needed.

### Step 3: Redeploy Vercel App

1. **Trigger Redeploy**
   - Go to **Deployments** tab
   - Click **Redeploy** on the latest deployment
   - Or push a new commit to trigger auto-deploy

2. **Wait for Deployment**
   - Monitor the build logs
   - Ensure deployment completes successfully

### Step 4: Test SMS Sending

1. **Test from Campaign Page**
   - Go to your deployed Vercel app
   - Navigate to Campaigns page
   - Create a test SMS campaign
   - Send to a test number
   - Should work without IP whitelist errors! ✅

2. **Check Logs**
   - If issues occur, check Vercel function logs
   - Check Railway service logs
   - Verify `SMS_PROXY_URL` is set correctly

## 🔍 Verification Steps

### Test Railway Service Directly

```bash
# Health check
curl https://bulksms-proxy-production.up.railway.app

# Expected response:
# { "status": "running", "service": "BulkSMSBD Proxy" }

# Test SMS (replace with your test number)
curl -X POST https://bulksms-proxy-production.up.railway.app/api/send-sms \
  -H "Content-Type: application/json" \
  -d '{"number":"8801712345678","message":"Test from Railway"}'

# Expected response:
# { "success": true, "code": "202", "message": "SMS Submitted Successfully", ... }
```

### Test from Vercel App

```bash
# Test via your Vercel app's proxy route
curl -X POST https://your-vercel-app.vercel.app/api/sms/proxy \
  -H "Content-Type: application/json" \
  -d '{"to":"8801712345678","message":"Test from Vercel"}'

# Expected response:
# { "success": true, "statusCode": 202, "message": "SMS Submitted Successfully", ... }
```

## 📋 Environment Variables Summary

### Required in Vercel:
```
SMS_PROXY_URL=https://bulksms-proxy-production.up.railway.app
NEXTAUTH_URL=https://your-vercel-app.vercel.app
```

### Optional (for fallback):
```
BULKSMSBD_API_KEY=your_key
SMS_SENDER_ID=MALLICK NDC
```

### Already Set in Railway:
```
BULKSMS_API_KEY=your_key
BULKSMS_SENDER_ID=MALLICK NDC
```

## 🐛 Troubleshooting

### SMS Not Sending

1. **Check Environment Variable**
   - Verify `SMS_PROXY_URL` is set in Vercel
   - Check it matches: `https://bulksms-proxy-production.up.railway.app`
   - Ensure it's set for the correct environment (Production/Preview/Development)

2. **Check Railway Service**
   - Verify Railway service is running
   - Check Railway logs for errors
   - Test Railway service directly (see verification steps above)

3. **Check Vercel Logs**
   - Go to Vercel Dashboard → Your Project → Functions
   - Check `/api/sms/proxy` function logs
   - Look for connection errors or timeout issues

4. **Check IP Whitelisting**
   - Verify Railway static IP is whitelisted in BulkSMSBD
   - Test Railway service directly to confirm IP is working

### Common Errors

**Error: "Railway SMS service URL not configured"**
- ✅ Solution: Set `SMS_PROXY_URL` in Vercel environment variables

**Error: "Cannot connect to Railway SMS service"**
- ✅ Solution: Check Railway service is running and accessible
- ✅ Solution: Verify Railway URL is correct (no typos)

**Error: "IP Not whitelisted (Error 1032)"**
- ✅ Solution: Whitelist Railway static IP in BulkSMSBD
- ✅ Solution: Wait for BulkSMSBD to process whitelist request

**Error: "Request timeout"**
- ✅ Solution: Check Railway service logs for issues
- ✅ Solution: Verify Railway service is not overloaded

## ✅ Success Indicators

When everything is working correctly:

- ✅ SMS campaigns send successfully from Vercel app
- ✅ No IP whitelist errors (Error 1032)
- ✅ Railway service responds to health checks
- ✅ Vercel function logs show successful proxy requests
- ✅ SMS delivery confirmed in BulkSMSBD dashboard

## 📝 Quick Reference

**Railway Service:** `bulksms-proxy-production.up.railway.app`  
**Vercel Env Var:** `SMS_PROXY_URL=https://bulksms-proxy-production.up.railway.app`  
**Proxy Route:** `/api/sms/proxy`  
**Campaign Route:** Automatically uses proxy if `SMS_PROXY_URL` is set

## 🎉 You're All Set!

Once you've:
1. ✅ Set `SMS_PROXY_URL` in Vercel
2. ✅ Redeployed Vercel app
3. ✅ Verified Railway service is running
4. ✅ Confirmed IP is whitelisted

Your SMS campaigns will automatically use Railway's static IP! 🚀











