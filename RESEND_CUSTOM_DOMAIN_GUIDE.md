# Resend Custom Domain Email Guide

## Issue: Can't Send to Custom Domains (@company.com)

If you're experiencing issues sending emails to custom domains (like `@company.com`) but can send to Gmail/Yahoo, here are the likely causes and solutions:

## Common Causes

### 1. Email Address Validation
- **Issue**: Invalid email format in your database
- **Solution**: Ensure email addresses are properly formatted (e.g., `user@company.com` not `user@company`)

### 2. Recipient Mail Server Rejection
- **Issue**: The recipient's mail server is rejecting emails
- **Solution**: This is not a Resend issue - the recipient's IT team needs to whitelist your sending domain

### 3. Domain Verification (Sending FROM, not TO)
- **Note**: Resend allows sending TO any email address, including custom domains
- **Restriction**: You can only send FROM verified domains
- **Solution**: Verify your sending domain in Resend dashboard

## How to Verify Your Sending Domain in Resend

1. **Go to Resend Dashboard**
   - Visit https://resend.com/domains
   - Click "Add Domain"

2. **Add Your Domain**
   - Enter your domain (e.g., `mallicknazrul.com`)
   - Resend will provide DNS records to add

3. **Add DNS Records**
   - Go to your domain registrar (where you bought the domain)
   - Add the SPF, DKIM, and DMARC records provided by Resend
   - Wait for DNS propagation (can take up to 48 hours)

4. **Verify Domain**
   - Once DNS records are verified, you can send from `@yourdomain.com`
   - Update `FROM_EMAIL` in environment variables

## Current Setup

Your current `FROM_EMAIL` is: `Mallick NDC99 Ballot 7 <vote@mallicknazrul.com>`

**To send from this domain:**
1. Verify `mallicknazrul.com` in Resend
2. Add the DNS records provided by Resend
3. Wait for verification

**Alternative (for testing):**
- Use Resend's default domain: `onboarding@resend.dev`
- This works for all recipients but is less professional

## Email Validation

The system now validates email addresses to ensure they're properly formatted. Invalid emails will be skipped with an error message, but won't stop the batch.

## Testing

To test if you can send to a custom domain:
1. Try sending a test email to `test@company.com`
2. Check the campaign results - it will show if it was sent or failed
3. If it fails, check the error message in the results

## Troubleshooting

### Email Bounces
- Check Resend dashboard → Logs for bounce reasons
- Common reasons: invalid address, mailbox full, server rejection

### Domain Blocking
- Some corporate domains block external emails
- Contact the recipient's IT team to whitelist your sending domain

### Rate Limiting
- Resend free tier: 100 emails/day, 3,000/month
- For 800 emails, you may need a paid plan or send over multiple days

## Testing Custom Domain Emails

### Use the Test Endpoint

You can test sending to a specific email address using the test endpoint:

```bash
POST https://campaignm.mallicknazrul.com/api/test-email
Content-Type: application/json

{
  "to": "test@company.com",
  "subject": "Test Email",
  "content": "This is a test email to verify custom domain sending"
}
```

This will return detailed information about:
- Whether the email was sent successfully
- The domain type (custom vs standard)
- Any error messages from Resend
- Specific guidance based on the result

### Check Your Database

1. **Verify Email Format:**
   - Go to your Members page
   - Check emails with custom domains
   - Ensure they're formatted correctly: `user@company.com` (not `user@company`)

2. **Common Format Issues:**
   - Missing TLD: `user@company` ❌ (should be `user@company.com`)
   - Extra spaces: ` user@company.com ` ❌ (should be `user@company.com`)
   - Invalid characters: `user name@company.com` ❌ (should be `username@company.com`)

## Support

If emails to custom domains consistently fail:
1. **Use the test endpoint** to send a test email and see detailed error
2. Check Resend dashboard → Logs for specific error messages
3. Verify the email addresses are correct in your database
4. Test sending directly from Resend dashboard to the same address
5. Check Vercel function logs for detailed error messages
6. Contact Resend support if the issue persists






