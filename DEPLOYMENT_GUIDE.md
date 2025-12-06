# Quick Deployment Guide

## Step-by-Step Deployment Process

### 1. Prepare Supabase Database

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Click "New Project"
   - Choose organization and set project name
   - Set a strong database password
   - Select region closest to your users
   - Wait for project to be created

2. **Run Database Schema**
   - Open Supabase Dashboard
   - Go to SQL Editor
   - Copy entire content from `supabase-schema.sql`
   - Paste and click "Run"
   - Verify tables are created in Table Editor

3. **Create Storage Bucket**
   - Go to Storage section
   - Click "New bucket"
   - Name: `campaign-files`
   - Public bucket: Yes (or configure RLS policies)
   - Click "Create bucket"

4. **Get Supabase Credentials**
   - Go to Settings > API
   - Copy:
     - Project URL (NEXT_PUBLIC_SUPABASE_URL)
     - anon/public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
     - service_role key (SUPABASE_SERVICE_ROLE_KEY)

### 2. Get All Required API Keys

#### OpenAI (Required for AI features)
```
1. Visit: https://platform.openai.com/api-keys
2. Sign up or login
3. Click "Create new secret key"
4. Copy key immediately (won't be shown again)
5. Add credits to your account
```

#### Twilio (Required for SMS)
```
1. Visit: https://www.twilio.com/try-twilio
2. Sign up and verify your email
3. From Console Dashboard, copy:
   - Account SID
   - Auth Token
4. Go to Phone Numbers > Manage > Buy a number
5. Purchase a phone number
6. Copy the phone number
```

#### Resend (Required for Email)
```
1. Visit: https://resend.com/signup
2. Sign up
3. Go to API Keys
4. Click "Create API Key"
5. Copy the key
6. (Optional) Add and verify your domain in Domains section
```

#### Facebook/Instagram (Optional)
```
1. Visit: https://developers.facebook.com/
2. Create Developer Account
3. Create New App
4. Add "Facebook Login" product
5. Get App ID and App Secret from Settings > Basic
6. Connect Facebook Page and Instagram Business Account
```

#### LinkedIn (Optional)
```
1. Visit: https://www.linkedin.com/developers/
2. Create an app
3. In Products tab, add "Share on LinkedIn"
4. Get Client ID and Client Secret from Auth tab
```

### 3. Deploy to Vercel

#### Method A: GitHub + Vercel (Recommended)

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

2. **Deploy on Vercel**
```
1. Go to https://vercel.com
2. Click "Add New" > "Project"
3. Import your GitHub repository
4. Framework Preset: Next.js (auto-detected)
5. Root Directory: ./
6. Build Command: npm run build
7. Output Directory: .next
```

3. **Add Environment Variables in Vercel**
```
In the Environment Variables section, add ALL of these:

NEXT_PUBLIC_SUPABASE_URL=your_value_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_value_here
SUPABASE_SERVICE_ROLE_KEY=your_value_here
OPENAI_API_KEY=your_value_here
TWILIO_ACCOUNT_SID=your_value_here
TWILIO_AUTH_TOKEN=your_value_here
TWILIO_PHONE_NUMBER=your_value_here
RESEND_API_KEY=your_value_here
FROM_EMAIL=noreply@yourdomain.com
FACEBOOK_APP_ID=your_value_here
FACEBOOK_APP_SECRET=your_value_here
LINKEDIN_CLIENT_ID=your_value_here
LINKEDIN_CLIENT_SECRET=your_value_here
WHATSAPP_PHONE_NUMBER_ID=your_value_here
WHATSAPP_ACCESS_TOKEN=your_value_here
NEXTAUTH_URL=https://your-domain.vercel.app
```

4. **Click Deploy**

#### Method B: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# For each environment variable, run:
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Enter value when prompted
# Repeat for all variables

# Deploy to production
vercel --prod
```

### 4. Configure Custom Domain/Subdomain

1. **In Vercel Dashboard**
   - Go to your project
   - Click "Settings" > "Domains"
   - Click "Add"
   - Enter your domain/subdomain (e.g., campaign.yourdomain.com)

2. **Update DNS Records** (at your domain provider)

   For subdomain:
   ```
   Type: CNAME
   Name: campaign
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

   For root domain:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **Wait for DNS propagation** (5 minutes - 48 hours)

4. **Update NEXTAUTH_URL**
   ```
   Go to Vercel > Settings > Environment Variables
   Update NEXTAUTH_URL to: https://campaign.yourdomain.com
   Redeploy the application
   ```

### 5. Test Your Deployment

1. **Access the Application**
   - Visit your domain
   - You should see the login page

2. **Login**
   - Username: mallick99
   - Password: nazrulNDC99

3. **Test Each Feature**
   - Add a test member
   - Upload a test document
   - Create a test campaign
   - Generate content
   - Generate visual
   - Send test campaign to yourself

### 6. Post-Deployment Configuration

1. **Update Supabase Image Domains in next.config.js**
   ```javascript
   images: {
     domains: ['your-supabase-project-id.supabase.co'],
   }
   ```

2. **Configure Supabase Storage Policies** (if using private bucket)
   ```sql
   -- Allow authenticated users to read
   CREATE POLICY "Allow public read access"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'campaign-files');

   -- Allow service role to insert
   CREATE POLICY "Allow service role insert"
   ON storage.objects FOR INSERT
   TO service_role
   WITH CHECK (bucket_id = 'campaign-files');
   ```

3. **Set Up Monitoring**
   - Enable Vercel Analytics
   - Set up error tracking (optional: Sentry)
   - Monitor API usage for OpenAI, Twilio, Resend

### 7. Security Checklist

- [ ] All environment variables are set in Vercel
- [ ] NEXTAUTH_URL matches your production domain
- [ ] Supabase RLS policies are configured (if needed)
- [ ] API keys are kept secret
- [ ] Database password is strong
- [ ] SSL/HTTPS is enabled (automatic with Vercel)
- [ ] Consider changing default login credentials for production

### 8. Troubleshooting

**Build Fails:**
- Check all dependencies are in package.json
- Verify TypeScript errors locally: `npm run build`
- Review build logs in Vercel

**Runtime Errors:**
- Check environment variables are set correctly
- Review Function Logs in Vercel
- Check Supabase logs

**Can't Send Campaigns:**
- Verify API keys are correct
- Check service account credits/limits
- Review API endpoint logs

**Database Connection Issues:**
- Verify Supabase credentials
- Check if project is paused (free tier)
- Test connection with Supabase client

### 9. Maintenance

**Regular Tasks:**
- Monitor API usage and costs
- Backup database regularly (Supabase has automatic backups)
- Update dependencies monthly: `npm update`
- Review campaign logs for errors
- Check email/SMS delivery rates

**Scaling Considerations:**
- Upgrade Supabase plan as database grows
- Consider rate limits for OpenAI API
- Monitor Vercel function execution time
- Implement caching for frequently accessed data

### Need Help?

Common issues and solutions are in the main README.md file.

For Vercel-specific issues: https://vercel.com/docs
For Supabase issues: https://supabase.com/docs
For Next.js issues: https://nextjs.org/docs
