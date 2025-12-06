# BulkSMSBD.net API Setup Guide

This guide explains how to configure and use the BulkSMSBD.net SMS API in the Campaign Manager.

## API Configuration

### Environment Variables

Add these to your `.env.local` file:

```env
# BulkSMSBD.net SMS API
BULKSMSBD_API_KEY=Bh6WCte0rmh9n0CCepCo
SMS_SENDER_ID=Mallick NDC
```

**Note:** The API key `Bh6WCte0rmh9n0CCepCo` is provided in the API documentation. Replace it with your own if you have a different key.

## Phone Number Format

### Required Format

BulkSMSBD.net uses Bangladesh phone number format:

- ✅ **Correct**: `8801712345678`, `8801812345678`, `01712345678`
- ❌ **Wrong**: `+8801712345678`, `+1-234-567-8900`, `1234567890`

### Format Conversion

The system automatically converts phone numbers:
- Removes `+` prefix
- Removes spaces, dashes, and other non-digit characters
- Accepts both formats:
  - With country code: `8801712345678` (13 digits)
  - Without country code: `01712345678` (11 digits starting with 01)

### Examples

| Input Format | Converted To | Status |
|-------------|--------------|--------|
| `+8801712345678` | `8801712345678` | ✅ Valid |
| `8801712345678` | `8801712345678` | ✅ Valid |
| `01712345678` | `01712345678` | ✅ Valid |
| `880 17 1234 5678` | `8801712345678` | ✅ Valid |
| `+1-234-567-8900` | `12345678900` | ❌ Invalid (not Bangladesh format) |

## API Endpoints

### Single SMS

**Endpoint:** `POST /api/send/sms`

**Request Body:**
```json
{
  "to": "8801712345678",
  "message": "Your message here",
  "senderId": "Mallick NDC"
}
```

**Response (Success):**
```json
{
  "success": true,
  "status": "sent",
  "statusCode": 202,
  "message": "SMS Submitted Successfully",
  "to": "8801712345678",
  "senderId": "Mallick NDC"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid Number",
  "statusCode": 1001,
  "to": "8801712345678"
}
```

### Bulk SMS (Many to Many)

**Endpoint:** `POST /api/send/sms`

**Request Body:**
```json
{
  "numbers": [
    {
      "number": "8801712345678",
      "message": "Message for first person"
    },
    {
      "number": "8801812345678",
      "message": "Message for second person"
    }
  ],
  "senderId": "Mallick NDC"
}
```

**Response:**
```json
{
  "success": true,
  "total": 2,
  "sent": 2,
  "failed": 0,
  "results": [
    {
      "number": "8801712345678",
      "success": true,
      "statusCode": 202
    },
    {
      "number": "8801812345678",
      "success": true,
      "statusCode": 202
    }
  ]
}
```

## Error Codes

| Code | Meaning |
|------|---------|
| 202 | SMS Submitted Successfully ✅ |
| 1001 | Invalid Number |
| 1002 | Sender ID not correct or disabled |
| 1003 | Required fields missing |
| 1005 | Internal Error |
| 1006 | Balance Validity Not Available |
| 1007 | Balance Insufficient |
| 1011 | User ID not found |
| 1012 | Masking SMS must be sent in Bengali |
| 1013 | Sender ID has not found Gateway by API key |
| 1014 | Sender Type Name not found |
| 1015 | Sender ID has not found Any Valid Gateway |
| 1016 | Sender Type Name Active Price Info not found |
| 1017 | Sender Type Name Price Info not found |
| 1018 | Account owner is disabled |
| 1019 | Sender type price is disabled |
| 1020 | Parent account not found |
| 1021 | Parent active price not found |
| 1031 | Account Not Verified |
| 1032 | IP Not whitelisted |

## OTP Format Recommendation

For OTP messages, use this format:

```
Your {Brand/Company Name} OTP is XXXX
```

**Example:**
```
Your Mallick NDC OTP is 1234
```

## Special Characters

The API automatically URL-encodes special characters in messages:
- `&` → `%26`
- `$` → `%24`
- `@` → `%40`
- Spaces → `%20`
- etc.

