import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { 
      name, 
      name_bangla, 
      email, 
      mobile, 
      membership_type, 
      batch, 
      group,
      roll_no,
      image_url,
      blood_group,
      birthday_month,
      birthday_day,
      higher_study_1,
      hs_1_institute,
      higher_study_2,
      hs_2_institute,
      school,
      home_district,
      organization,
      position,
      department,
      profession,
      nrb_country,
      living_in_area,
      job_location,
      other_club_member,
      remarks
    } = body;

    if (!name || !email || !mobile || !membership_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('members')
      .update({
        name: name.trim(),
        name_bangla: name_bangla?.trim() || null,
        email: email.trim(),
        mobile: mobile.trim(),
        membership_type,
        batch: batch?.trim() || null,
        group: group?.trim() || null,
        roll_no: roll_no?.trim() || null,
        image_url: image_url || null,
        blood_group: blood_group?.trim() || null,
        birthday_month: birthday_month ? parseInt(birthday_month) : null,
        birthday_day: birthday_day ? parseInt(birthday_day) : null,
        higher_study_1: higher_study_1?.trim() || null,
        hs_1_institute: hs_1_institute?.trim() || null,
        higher_study_2: higher_study_2?.trim() || null,
        hs_2_institute: hs_2_institute?.trim() || null,
        school: school?.trim() || null,
        home_district: home_district?.trim() || null,
        organization: organization?.trim() || null,
        position: position?.trim() || null,
        department: department?.trim() || null,
        profession: profession?.trim() || null,
        nrb_country: nrb_country?.trim() || null,
        living_in_area: living_in_area?.trim() || null,
        job_location: job_location?.trim() || null,
        other_club_member: other_club_member?.trim() || null,
        remarks: remarks?.trim() || null
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Update member error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update member' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin
      .from('members')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete member error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete member' },
      { status: 500 }
    );
  }
}
