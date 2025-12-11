import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000); // Load all members at once (increased limit for large datasets)

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json([], { status: 200 }); // Return empty array instead of error
    }

    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error: any) {
    console.error('Get members error:', error);
    return NextResponse.json([], { status: 200 }); // Return empty array on error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, name_bangla, email, mobile, membership_type, batch, image_url } = body;

    if (!name || !email || !mobile || !membership_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, mobile, and membership_type are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('members')
      .insert([{
        name: name.trim(),
        name_bangla: name_bangla?.trim() || null,
        email: email.trim(),
        mobile: mobile.trim(),
        membership_type,
        batch: batch?.trim() || null,
        image_url: image_url || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Create member error:', error);
    
    // Provide helpful error messages for common issues
    let errorMessage = error.message || 'Failed to create member';
    
    if (error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo')) {
      errorMessage = 'Cannot connect to Supabase. Please check your NEXT_PUBLIC_SUPABASE_URL in .env.local. The project might not exist or the URL is incorrect.';
    } else if (error.message?.includes('fetch failed')) {
      errorMessage = 'Network error connecting to Supabase. Check your internet connection and Supabase project status.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