You don't need to manually encode - the system handles it automatically.

## Testing

### Test Single SMS

```bash
curl -X POST http://localhost:3000/api/send/sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "8801712345678",
    "message": "Test message from Campaign Manager",
    "senderId": "Mallick NDC"
  }'
```

### Test Bulk SMS

```bash
curl -X POST http://localhost:3000/api/send/sms \
  -H "Content-Type: application/json" \
  -d '{
    "numbers": [
      {
        "number": "8801712345678",
        "message": "Message 1"
      },
      {
        "number": "8801812345678",
        "message": "Message 2"
      }
    ],
    "senderId": "Mallick NDC"
  }'
```

## Troubleshooting

### Issue: "Invalid Number" (Error 1001)

**Problem:** Phone number format is incorrect

**Solution:**
- Ensure number is in Bangladesh format: `880XXXXXXXXX` or `01XXXXXXXXX`
- Remove `+` prefix if present
- Check number has correct length (13 digits with country code, 11 digits without)

### Issue: "Sender ID not correct" (Error 1002)

**Problem:** Sender ID is not approved or incorrect

**Solution:**
- Verify sender ID is approved in your BulkSMSBD account
- Check sender ID spelling (case-sensitive)
- Default sender ID: "Mallick NDC"

### Issue: "Balance Insufficient" (Error 1007)

**Problem:** Account doesn't have enough balance

**Solution:**
- Check your BulkSMSBD account balance
- Add credits to your account
- Contact BulkSMSBD support if needed

### Issue: "Account Not Verified" (Error 1031)

**Problem:** Account needs verification

**Solution:**
- Contact BulkSMSBD administrator
- Complete account verification process

### Issue: "IP Not whitelisted" (Error 1032)

**Problem:** Your server IP is not whitelisted

**Solution:**
- Contact BulkSMSBD support to whitelist your IP
- Provide your server's IP address

## Migration from Twilio

If you were using Twilio before:

1. **Update Environment Variables:**
   ```env
   # Remove Twilio variables
   # TWILIO_ACCOUNT_SID=
   # TWILIO_AUTH_TOKEN=
   # TWILIO_PHONE_NUMBER=
   
   # Add BulkSMSBD variables
   BULKSMSBD_API_KEY=Bh6WCte0rmh9n0CCepCo
   SMS_SENDER_ID=Mallick NDC
   ```

2. **Update Phone Numbers:**
   - Convert from E.164 format (`+880...`) to Bangladesh format (`880...`)
   - Run this SQL in Supabase to update existing numbers:
   ```sql
   -- Remove + prefix and keep only digits
   UPDATE members 
   SET mobile = REGEXP_REPLACE(mobile, '[^0-9]', '', 'g')
   WHERE mobile LIKE '+%';
   ```

3. **Restart Server:**
   ```bash
   npm run dev
   ```

## API URL Format

The system uses this API URL format:

```
http://bulksmsbd.net/api/smsapi?api_key={API_KEY}&type=text&number={NUMBER}&senderid={SENDER_ID}&message={MESSAGE}
```

All parameters are automatically URL-encoded for safety.

## Credit Balance Check

To check your account balance, use:

```
GET http://bulksmsbd.net/api/getBalanceApi?api_key={API_KEY}
```

**Response:**
- Returns balance information (format depends on API)

## Best Practices

1. **Phone Number Validation**
   - Always validate phone numbers before sending
   - Use Bangladesh format: `880XXXXXXXXX` or `01XXXXXXXXX`

2. **Message Length**
   - Keep messages concise
   - For OTP, use recommended format: "Your {Brand} OTP is XXXX"

3. **Error Handling**
   - Check response status codes
   - Log errors for debugging
   - Handle balance insufficient errors gracefully

4. **Rate Limiting**
   - Be mindful of API rate limits
   - Don't send too many messages at once
   - Use bulk API for multiple recipients

5. **Testing**
   - Always test with a small batch first
   - Verify phone numbers are correct
   - Check account balance before large campaigns

## Support

For BulkSMSBD.net API issues:
- Check API documentation: http://bulksmsbd.net/api
- Contact BulkSMSBD support
- Check your account dashboard for status

