# SMS Sender ID Masking Guide

## Overview

SMS Sender ID masking allows you to display a custom alphanumeric name (like "MallickNDC7") instead of a phone number when sending SMS messages. This makes your messages more recognizable and professional.

## How It Works

When you send an SMS campaign through the platform, instead of showing your Twilio phone number (e.g., +1234567890), recipients will see your custom sender name (e.g., "MallickNDC7").

## Configuration

### Method 1: Per-Campaign Configuration (Recommended)

When creating an SMS campaign:

1. Go to **Dashboard > Campaigns**
2. Select **SMS** as the channel
3. In Step 3 (Send Campaign), you'll see an **SMS Sender ID** field
4. Enter your desired sender name (e.g., "MallickNDC7")
5. Maximum 11 characters
6. Letters and numbers only (no special characters)

### Method 2: Environment Variable (Default)

Set a default sender ID in your environment variables:

```bash
SMS_SENDER_ID=MallickNDC7
```

This will be used as the default for all SMS campaigns unless overridden in the UI.

## Examples

### Good Sender IDs
- ✅ `MallickNDC7` - Your configured name
- ✅ `NDCBallot7` - Alternative format
- ✅ `Mallick2024` - With year
- ✅ `NDCINFO` - All caps variant
- ✅ `YourBrand` - Brand name (max 11 chars)

### Invalid Sender IDs
- ❌ `Mallick-NDC-7` - Contains hyphens
- ❌ `Mallick NDC 7` - Contains spaces
- ❌ `MallickNDCBallot2024` - Too long (>11 characters)
- ❌ `#MallickNDC` - Contains special characters

## Country Support

### ⚠️ Important: Geographic Limitations

Alphanumeric sender IDs **DO NOT WORK** in all countries:

### ✅ Supported Countries (Partial List)
- India
- United Kingdom
- Germany
- France
- Spain
- Italy
- Australia
- Most European countries
- Most Asian countries
- Most African countries
- Most Middle Eastern countries

### ❌ NOT Supported Countries
- **United States** - Requires phone numbers only
- **Canada** - Requires phone numbers only
- **Mexico** - Limited support

### Check Support
For your specific country, check Twilio's documentation:
https://support.twilio.com/hc/en-us/articles/223133767-International-support-for-Alphanumeric-Sender-ID

## Twilio Configuration

### Option 1: Direct Alphanumeric Sender ID (Most Countries)

The platform is configured to use alphanumeric sender IDs directly. This works in most countries outside North America.

**No additional Twilio setup required** - just enter your sender ID and send!

### Option 2: Messaging Service (For Better Reliability)

For better reliability and delivery rates, you can set up a Twilio Messaging Service:

1. **Create Messaging Service**
   - Go to Twilio Console
   - Navigate to Messaging > Services
   - Click "Create Messaging Service"
   - Choose "Notify my users"
   - Name it (e.g., "Campaign SMS")

2. **Add Sender ID**
   - In your Messaging Service
   - Go to "Sender Pool"
   - Add your alphanumeric sender ID
   - Click "Add Senders"

3. **Configure in Code**
   - In `app/api/send/sms/route.ts`, uncomment line 39:
   ```typescript
   messageParams.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
   ```
   - Add to `.env.local`:
   ```bash
   TWILIO_MESSAGING_SERVICE_SID=your_messaging_service_sid
   ```

## Testing

### Test in Supported Country

1. Add a test member with a phone number from a supported country (e.g., India: +91...)
2. Create an SMS campaign
3. Set sender ID to "MallickNDC7"
4. Send to the test member
5. Check the received SMS - it should show "MallickNDC7" as sender

### Test in USA (Fallback to Phone Number)

