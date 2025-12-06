# Quick Start Guide - Local Development

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Supabase account (free tier is fine)
- OpenAI API key (for AI features)
- Twilio account (for SMS) - optional for testing
- Resend account (for Email) - optional for testing

## 5-Minute Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Go to https://supabase.com and create a new project
2. Once created, go to SQL Editor
3. Copy everything from `supabase-schema.sql` and run it
4. Go to Storage > Create new bucket named `campaign-files` (make it public)
5. Go to Settings > API and copy your credentials

### 3. Create Environment File

Create `.env.local` in the root directory:

```bash
# REQUIRED - Get from Supabase Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# REQUIRED - Get from OpenAI Platform
OPENAI_API_KEY=sk-your_openai_key_here

# OPTIONAL - For SMS testing (get from BulkSMSBD.net)
BULKSMSBD_API_KEY=Bh6WCte0rmh9n0CCepCo
SMS_SENDER_ID=Mallick NDC

# OPTIONAL - For Email testing (get from Resend)
RESEND_API_KEY=
FROM_EMAIL=onboarding@resend.dev

# OPTIONAL - Social media (leave empty for now)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=

# Local development
NEXTAUTH_URL=http://localhost:3000
```

### 4. Run Development Server

```bash
npm run dev
```

### 5. Access the Application

Open http://localhost:3000

**Login credentials:**
- Username: `mallick99`
- Password: `nazrulNDC99`

## Testing the Features

### Test Member Management
1. Go to Members page
2. Click "Add Member"
3. Fill in details and save
4. Try editing and searching

### Test Document Upload
1. Go to Documents page
2. Upload a text file or PDF
3. This will be used for AI context

### Test AI Content Generation
1. Go to Campaigns page
2. Enter a title and select channel
3. Write a prompt like: "Create a campaign about our new product launch"
4. Click "Generate Content"
5. Review the AI-generated content

### Test AI Visual Generation
1. After generating content, click "Continue to Visuals"
2. Write a visual prompt like: "Professional product launch image with modern design"
3. Click "Generate Visual"
4. Wait for DALL-E to create the image

### Test Campaign Sending (Email)
1. Make sure you have RESEND_API_KEY set
2. Add yourself as a member with your email
3. Create a campaign
4. Select "Email" as channel
5. Target "All Members"
6. Click "Send Campaign"
7. Check your email

## Development Tips

### Hot Reload
The dev server has hot reload enabled. Changes to files will automatically refresh the page.

### Database Inspection
- Go to Supabase Dashboard > Table Editor to view data
- Use SQL Editor to run queries
- Check Storage to see uploaded files

### API Testing
You can test API endpoints directly:
```bash
# Test auth
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mallick99","password":"nazrulNDC99"}'

# Test content generation
curl -X POST http://localhost:3000/api/generate/content \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Write a campaign","channel":"email","useDocuments":false}'
```

### Debugging
- Check browser console for frontend errors
- Check terminal for backend API errors
- Review Network tab for API call issues
- Use Supabase logs for database issues

## Common Issues

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Supabase connection fails
- Verify URL and keys in .env.local
- Check if project is active (not paused)
- Ensure .env.local is in root directory

### OpenAI API errors
- Verify API key is correct
- Check you have credits in your OpenAI account
- Visit https://platform.openai.com/account/billing

### Build errors
```bash
npm run build
```
This will show TypeScript errors that need fixing.

## Next Steps

1. **Customize Login**: Edit `lib/auth.ts` to change credentials
2. **Add More Members**: Bulk import via Supabase SQL
3. **Customize Channels**: Modify content generation prompts in `app/api/generate/content/route.ts`
4. **Add Analytics**: Integrate with your preferred analytics platform
5. **Deploy**: Follow DEPLOYMENT_GUIDE.md when ready

## File Structure

```
campaignM/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication
│   │   ├── members/      # Member CRUD
│   │   ├── campaigns/    # Campaign management
│   │   ├── documents/    # Document upload
│   │   ├── generate/     # AI generation
│   │   └── send/         # Sending logic
│   ├── dashboard/        # Dashboard pages
│   │   ├── members/
│   │   ├── campaigns/
│   │   └── documents/
│   ├── layout.tsx
│   └── page.tsx          # Login page
├── components/
│   └── dashboard/        # Shared components
├── lib/
│   ├── supabase.ts      # Supabase client
│   └── auth.ts          # Auth logic
├── types/
│   └── index.ts         # TypeScript types
├── .env.local           # Environment variables
├── supabase-schema.sql  # Database schema
└── README.md            # Full documentation
```

## Support

- Check README.md for detailed documentation
- Review DEPLOYMENT_GUIDE.md for production deployment
- Check Supabase docs: https://supabase.com/docs
- Check Next.js docs: https://nextjs.org/docs

Happy coding!
