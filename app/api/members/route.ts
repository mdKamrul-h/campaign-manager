import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch all members using pagination to ensure we get everything
    // Supabase has default limits, so we paginate to get all members
    let allMembers: any[] = [];
    let page = 0;
    const pageSize = 1000; // Supabase's typical max per request
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabaseAdmin
        .from('members')
        .select('id, name, name_bangla, email, mobile, membership_type, batch, image_url, blood_group, higher_study, school, home_district, organization, position, department, profession, nrb_country, living_in_area, other_club_member, created_at, updated_at')
        .order('name', { ascending: true }) // Order by name to ensure consistent ordering
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error(`Error fetching members (page ${page}):`, error);
        console.error('Supabase error details:', JSON.stringify(error, null, 2));
        // Continue with what we have so far
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allMembers = allMembers.concat(data);
        // If we got fewer than pageSize, we've reached the end
        hasMore = data.length === pageSize;
        page++;
      }
    }

    console.log(`Fetched ${allMembers.length} members across ${page} pages`);

    // Check if name_bangla column is missing from response
    if (allMembers.length > 0) {
      const firstMember = allMembers[0];
      if (!('name_bangla' in firstMember)) {
        console.error('⚠️ WARNING: name_bangla column is NOT being returned by Supabase!');
        console.error('This means the column might not exist in the database or there is a column name mismatch.');
        console.error('Member keys received:', Object.keys(firstMember));
        console.error('Expected keys should include: name_bangla');
      }

      // Debug: Log sample member to verify name_bangla is included
      console.log('Sample member from API:', {
        id: firstMember.id,
        name: firstMember.name,
        hasNameBangla: 'name_bangla' in firstMember,
        name_bangla: firstMember.name_bangla,
        name_bangla_type: typeof firstMember.name_bangla,
        allKeys: Object.keys(firstMember)
      });
    }

    return NextResponse.json(allMembers);
  } catch (error: any) {
    console.error('Get members error:', error);
    return NextResponse.json([], { status: 200 }); // Return empty array on error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      name_bangla, 
      email, 
      mobile, 
      membership_type, 
      batch, 
      image_url,
      blood_group,
      higher_study,
      school,
      home_district,
      organization,
      position,
      department,
      profession,
      nrb_country,
      living_in_area,
      other_club_member
    } = body;

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
        image_url: image_url || null,
        blood_group: blood_group?.trim() || null,
        higher_study: higher_study?.trim() || null,
        school: school?.trim() || null,
        home_district: home_district?.trim() || null,
        organization: organization?.trim() || null,
        position: position?.trim() || null,
        department: department?.trim() || null,
        profession: profession?.trim() || null,
        nrb_country: nrb_country?.trim() || null,
        living_in_area: living_in_area?.trim() || null,
        other_club_member: other_club_member?.trim() || null
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
