# Deploy to Contabo VPS - Complete Guide

## Why Contabo Solves the IP Whitelist Issue

✅ **Static IP Address**: Contabo VPS provides a **permanent static IP** that won't change
✅ **No IP Whitelist Problems**: You can whitelist your Contabo IP once in BulkSMSBD and it will work permanently
✅ **Full Control**: You have complete control over the server environment
✅ **Cost Effective**: Contabo VPS is very affordable

## Comparison: Vercel vs Contabo

| Feature | Vercel | Contabo VPS |
|---------|--------|-------------|
| **IP Address** | Dynamic (changes) | Static (permanent) |
| **IP Whitelist** | ❌ Problematic | ✅ Works perfectly |
| **Setup Complexity** | Easy (automatic) | Medium (manual) |
| **Scaling** | Automatic | Manual |
| **Cost** | Free tier available | Low cost (~€5-10/month) |
| **Maintenance** | None | You manage it |
| **SSL Certificate** | Automatic | Need to set up (Let's Encrypt) |
| **Domain Setup** | Easy | Manual DNS configuration |

## Prerequisites

1. **Contabo VPS** (Ubuntu 22.04 or 20.04 recommended)
2. **Domain name** (optional, but recommended)
3. **SSH access** to your Contabo server
4. **Basic Linux knowledge**

## Step-by-Step Deployment Guide

### Step 1: Set Up Your Contabo VPS

1. **Order a VPS** from Contabo
   - Minimum: 2 vCPU, 4GB RAM, 50GB SSD
   - Recommended: 4 vCPU, 8GB RAM, 100GB SSD
   - OS: Ubuntu 22.04 LTS

2. **Get Your Server Details**
   - IP Address (this is your static IP!)
   - Root password
   - SSH access information

3. **Note Your Static IP**
   - This is the IP you'll whitelist in BulkSMSBD
   - Example: `185.xxx.xxx.xxx` (your Contabo IP)

### Step 2: Connect to Your Server

```bash
# Connect via SSH
ssh root@YOUR_CONTABO_IP

# Or if you have a username
ssh username@YOUR_CONTABO_IP
```

### Step 3: Install Required Software

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 (process manager for Node.js)
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

### Step 4: Clone Your Repository

```bash
# Create app directory
mkdir -p /var/www/campaign-manager
cd /var/www/campaign-manager

# Clone your repository
git clone https://github.com/mdKamrul-h/campaign-manager.git .

# Or if you need to set up SSH keys first
# git clone git@github.com:mdKamrul-h/campaign-manager.git .
```

### Step 5: Install Dependencies

```bash
cd /var/www/campaign-manager
npm install
```

### Step 6: Set Up Environment Variables

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

# App URL (IMPORTANT: Use your domain or Contabo IP)
NEXTAUTH_URL=https://your-domain.com
# OR if no domain: http://YOUR_CONTABO_IP:3000

# Social Media (if using)
FACEBOOK_APP_ID=your_id
FACEBOOK_APP_SECRET=your_secret
LINKEDIN_CLIENT_ID=your_id
LINKEDIN_CLIENT_SECRET=your_secret
```

Save and exit (Ctrl+X, then Y, then Enter)

### Step 7: Build the Application

```bash
cd /var/www/campaign-manager
npm run build
```

### Step 8: Set Up PM2 to Run the App

```bash
# Start the app with PM2
pm2 start npm --name "campaign-manager" -- start

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions it provides
```

### Step 9: Configure Nginx as Reverse Proxy

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/campaign-manager
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or use your Contabo IP

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

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Step 10: Set Up SSL Certificate (Let's Encrypt)

If you have a domain:

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com

# Certbot will automatically configure Nginx and set up auto-renewal
```

### Step 11: Whitelist Your Contabo IP in BulkSMSBD

1. **Get Your Contabo IP**
   ```bash
   # On your Contabo server, run:
   curl ifconfig.me
   # This shows your public IP (your static Contabo IP)
   ```

2. **Whitelist in BulkSMSBD**
   - Log into BulkSMSBD dashboard
   - Go to "Phonebook" or "IP Whitelist"
   - Add your Contabo IP (e.g., `185.xxx.xxx.xxx`)
   - Save

3. **Test SMS Sending**
   - Your SMS should now work without IP whitelist errors!

### Step 12: Set Up Firewall

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

### Step 13: Configure Domain DNS (If Using Domain)

If you're using a domain name:

1. **Point DNS to Your Contabo IP**
   - Go to your domain registrar
   - Add an A record:
     - Type: `A`
     - Name: `@` or `campaign` (for subdomain)
     - Value: `YOUR_CONTABO_IP`
     - TTL: `3600`

2. **Wait for DNS Propagation** (can take up to 48 hours)

3. **Update NEXTAUTH_URL** in `.env.local`:
   ```bash
   NEXTAUTH_URL=https://your-domain.com
   ```

4. **Rebuild and restart**:
   ```bash
   cd /var/www/campaign-manager
   npm run build
   pm2 restart campaign-manager
   ```

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

## Environment Variables Management

### Update Environment Variables
```bash
# Edit .env.local
nano /var/www/campaign-manager/.env.local

# After editing, rebuild and restart
npm run build
pm2 restart campaign-manager
```

## Security Best Practices

1. **Change Default SSH Port** (optional but recommended)
2. **Use SSH Keys** instead of passwords
3. **Keep system updated**: `apt update && apt upgrade`
4. **Set up fail2ban** for brute force protection
5. **Regular backups** of your application and database

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

### Can't Access Application
```bash
# Check firewall
ufw status

# Check if app is running
pm2 status

# Check if Nginx is running
systemctl status nginx
```

## Benefits of Contabo for SMS

✅ **Static IP**: Whitelist once, works forever
✅ **No IP Changes**: Your IP won't change on deployments
✅ **Reliable**: No need to contact BulkSMSBD support repeatedly
✅ **Cost Effective**: Contabo VPS is very affordable
✅ **Full Control**: You control everything

## Next Steps After Deployment

1. ✅ Whitelist your Contabo IP in BulkSMSBD
2. ✅ Test SMS sending - should work without errors!
3. ✅ Set up monitoring (optional)
4. ✅ Configure backups (optional)
5. ✅ Set up domain with SSL (if using domain)

## Your Static IP

Once deployed, your Contabo server will have a static IP like:
- `185.xxx.xxx.xxx` (example)

**This IP will never change**, so you can whitelist it in BulkSMSBD and it will work permanently!
