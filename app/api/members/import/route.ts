import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseExcelFile } from '@/lib/xlsx-utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(fileExtension || '')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    // Read Excel file using utility function
    const arrayBuffer = await file.arrayBuffer();
    const data = await parseExcelFile(arrayBuffer);

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'Excel file is empty' },
        { status: 400 }
      );
    }

    // Process each row
    const members = [];
    const errors = [];
    const imageUploadPromises = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 because Excel rows start at 1 and we skip header

      try {
        // Map Excel columns to member fields
        // Support various column name variations
        const name = row['Name'] || row['name'] || row['Full Name'] || row['FullName'] || '';
        const email = row['Email'] || row['email'] || row['E-mail'] || '';
        const mobile = row['Mobile'] || row['mobile'] || row['Phone'] || row['phone'] || row['Phone Number'] || '';
        const membershipType = (row['Membership Type'] || row['membership_type'] || row['Membership'] || row['Type'] || 'GM').toString().toUpperCase();
        const batch = row['Batch'] || row['batch'] || '';
        const imageUrl = row['Image URL'] || row['image_url'] || row['Image'] || row['Photo'] || '';

        // Validate required fields
        if (!name || !email || !mobile) {
          errors.push({
            row: rowNumber,
            error: `Missing required fields: ${!name ? 'Name' : ''} ${!email ? 'Email' : ''} ${!mobile ? 'Mobile' : ''}`.trim()
          });
          continue;
        }

        // Validate membership type
        const validMembershipTypes = ['GM', 'LM', 'FM', 'OTHER'];
        const membership_type = validMembershipTypes.includes(membershipType) ? membershipType : 'GM';

        // Handle image if provided as base64 or URL
        let finalImageUrl = imageUrl;

        // If image is base64, upload to Supabase Storage
        if (imageUrl && imageUrl.startsWith('data:image')) {
          try {
            const base64Data = imageUrl.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            const imageExt = imageUrl.match(/data:image\/(\w+);base64/)?.[1] || 'png';
            const imageFileName = `member-images/${Date.now()}-${Math.random().toString(36).substring(7)}.${imageExt}`;

            const { error: uploadError } = await supabaseAdmin.storage
              .from('campaign-files')
              .upload(imageFileName, imageBuffer, {
                contentType: `image/${imageExt}`,
                upsert: false,
              });

            if (!uploadError) {
              const { data: { publicUrl } } = supabaseAdmin.storage
                .from('campaign-files')
                .getPublicUrl(imageFileName);
              finalImageUrl = publicUrl;
            }
          } catch (imgError) {
            console.error(`Error uploading image for row ${rowNumber}:`, imgError);
            // Continue without image if upload fails
          }
        }

        members.push({
          name: name.toString().trim(),
          email: email.toString().trim(),
          mobile: mobile.toString().trim(),
          membership_type,
          batch: batch ? batch.toString().trim() : null,
          image_url: finalImageUrl || null
        });
      } catch (rowError: any) {
        errors.push({
          row: rowNumber,
          error: rowError.message || 'Invalid row data'
        });
      }
    }

    if (members.length === 0) {
      return NextResponse.json(
        { error: 'No valid members found in the Excel file', errors },
        { status: 400 }
      );
    }

    // Insert members into database
    const { data: insertedMembers, error: insertError } = await supabaseAdmin
      .from('members')
      .insert(members)
      .select();

    if (insertError) {
      console.error('Bulk insert error:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to import members', errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: insertedMembers?.length || 0,
      total: members.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import members' },
      { status: 500 }
    );
  }
}



