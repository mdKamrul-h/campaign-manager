import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Get all batches with member counts
 * Includes members with NULL batch as "No Batch"
 */
export async function GET() {
  try {
    // Get ALL members (including those without batch)
    const { data: members, error } = await supabaseAdmin
      .from('members')
      .select('batch');

    if (error) {
      console.error('Error fetching batches:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch batches' },
        { status: 500 }
      );
    }

    // Count members per batch (including NULL as "No Batch")
    const batchCounts: Record<string, number> = {};
    let totalCount = 0;

    (members || []).forEach((member) => {
      totalCount++;
      const batch = member.batch?.trim() || null;
      const batchKey = batch || '(No Batch)';
      batchCounts[batchKey] = (batchCounts[batchKey] || 0) + 1;
    });

    // Convert to array format
    const batches = Object.entries(batchCounts).map(([batch, count]) => ({
      batch: batch === '(No Batch)' ? null : batch, // Return null for display
      batchDisplay: batch, // Display name
      count,
    }));

    // Sort by batch name (null/No Batch at the end)
    batches.sort((a, b) => {
      if (a.batch === null) return 1;
      if (b.batch === null) return -1;
      return a.batch.localeCompare(b.batch);
    });

    return NextResponse.json({
      batches,
      totalMembers: totalCount,
      totalWithBatch: totalCount - (batchCounts['(No Batch)'] || 0),
      totalWithoutBatch: batchCounts['(No Batch)'] || 0,
    });
  } catch (error: any) {
    console.error('Get batches error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch batches' },
      { status: 500 }
    );
  }
}





