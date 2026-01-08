# Namecheap Hosting for SMS Campaigns - Complete Guide

## Quick Answer: Yes, But It Depends on the Plan! ✅

## Namecheap Hosting Options

### Option 1: Shared Hosting
- ❌ **Default**: Shared IP (multiple websites share the same IP)
- ✅ **Dedicated IP Available**: Yes, for **$4/month extra**
- ⚠️ **Problem**: Shared hosting is typically designed for PHP/static sites, **not ideal for Node.js/Next.js apps**
- ⚠️ **Limitation**: May not support Node.js runtime or PM2

### Option 2: VPS Hosting (Recommended)
- ✅ **Static IP Included**: Comes with 1 static IP by default
- ✅ **Full Control**: Root access, install anything
- ✅ **Node.js Support**: Can install Node.js, PM2, Nginx
- ✅ **Perfect for Next.js**: Full control over the server

## Comparison: Namecheap vs Contabo vs Vercel

| Feature | Namecheap Shared | Namecheap VPS | Contabo VPS | Vercel |
|---------|------------------|---------------|-------------|--------|
| **Static IP** | ⚠️ $4/month extra | ✅ Included | ✅ Included | ❌ No |
| **Node.js Support** | ❌ Limited/No | ✅ Yes | ✅ Yes | ✅ Yes |
| **Setup Difficulty** | Easy | Medium | Medium | Easy |
| **Cost** | $2-5/month + $4/IP | $6-15/month | €5-10/month | Free/$20 |
| **SMS Compatibility** | ⚠️ If dedicated IP | ✅ Yes | ✅ Yes | ❌ No |
| **Full Control** | ❌ No | ✅ Yes | ✅ Yes | ❌ No |

## Recommendation: Use Namecheap VPS (Not Shared Hosting)

**Why VPS?**
- ✅ Static IP included (no extra cost)
- ✅ Can run Node.js/Next.js properly
- ✅ Full root access
- ✅ Similar to Contabo setup

**Why NOT Shared Hosting?**
- ❌ Not designed for Node.js apps
- ❌ Need to pay extra for dedicated IP
- ❌ Limited control
- ❌ May not support PM2 or custom Node.js processes

## Namecheap VPS Deployment Guide

### Step 1: Order Namecheap VPS

1. Go to https://www.namecheap.com/hosting/vps/
2. Choose a plan:
   - **Minimum**: VPS Pulsar (2 vCPU, 2GB RAM) - ~$6/month
   - **Recommended**: VPS Quasar (4 vCPU, 6GB RAM) - ~$12/month
3. Select **Ubuntu 22.04 LTS** as OS
4. Complete purchase

### Step 2: Get Your Server Details

After purchase, you'll receive:
- **IP Address** (this is your static IP!)
- **Root password**
- **SSH access information**

**Important**: Note your static IP - you'll whitelist this in BulkSMSBD!

### Step 3: Connect to Your Server

```bash
# Connect via SSH
ssh root@YOUR_NAMECHEAP_IP

# Or if you created a user
ssh username@YOUR_NAMECHEAP_IP
```

### Step 4: Install Required Software

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (web server)
apt install -y nginx

# Install Git
apt install -y git

# Verify installations
node --version  # Should show v20.x
npm --version
pm2 --version
nginx -v
```

### Step 5: Clone Your Repository

```bash
# Create app directory
mkdir -p /var/www/campaign-manager
cd /var/www/campaign-manager

# Clone your repository
git clone https://github.com/mdKamrul-h/campaign-manager.git .

# Or if using SSH
# git clone git@github.com:mdKamrul-h/campaign-manager.git .
```

### Step 6: Install Dependencies

```bash
cd /var/www/campaign-manager
npm install
```

### Step 7: Set Up Environment Variables

```bash
# Create .env.local file
nano .env.local
```

Add all your environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=sk-your_key

# Email (Resend)
RESEND_API_KEY=re_your_key
FROM_EMAIL=Mallick NDC99 Ballot 7 <vote@mallicknazrul.com>
REPLY_TO_EMAIL=vote@mallicknazrul.com

# SMS (BulkSMSBD)
BULKSMSBD_API_KEY=your_key
SMS_SENDER_ID=MALLICK NDC
BULKSMSBD_API_URL=http://bulksmsbd.net/api

# App URL (IMPORTANT: Use your domain or Namecheap IP)
NEXTAUTH_URL=https://your-domain.com
# OR if no domain: http://YOUR_NAMECHEAP_IP:3000

# Social Media (if using)
FACEBOOK_APP_ID=your_id
FACEBOOK_APP_SECRET=your_secret
LINKEDIN_CLIENT_ID=your_id
LINKEDIN_CLIENT_SECRET=your_secret
```