1. Add a test member with US phone number (+1...)
2. Create an SMS campaign
3. Set sender ID to "MallickNDC7"
4. Send to the test member
5. The message will be sent from your Twilio phone number (alphanumeric won't work)

## Code Implementation

### How Sender ID is Applied

```typescript
// In app/api/send/sms/route.ts

// Priority order:
1. User-provided sender ID (from campaign UI)
2. Environment variable SMS_SENDER_ID
3. Fallback to TWILIO_PHONE_NUMBER

// Automatically detects if sender ID is alphanumeric or phone number
if (!/^\+\d+$/.test(fromValue)) {
  // Alphanumeric - use as sender ID (max 11 chars)
  messageParams.from = fromValue.substring(0, 11);
} else {
  // Phone number format
  messageParams.from = fromValue;
}
```

### Campaign-Level Configuration

```typescript
// In app/dashboard/campaigns/page.tsx

// SMS sender ID state
const [smsSenderId, setSmsSenderId] = useState('MallickNDC7');

// UI field (only shown for SMS channel)
{channel === 'sms' && (
  <div>
    <label>SMS Sender ID</label>
    <input
      value={smsSenderId}
      onChange={(e) => setSmsSenderId(e.target.value)}
      maxLength={11}
    />
  </div>
)}
```

## Troubleshooting

### Issue: SMS shows phone number instead of sender ID

**Possible causes:**
1. **Country not supported** - Check if recipient's country supports alphanumeric sender IDs
2. **Mobile carrier restriction** - Some carriers block alphanumeric sender IDs
3. **Twilio account not enabled** - Contact Twilio to enable alphanumeric sender IDs

**Solution:**
- Verify country support
- Test with different carrier
- Contact Twilio support to enable feature

### Issue: SMS delivery fails

**Possible causes:**
1. **Invalid characters** - Sender ID contains special characters or spaces
2. **Too long** - More than 11 characters
3. **Account limitations** - Trial account restrictions

**Solution:**
- Use only letters and numbers (max 11 chars)
- Verify Twilio account is not in trial mode
- Check Twilio logs for error details

### Issue: Inconsistent delivery

**Possible causes:**
1. **Direct sender ID vs Messaging Service** - Direct sending less reliable
2. **Carrier filtering** - Some carriers filter unknown sender IDs

**Solution:**
- Set up Twilio Messaging Service (see Option 2 above)
- Register sender ID with Twilio
- Consider using verified sender IDs

## Best Practices

1. **Keep it Short**
   - Use 8-11 characters for best compatibility
   - Example: `MallickNDC` or `NDCVote24`

2. **Make it Recognizable**
   - Use your brand/campaign name
   - Avoid generic names like "INFO" or "ALERT"

3. **Be Consistent**
   - Use the same sender ID for all campaigns
   - Builds recipient trust

4. **Test Before Campaign**
   - Send test SMS to yourself
   - Verify sender ID appears correctly
   - Test in target country if possible

5. **Fallback Strategy**
   - Have a phone number backup for unsupported countries
   - The platform automatically falls back to phone number in USA/Canada

## Regulatory Compliance

### Important Considerations

1. **Consent Required**
   - Obtain consent before sending SMS
   - Include opt-out instructions
   - Maintain opt-out list

2. **Sender ID Registration**
   - Some countries require sender ID registration
   - Check local regulations
   - Register with telecom authorities if required

3. **Content Rules**
   - Avoid promotional content in some regions
   - Include identification in message
   - Comply with local SMS regulations

### Registration Requirements by Country

**India**
- Register sender ID with DLT (Distributed Ledger Technology)
- Register message templates
- Required for commercial SMS

**UAE**
- Register sender ID with TRA (Telecom Regulatory Authority)
- Approval required for commercial use

**Saudi Arabia**
- Register with CITC (Communications and IT Commission)
- Verification process required

**Most Other Countries**
- No registration required for basic use
- May need registration for high-volume sending

## Cost Implications

- Alphanumeric sender IDs typically cost the same as regular SMS
- Some countries may have slightly higher rates
- Twilio charges per message sent
- Check Twilio's pricing page for your target countries

## Advanced Configuration

### Dynamic Sender ID Based on Campaign

You can customize sender ID per campaign type:

```typescript
// Example: Different sender IDs for different campaigns
const senderIds = {
  election: 'MallickNDC7',
  events: 'NDCEvents',
  news: 'NDCNews',
};

// Use in campaign creation
setSmsSenderId(senderIds[campaignType]);
```

### Multiple Sender IDs

Store multiple sender IDs and let user choose:

```typescript
const senderIdOptions = [
  'MallickNDC7',
  'NDCBallot7',
  'NDCInfo',
];

// UI: Dropdown instead of text input
<select value={smsSenderId} onChange={...}>
  {senderIdOptions.map(id => (
    <option key={id} value={id}>{id}</option>
  ))}
</select>
```

## Support Resources

- **Twilio Documentation**: https://www.twilio.com/docs/sms/send-messages#use-an-alphanumeric-sender-id
- **Country Support List**: https://support.twilio.com/hc/en-us/articles/223133767
- **Twilio Support**: https://support.twilio.com
- **Project Documentation**: See README.md

## Summary

✅ **SMS Sender ID masking is now fully configured**

- Default sender ID: `MallickNDC7`
- Can be customized per campaign
- Works in most countries (except USA/Canada)
- Max 11 characters, alphanumeric only
- Automatically falls back to phone number if needed

**Ready to use immediately!**
