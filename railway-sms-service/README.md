# Railway SMS Proxy Service

A simple Express.js service that proxies SMS requests through Railway's static outbound IP for BulkSMSBD whitelisting.

## Why This Service?

- **Static IP**: Railway Pro provides a static outbound IP that can be whitelisted in BulkSMSBD
- **Separation**: Keep your main app on Vercel, route SMS through Railway
- **Reliability**: SMS requests use Railway's static IP, avoiding IP whitelist errors

## Quick Setup

### 1. Deploy to Railway

1. **Create new Railway project**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo" or "Empty Project"

2. **Connect this directory**
   - If using GitHub: Push this `railway-sms-service` directory to a repo
   - If using Railway CLI: `railway link` in this directory

3. **Set Environment Variables in Railway**
   ```
   BULKSMSBD_API_KEY=your_api_key
   SMS_SENDER_ID=MALLICK NDC
   BULKSMSBD_API_URL=http://bulksmsbd.net/api
   PORT=3001
   ```

4. **Enable Static Outbound IPs**
   - Go to your Railway service → Settings → Networking
   - Toggle "Enable Static IPs" to ON
   - Note your static IP address

5. **Deploy**
   - Railway will automatically detect Node.js and deploy
   - Wait for deployment to complete

6. **Get Your Service URL**
   - Railway provides a URL like: `https://your-service.up.railway.app`
   - Copy this URL

### 2. Whitelist Railway IP in BulkSMSBD

1. **Get your Railway static IP**
   - Visit: `https://your-service.up.railway.app/api/ip`
   - Or check Railway Settings → Networking → Static Outbound IPs

2. **Whitelist in BulkSMSBD**
   - Log into BulkSMSBD dashboard
   - Go to Phonebook or IP Whitelist
   - Add your Railway static IP
   - Save

### 3. Configure Main App

In your main app (Vercel or wherever), set environment variable:

```
RAILWAY_SMS_SERVICE_URL=https://your-service.up.railway.app
```

### 4. Update Main App to Use Proxy

Option A: Update existing SMS route to use proxy
- Modify `app/api/send/sms/route.ts` to check for `RAILWAY_SMS_SERVICE_URL`
- If set, proxy to Railway instead of direct BulkSMSBD

Option B: Use the proxy route
- Use `app/api/sms/proxy/route.ts` in your main app
- Update campaign sending to use `/api/sms/proxy` instead of `/api/send/sms`

## API Endpoints

### POST /api/send-sms
Send SMS through Railway's static IP.

**Request:**
```json
{
  "to": "8801712345678",
  "message": "Your SMS message here",
  "senderId": "MALLICK NDC" // optional
}
```

**Bulk SMS:**
```json
{
  "numbers": [
    { "number": "8801712345678", "message": "Message 1" },
    { "number": "8801812345678", "message": "Message 2" }
  ],
  "senderId": "MALLICK NDC" // optional
}
```

**Response:**
```json
{
  "success": true,
  "status": "sent",
  "statusCode": 202,
  "to": "8801712345678",
  "senderId": "MALLICK NDC"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "Railway SMS Proxy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "hasApiKey": true,
  "senderId": "MALLICK NDC"
}
```

### GET /api/ip
Get current outbound IP address (for whitelisting).

**Response:**
```json
{
  "success": true,
  "ip": "185.xxx.xxx.xxx",
  "message": "This is your Railway static outbound IP. Whitelist this in BulkSMSBD."
}
```

## Testing

1. **Test health endpoint:**
   ```bash
   curl https://your-service.up.railway.app/health
   ```

2. **Test IP endpoint:**
   ```bash
   curl https://your-service.up.railway.app/api/ip
   ```

3. **Test SMS sending:**
   ```bash
   curl -X POST https://your-service.up.railway.app/api/send-sms \
     -H "Content-Type: application/json" \
     -d '{
       "to": "8801712345678",
       "message": "Test SMS from Railway"
     }'
   ```

## Cost

- **Railway Pro**: $20/month (required for static outbound IPs)
- **Alternative**: Use Contabo/Namecheap VPS ($5-6/month) if you want cheaper option

## Troubleshooting

### Static IP Not Working
- ✅ Make sure you're on Railway Pro plan
- ✅ Enable static IPs in Settings → Networking
- ✅ Redeploy after enabling static IPs
- ✅ Check IP in `/api/ip` endpoint

### SMS Still Failing
- Check Railway service logs
- Verify BulkSMSBD API key is correct
- Confirm IP is whitelisted in BulkSMSBD
- Test with `/api/ip` to get current IP

### Connection Errors
- Verify `RAILWAY_SMS_SERVICE_URL` is set correctly in main app
- Check Railway service is running (use `/health` endpoint)
- Ensure Railway service is accessible

## Files

- `server.js` - Main Express server
- `package.json` - Dependencies
- `README.md` - This file

## Next Steps

1. Deploy to Railway
2. Enable static outbound IPs
3. Whitelist IP in BulkSMSBD
4. Set `RAILWAY_SMS_SERVICE_URL` in main app
5. Update main app to use proxy route
6. Test SMS sending!








