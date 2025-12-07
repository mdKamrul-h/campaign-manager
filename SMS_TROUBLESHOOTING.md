# SMS Campaign Troubleshooting Guide

## Issue: Campaign Shows "Sent" But No SMS Received

If your campaign shows as "sent" but you don't receive any SMS messages, follow these troubleshooting steps:

## Quick Checklist

- [ ] Twilio credentials are set in `.env.local`
- [ ] Phone numbers are in E.164 format (+1234567890)
- [ ] Twilio account has credits/balance
- [ ] Phone numbers are verified (if in trial mode)
- [ ] Check browser console for error messages
- [ ] Check server logs for SMS errors

## Step 1: Verify Twilio Configuration

### Check Environment Variables

Open your `.env.local` file and verify:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**To get these:**
1. Go to [Twilio Console](https://console.twilio.com/)
2. Dashboard shows your **Account SID**
3. Click to reveal **Auth Token**
4. Go to **Phone Numbers** → **Manage** → **Active numbers** to see your phone number

### Verify Credentials

Run this test in your terminal:

```bash
# Test Twilio connection (requires curl)
curl -X POST https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json \
  -u YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN \
  -d "From=+YOUR_TWILIO_NUMBER" \
  -d "To=+YOUR_PHONE_NUMBER" \
  -d "Body=Test message"
```

## Step 2: Check Phone Number Format

### Required Format: E.164

Phone numbers **must** be in E.164 format:
- ✅ Correct: `+1234567890`, `+919876543210`, `+441234567890`
- ❌ Wrong: `1234567890`, `(123) 456-7890`, `123-456-7890`

### Fix Phone Numbers in Database

If your phone numbers are not in E.164 format:

1. Go to Supabase Dashboard → **Table Editor** → `members`
2. Check the `mobile` column format
3. Update numbers to include country code with `+` prefix

Or run this SQL in Supabase SQL Editor:

```sql
-- Example: Fix US numbers missing +1
UPDATE members 
SET mobile = '+1' || mobile 
WHERE mobile NOT LIKE '+%' 
AND mobile LIKE '1%';

-- Example: Fix Indian numbers missing +91
UPDATE members 
SET mobile = '+91' || mobile 
WHERE mobile NOT LIKE '+%' 
AND mobile LIKE '91%';
```

## Step 3: Check Twilio Account Status

### Trial Account Limitations

If you're on a Twilio **trial account**:

1. **Only verified numbers can receive SMS**
   - Go to Twilio Console → **Phone Numbers** → **Verified Caller IDs**
   - Add and verify your phone number
   - You can only send to verified numbers in trial mode

2. **Limited credits**
   - Check your account balance
   - Trial accounts have limited credits

### Upgrade Account

To send to any number:
1. Go to Twilio Console → **Billing**
2. Add payment method
3. Upgrade from trial account

## Step 4: Check Error Messages

### Browser Console

1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Look for error messages when sending campaign
4. Check for:
   - "Twilio credentials not configured"
   - "Invalid phone number format"
   - "Unverified phone number"
   - Any other error messages

### Server Logs

Check your terminal/console where `npm run dev` is running:

Look for:
- `SMS send error:` - Shows detailed error
- `SMS sent successfully:` - Confirms successful send
- `SMS failed for [name]:` - Shows which member failed

## Step 5: Common Error Codes

### Error Code 21211: Invalid Phone Number

**Problem:** Phone number format is incorrect

**Solution:**
- Ensure phone number starts with `+`
- Use E.164 format: `+[country code][number]`
- Example: `+1234567890` (US), `+919876543210` (India)

### Error Code 21608: Unverified Recipient

**Problem:** In trial mode, can only send to verified numbers

**Solution:**
1. Go to Twilio Console → **Phone Numbers** → **Verified Caller IDs**
2. Add the recipient phone number
3. Verify it via SMS or call
4. Try sending again

### Error Code 21610: Unverified Sender

**Problem:** Your Twilio phone number is not verified

**Solution:**
1. Verify your Twilio phone number
2. Or use a verified phone number in `TWILIO_PHONE_NUMBER`

### Error Code 21408: Permission Denied

**Problem:** Account doesn't have permission to send SMS

**Solution:**
1. Check Twilio account status
2. Verify account is not suspended
3. Check if SMS is enabled for your account

### 401 Unauthorized

**Problem:** Invalid Account SID or Auth Token

**Solution:**
1. Double-check credentials in `.env.local`
2. Ensure no extra spaces
3. Restart development server after updating

## Step 6: Test SMS Sending Directly

### Test Single SMS

Create a test file `test-sms.js`:

```javascript
require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

client.messages
  .create({
    body: 'Test message from Campaign Manager',
    from: process.env.TWILIO_PHONE_NUMBER,
    to: '+YOUR_PHONE_NUMBER' // Replace with your number
  })
  .then(message => {
    console.log('✅ SMS sent successfully!');
    console.log('SID:', message.sid);
    console.log('Status:', message.status);
  })
  .catch(error => {
    console.error('❌ SMS failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
  });
```

Run: `node test-sms.js`

## Step 7: Check Campaign Logs

### View Logs in Database

1. Go to Supabase Dashboard → **Table Editor** → `campaign_logs`
2. Find your campaign ID
3. Check the `status` column:
   - `success` = SMS was sent
   - `failed` = SMS failed
4. Check `error_message` column for details

### Query Logs

Run this SQL in Supabase SQL Editor:

```sql
-- View recent campaign logs
SELECT 
  cl.*,
  m.name as member_name,
  m.mobile,
  c.title as campaign_title
FROM campaign_logs cl
JOIN members m ON cl.member_id = m.id
JOIN campaigns c ON cl.campaign_id = c.id
WHERE c.channel = 'sms'
ORDER BY cl.sent_at DESC
LIMIT 20;
```

## Step 8: Verify Sender ID Configuration

### Alphanumeric Sender ID Issues

If using alphanumeric sender ID (e.g., "MallickNDC7"):

1. **Country Support**
   - Not all countries support alphanumeric sender IDs
   - USA/Canada require phone numbers
   - Check: https://support.twilio.com/hc/en-us/articles/223133767

2. **Fallback to Phone Number**
   - If alphanumeric fails, system should fallback to phone number
   - Check if `TWILIO_PHONE_NUMBER` is set

## Step 9: Check Network and Firewall

### Local Development

- Ensure your development server can reach Twilio API
- Check firewall settings
- Try from different network

### Production

- Verify server can reach `api.twilio.com`
- Check Vercel/server logs for network errors

## Step 10: Enable Detailed Logging

The system now logs detailed information:

- ✅ SMS send attempts
- ✅ Success/failure status
- ✅ Error messages
- ✅ Phone numbers being sent to

Check your server console for these logs when sending campaigns.

## Quick Fixes

### Fix 1: Update Phone Numbers

```sql
-- Add + prefix if missing
UPDATE members 
SET mobile = '+' || mobile 
WHERE mobile NOT LIKE '+%';
```

### Fix 2: Verify Twilio Credentials

1. Copy credentials from Twilio Console
2. Update `.env.local`
3. Restart server: `npm run dev`

### Fix 3: Verify Phone Numbers (Trial Mode)

1. Go to Twilio Console
2. Add recipient numbers to Verified Caller IDs
3. Verify via SMS/call
4. Try sending again

### Fix 4: Check Account Balance

1. Go to Twilio Console → **Billing**
2. Check account balance
3. Add credits if needed

## Still Not Working?

1. **Check Twilio Console Logs**
   - Go to Twilio Console → **Monitor** → **Logs** → **Messaging**
   - See detailed error messages

2. **Contact Twilio Support**
   - If account issues persist
   - They can check account status

3. **Test with Twilio API Directly**
   - Use the test script above
   - Isolate if issue is with Twilio or your code

4. **Check Server Logs**
   - Look for detailed error messages
   - Check for network errors

## Prevention

To avoid issues in the future:

1. ✅ Always use E.164 format for phone numbers
2. ✅ Verify Twilio credentials are correct
3. ✅ Test with a single SMS before sending campaigns
4. ✅ Check campaign logs after sending
5. ✅ Monitor Twilio account balance
6. ✅ Verify numbers if in trial mode





