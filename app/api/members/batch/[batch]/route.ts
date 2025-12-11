import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Get members by batch
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { batch: string } }
) {
  try {
    const batch = decodeURIComponent(params.batch);

    // Handle "No Batch" case (members with NULL batch)
    let query = supabaseAdmin
      .from('members')
      .select('id, name, name_bangla, email, mobile, membership_type, batch, image_url, created_at, updated_at');

    if (batch === '' || batch === '(No Batch)' || !batch) {
      // Get members with NULL or empty batch
      query = query.or('batch.is.null,batch.eq.');
    } else {
      query = query.eq('batch', batch);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error('Error fetching members by batch:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch members' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Get members by batch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch members' },
      { status: 500 }
    );
  }
}





