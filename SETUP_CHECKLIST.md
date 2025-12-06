# Setup Checklist

Use this checklist to track your setup progress.

## Local Development Setup

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Git installed (optional)

### Installation
- [ ] Run `npm install`
- [ ] Verify no installation errors

### Supabase Setup
- [ ] Create Supabase account at https://supabase.com
- [ ] Create new project
- [ ] Copy project URL
- [ ] Copy anon/public key
- [ ] Copy service_role key
- [ ] Go to SQL Editor
- [ ] Run entire `supabase-schema.sql` script
- [ ] Verify tables created in Table Editor
- [ ] Go to Storage
- [ ] Create bucket named `campaign-files`
- [ ] Make bucket public (or set up RLS)

### OpenAI Setup
- [ ] Create account at https://platform.openai.com
- [ ] Go to API Keys section
- [ ] Create new API key
- [ ] Copy API key
- [ ] Add credits to account (minimum $5 recommended)

### Environment Variables
- [ ] Copy `.env.local.template` to `.env.local`
- [ ] Add NEXT_PUBLIC_SUPABASE_URL
- [ ] Add NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] Add SUPABASE_SERVICE_ROLE_KEY
- [ ] Add OPENAI_API_KEY
- [ ] Set NEXTAUTH_URL to http://localhost:3000

### First Run
- [ ] Run `npm run dev`
- [ ] Open http://localhost:3000
- [ ] See login page
- [ ] Login with mallick99 / nazrulNDC99
- [ ] Access dashboard successfully

### Feature Testing
- [ ] Add a test member
- [ ] Upload a test document
- [ ] Create test campaign
- [ ] Generate content with AI
- [ ] Generate visual with AI (requires OpenAI credits)

---

## Production Deployment

### Optional Services Setup (if needed)

#### Twilio (SMS)
- [ ] Sign up at https://www.twilio.com
- [ ] Verify email and phone
- [ ] Get Account SID
- [ ] Get Auth Token
- [ ] Buy phone number
- [ ] Add to environment variables

#### Resend (Email)
- [ ] Sign up at https://resend.com
- [ ] Create API key
- [ ] (Optional) Add and verify domain
- [ ] Add to environment variables

#### Facebook/Instagram
- [ ] Create developer account
- [ ] Create new app
- [ ] Add Facebook Login product
- [ ] Get App ID and Secret
- [ ] Connect Facebook Page
- [ ] Connect Instagram Business Account
- [ ] Add to environment variables

#### LinkedIn
- [ ] Create developer account
- [ ] Create new app
- [ ] Request Share on LinkedIn access
- [ ] Get Client ID and Secret
- [ ] Add to environment variables

### GitHub Setup (if using GitHub deployment)
- [ ] Create GitHub repository
- [ ] Push code to repository
- [ ] Verify all files uploaded

### Vercel Deployment
- [ ] Create Vercel account at https://vercel.com
- [ ] Connect GitHub account (if using GitHub)
- [ ] Import project
- [ ] Configure build settings (auto-detected for Next.js)
- [ ] Add ALL environment variables in Vercel dashboard
- [ ] Deploy application
- [ ] Test deployment URL
- [ ] Verify login works
- [ ] Test all features

### Domain Configuration
- [ ] Add custom domain/subdomain in Vercel
- [ ] Configure DNS records at domain provider
- [ ] Wait for DNS propagation
- [ ] Update NEXTAUTH_URL in Vercel environment variables
- [ ] Redeploy application
- [ ] Test custom domain

### Post-Deployment Verification
- [ ] Login works on production
- [ ] Member management works
- [ ] Document upload works
- [ ] AI content generation works
- [ ] AI visual generation works
- [ ] Campaign sending works (test with your own contact info)
- [ ] Email sending works (if configured)
- [ ] SMS sending works (if configured)
- [ ] Social media posting works (if configured)

### Security Checklist
- [ ] All environment variables set in Vercel
- [ ] No API keys in code
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Supabase RLS policies considered
- [ ] Database password is strong
- [ ] Consider changing default login credentials

### Monitoring Setup
- [ ] Enable Vercel Analytics (optional)
- [ ] Set up error tracking (optional)
- [ ] Monitor OpenAI API usage
- [ ] Monitor Twilio usage (if applicable)
- [ ] Monitor Resend usage (if applicable)
- [ ] Set up billing alerts

---

## Troubleshooting Reference

### Build Issues
- [ ] Check all imports are correct
- [ ] Run `npm run build` locally
- [ ] Review TypeScript errors
- [ ] Verify all dependencies installed

### Runtime Issues
- [ ] Check Vercel Function Logs
- [ ] Check Supabase logs
- [ ] Verify environment variables
- [ ] Test API endpoints individually

### Integration Issues
- [ ] Verify API keys are correct
- [ ] Check service account status
- [ ] Review rate limits
- [ ] Check account credits/balance

---

## Maintenance Tasks

### Weekly
- [ ] Review campaign logs for errors
- [ ] Check API usage and costs
- [ ] Monitor database size

### Monthly
- [ ] Update npm dependencies
- [ ] Review and rotate API keys (best practice)
- [ ] Backup database (Supabase auto-backups)
- [ ] Review application performance

### Quarterly
- [ ] Security audit
- [ ] Review and update documentation
- [ ] Evaluate new features needed
- [ ] Review user feedback

---

## Quick Reference

### Login Credentials
- Username: `mallick99`
- Password: `nazrulNDC99`

### Important URLs
- Local Dev: http://localhost:3000
- Supabase Dashboard: https://app.supabase.com
- Vercel Dashboard: https://vercel.com/dashboard
- OpenAI Platform: https://platform.openai.com

### Support Documentation
- Full docs: README.md
- Quick start: QUICK_START.md
- Deployment: DEPLOYMENT_GUIDE.md
- Project overview: PROJECT_SUMMARY.md

---

**Status**: [ ] Setup Complete | [ ] Deployment Complete | [ ] Production Ready
