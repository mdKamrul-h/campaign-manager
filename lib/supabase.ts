import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

// Validate URL format
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  console.error('⚠️ Invalid Supabase URL format. Expected: https://xxxxx.supabase.co');
  console.error('Current URL:', supabaseUrl);
  console.error('Please check your NEXT_PUBLIC_SUPABASE_URL in .env.local');
}

/**
 * Client-side Supabase client (uses anon key, respects RLS policies)
 * Use this in React components and client-side code
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-side Supabase client (uses service_role key, bypasses RLS)
 * Use this ONLY in API routes and server-side code for admin operations
 * 
 * IMPORTANT: 
 * - Service role key bypasses all RLS policies
 * - Only use in server-side code (API routes)
 * - Never expose in client-side code
 * - If service_role key is not set, falls back to anon key (will respect RLS)
 */
let supabaseAdmin: SupabaseClient;

if (supabaseServiceRoleKey) {
  // Use service_role key for admin operations (bypasses RLS)
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else {
  // Fallback to anon key if service_role is not set (will respect RLS)
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is not set.');
  console.warn('⚠️ Admin operations will use anon key and respect RLS policies.');
  console.warn('⚠️ Get service_role key from: Supabase Dashboard → Settings → API → service_role key');
  console.warn('⚠️ For production, it is recommended to use service_role key in API routes.');
  
  supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export { supabaseAdmin };