Save and exit (Ctrl+X, then Y, then Enter)

### Step 8: Build the Application

```bash
cd /var/www/campaign-manager
npm run build
```

### Step 9: Set Up PM2 to Run the App

```bash
# Start the app with PM2
pm2 start npm --name "campaign-manager" -- start

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions it provides (usually involves running a command it shows)
```

### Step 10: Configure Nginx as Reverse Proxy

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/campaign-manager
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or use your Namecheap IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and enable:

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/campaign-manager /etc/nginx/sites-enabled/

# Remove default Nginx site (optional)
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Step 11: Set Up SSL Certificate (Let's Encrypt)

If you have a domain:

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com

# Certbot will automatically configure Nginx and set up auto-renewal
```

### Step 12: Whitelist Your Namecheap IP in BulkSMSBD

1. **Get Your Namecheap IP**
   ```bash
   # On your Namecheap server, run:
   curl ifconfig.me
   # This shows your public IP (your static Namecheap IP)
   ```

2. **Whitelist in BulkSMSBD**
   - Log into BulkSMSBD dashboard
   - Go to "Phonebook" or "IP Whitelist"
   - Add your Namecheap IP (e.g., `185.xxx.xxx.xxx`)
   - Save

3. **Test SMS Sending**
   - Your SMS should now work without IP whitelist errors!

### Step 13: Set Up Firewall

```bash
# Install UFW (firewall)
apt install -y ufw

# Allow SSH
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

## Namecheap Shared Hosting (Not Recommended)

If you're considering shared hosting (not recommended for Next.js):

### Limitations:
- ❌ May not support Node.js runtime
- ❌ Limited control over server
- ❌ Need to pay $4/month extra for dedicated IP
- ❌ May not support PM2 or custom processes
- ❌ Designed for PHP/static sites

### If You Must Use Shared Hosting:
1. Contact Namecheap support to confirm Node.js support
2. Order dedicated IP ($4/month extra)
3. Follow cPanel deployment (if available)
4. May need to use different deployment method

**Better option**: Use Namecheap VPS instead!

## Cost Comparison

| Hosting | Plan | Monthly Cost | Static IP | Node.js |
|---------|------|--------------|-----------|---------|
| **Namecheap Shared** | Stellar | $2-5 | +$4/month | ❌ Limited |
| **Namecheap VPS** | Pulsar | $6 | ✅ Included | ✅ Yes |
| **Namecheap VPS** | Quasar | $12 | ✅ Included | ✅ Yes |
| **Contabo VPS** | VPS S | €5 (~$5.50) | ✅ Included | ✅ Yes |
| **Vercel** | Hobby | Free | ❌ No | ✅ Yes |

## Managing Your Application

### View Logs
```bash
# PM2 logs
pm2 logs campaign-manager

# Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Restart Application
```bash
pm2 restart campaign-manager
```

### Update Application
```bash
cd /var/www/campaign-manager
git pull origin main
npm install
npm run build
pm2 restart campaign-manager
```

### Check Application Status
```bash
pm2 status
pm2 monit
```

## Troubleshooting

### Application Not Starting
```bash
# Check PM2 logs
pm2 logs campaign-manager

# Check if port 3000 is in use
netstat -tulpn | grep 3000

# Restart PM2
pm2 restart all
```

### Nginx Not Working
```bash
# Check Nginx status
systemctl status nginx

# Test configuration
nginx -t

# Check error logs
tail -f /var/log/nginx/error.log
```

## Benefits of Namecheap VPS for SMS

✅ **Static IP Included**: No extra cost for dedicated IP
✅ **Reliable**: Your IP won't change
✅ **One-Time Whitelist**: Whitelist once in BulkSMSBD, works forever
✅ **Full Control**: Install anything you need
✅ **Node.js Support**: Perfect for Next.js apps
✅ **Cost Effective**: Starting at $6/month

## Recommendation

**Use Namecheap VPS** (not shared hosting) because:
- ✅ Static IP included (solves BulkSMSBD whitelist issue)
- ✅ Full Node.js support
- ✅ Similar setup to Contabo
- ✅ Affordable pricing
- ✅ Reliable for SMS campaigns

**Avoid Namecheap Shared Hosting** for Next.js apps - it's not designed for Node.js applications.

## Next Steps

1. ✅ Order Namecheap VPS (Ubuntu 22.04)
2. ✅ Deploy your Next.js app (follow steps above)
3. ✅ Get your static IP from Namecheap
4. ✅ Whitelist IP in BulkSMSBD (one time!)
5. ✅ Test SMS - should work without errors!

Your static IP from Namecheap VPS will never change, so SMS campaigns will work reliably! 🎉











