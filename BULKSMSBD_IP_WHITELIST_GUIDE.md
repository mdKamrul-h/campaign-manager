# BulkSMSBD IP Whitelist Guide

## Problem: IP Not Whitelisted (Error 1032)

When sending SMS campaigns, you may encounter this error:
```
Error 1032: Your ip 44.213.71.180 not Whitelisted. Please whitelist ip from Phonebook
```

## Understanding the Issue

### Your Current IP Address
The error message shows your current IP address that needs to be whitelisted:
- **Current IP**: `44.213.71.180` (from the error message)
- This is the IP address of your Vercel serverless function

### The Challenge with Vercel

**Important**: Vercel uses **dynamic IP addresses** that change with each deployment and can vary between function invocations. This means:

1. ❌ **Whitelisting a single IP won't work reliably** - Your IP will change
2. ✅ **You need to whitelist Vercel's IP ranges** or contact BulkSMSBD support

## Solutions

### Option 1: Contact BulkSMSBD Support (Recommended)

Contact BulkSMSBD support and ask them to:
1. Whitelist **all Vercel IP ranges** (they may have a list)
2. Or whitelist your entire Vercel deployment region
3. Or provide a way to whitelist dynamic IPs

**Contact Information:**
- BulkSMSBD Support: Check their website or dashboard for support contact
- Explain that you're using Vercel serverless functions with dynamic IPs

### Option 2: Find Your Current IP

To find your current IP address:

1. **From the Error Message** (Easiest):
   - The error message shows: `Your ip 44.213.71.180 not Whitelisted`
   - This is your current IP: **44.213.71.180**

2. **From Vercel Logs**:
   - Go to Vercel Dashboard → Your Project → Logs
   - Look for the error message - it will show the IP

3. **Using a Diagnostic Endpoint**:
   - Visit: `https://campaignm.mallicknazrul.com/api/check-sms-config`
   - Check the response for IP information (if we add it)

### Option 3: Whitelist Current IP (Temporary Fix)

If you need a quick temporary fix:

1. Log into BulkSMSBD dashboard
2. Go to Phonebook or IP Whitelist settings
3. Add the IP: `44.213.71.180`
4. **Note**: This will only work until Vercel changes your IP

### Option 4: Use a Proxy/Static IP Service

If BulkSMSBD requires static IPs:

1. Use a service that provides static IPs for API calls
2. Route SMS API calls through that service
3. Whitelist the static IP in BulkSMSBD

## How to Whitelist IP in BulkSMSBD

Based on the error message mentioning "Phonebook":

1. **Log into BulkSMSBD Dashboard**
2. **Navigate to**: Phonebook or IP Whitelist section
3. **Add IP Address**: Enter `44.213.71.180`
4. **Save** the changes

**Note**: The exact location may vary. Look for:
- "IP Whitelist"
- "Phonebook"
- "Security Settings"
- "API Settings"

## Vercel IP Ranges (If Available)

Vercel may publish IP ranges. Check:
- Vercel Documentation
- Contact Vercel Support
- Vercel Status Page

If you get Vercel IP ranges, provide them to BulkSMSBD support to whitelist all at once.

## Testing After Whitelisting

1. Wait a few minutes for changes to propagate
2. Test sending a single SMS
3. Check if error 1032 is resolved
4. If it still fails, check if IP changed (Vercel dynamic IPs)

## Long-Term Solution

For a permanent solution, you should:

1. ✅ Contact BulkSMSBD support about Vercel/dynamic IPs
2. ✅ Ask if they support API key-based authentication (no IP whitelist needed)
3. ✅ Consider using a service with static IPs if required
4. ✅ Check if BulkSMSBD has a webhook/alternative API that doesn't require IP whitelisting

## Current Status

- **Error Code**: 1032
- **Error Message**: "Your ip 44.213.71.180 not Whitelisted. Please whitelist ip from Phonebook"
- **Action Required**: Whitelist IP `44.213.71.180` in BulkSMSBD dashboard
- **Note**: This IP may change on next Vercel deployment

## Quick Fix Steps

1. Copy the IP from error: `44.213.71.180`
2. Log into BulkSMSBD dashboard
3. Find "Phonebook" or "IP Whitelist" section
4. Add the IP address
5. Save and test again

**Remember**: This is a temporary fix. For a permanent solution, contact BulkSMSBD support about Vercel IP ranges.




