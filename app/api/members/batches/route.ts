import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Get all batches with member counts
 * Includes members with NULL batch as "No Batch"
 */
export async function GET() {
  try {
    // Get ALL members (including those without batch) using pagination
    // Supabase has a default limit, so we need to fetch in chunks
    let allMembers: Array<{ batch: string | null }> = [];
    let page = 0;
    const pageSize = 1000; // Supabase's typical max per request
    let hasMore = true;

    while (hasMore) {
      const { data: members, error } = await supabaseAdmin
        .from('members')
        .select('batch')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error(`Error fetching batches (page ${page}):`, error);
        // Continue with what we have so far
        break;
      }

      if (!members || members.length === 0) {
        hasMore = false;
      } else {
        allMembers = allMembers.concat(members);
        // If we got fewer than pageSize, we've reached the end
        hasMore = members.length === pageSize;
        page++;
      }
    }

    console.log(`Fetched ${allMembers.length} members across ${page} pages for batch counting`);

    // Count members per batch (including NULL as "No Batch")
    const batchCounts: Record<string, number> = {};
    let totalCount = 0;

    allMembers.forEach((member) => {
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





