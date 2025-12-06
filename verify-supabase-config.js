/**
 * Supabase Configuration Verification Script
 * Run this to check if your Supabase configuration is correct
 * 
 * Usage: node verify-supabase-config.js
 */

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🔍 Verifying Supabase Configuration...\n');
console.log('=' .repeat(50));

// Check if variables exist
console.log('\n1. Environment Variables Check:');
console.log('-'.repeat(50));

if (!supabaseUrl) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL: MISSING');
} else {
  console.log('✅ NEXT_PUBLIC_SUPABASE_URL: Found');
  console.log(`   Value: ${supabaseUrl}`);
  
  // Validate URL format
  if (!supabaseUrl.startsWith('https://')) {
    console.log('   ⚠️  WARNING: URL should start with https://');
  }
  if (!supabaseUrl.includes('.supabase.co')) {
    console.log('   ⚠️  WARNING: URL should contain .supabase.co');
  }
}

if (!supabaseAnonKey) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY: MISSING');
} else {
  console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: Found');
  console.log(`   Value: ${supabaseAnonKey.substring(0, 20)}...`);
}

if (!supabaseServiceRoleKey) {
  console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY: Not set (optional, but recommended)');
} else {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY: Found');
  console.log(`   Value: ${supabaseServiceRoleKey.substring(0, 20)}...`);
}

// Test connection
console.log('\n2. Connection Test:');
console.log('-'.repeat(50));

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Cannot test connection - missing required variables');
  process.exit(1);
}

// Extract project ID from URL
const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!urlMatch) {
  console.log('❌ Invalid URL format');
  console.log('   Expected: https://xxxxx.supabase.co');
  console.log(`   Got: ${supabaseUrl}`);
  process.exit(1);
}

const projectId = urlMatch[1];
console.log(`   Project ID: ${projectId}`);

// Test DNS resolution
const dns = require('dns');
const { promisify } = require('util');
const lookup = promisify(dns.lookup);

lookup(`${projectId}.supabase.co`)
  .then((address) => {
    console.log(`✅ DNS Resolution: Success`);
    console.log(`   IP Address: ${address.address}`);
    
    // Test HTTP connection
    const https = require('https');
    const url = new URL(supabaseUrl);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/',
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      timeout: 5000
    };
    
    console.log('\n3. HTTP Connection Test:');
    console.log('-'.repeat(50));
    console.log('   Testing connection to Supabase API...');
    
    const req = https.request(options, (res) => {
      if (res.statusCode === 200 || res.statusCode === 401) {
        // 401 is expected (means server is reachable, just needs auth)
        console.log(`✅ HTTP Connection: Success (Status: ${res.statusCode})`);
        console.log('\n✅ All checks passed! Your Supabase configuration looks correct.');
        console.log('\nIf you\'re still getting errors:');
        console.log('1. Make sure your Supabase project is active (not paused)');
        console.log('2. Restart your development server: npm run dev');
        console.log('3. Check the Supabase dashboard to verify the project exists');
      } else {
        console.log(`⚠️  HTTP Connection: Status ${res.statusCode}`);
      }
    });
    
    req.on('error', (error) => {
      console.log(`❌ HTTP Connection: Failed`);
      console.log(`   Error: ${error.message}`);
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check if your Supabase project exists');
      console.log('   - Verify the project is not paused');
      console.log('   - Check your internet connection');
      console.log('   - Try accessing: https://' + url.hostname);
    });
    
    req.on('timeout', () => {
      console.log('❌ HTTP Connection: Timeout');
      req.destroy();
    });
    
    req.end();
  })
  .catch((error) => {
    console.log(`❌ DNS Resolution: Failed`);
    console.log(`   Error: ${error.message}`);
    console.log('\n💡 This means the Supabase project URL is incorrect or the project doesn\'t exist.');
    console.log('\n📋 Steps to fix:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Check if your project exists');
    console.log('3. If not, create a new project');
    console.log('4. Go to Settings → API');
    console.log('5. Copy the Project URL (should be: https://xxxxx.supabase.co)');
    console.log('6. Update NEXT_PUBLIC_SUPABASE_URL in .env.local');
    console.log('7. Restart your development server');
  });



