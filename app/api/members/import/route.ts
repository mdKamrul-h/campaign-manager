import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseExcelFile, parseCSVFile } from '@/lib/xlsx-utils';

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
    const isExcel = ['xlsx', 'xls'].includes(fileExtension || '');
    const isCSV = fileExtension === 'csv';

    if (!isExcel && !isCSV) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls) or CSV file (.csv)' },
        { status: 400 }
      );
    }

    // Read file based on type
    let data: any[];
    if (isCSV) {
      const text = await file.text();
      data = await parseCSVFile(text);
    } else {
      const arrayBuffer = await file.arrayBuffer();
      data = await parseExcelFile(arrayBuffer);
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      );
    }

    // Fetch existing members to check for duplicates
    // We'll check by email (primary) and mobile (secondary)
    const { data: existingMembers } = await supabaseAdmin
      .from('members')
      .select('email, mobile');

    const existingEmails = new Set(
      (existingMembers || []).map(m => m.email?.toLowerCase().trim()).filter(Boolean)
    );
    const existingMobiles = new Set(
      (existingMembers || []).map(m => m.mobile?.trim()).filter(Boolean)
    );

    // Process each row
    const members = [];
    const errors = [];
    const skipped = [];
    const imageUploadPromises = [];
    
    // Track emails and mobiles within the current file to prevent duplicates in the same import
    const fileEmails = new Set<string>();
    const fileMobiles = new Set<string>();

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

        // Normalize email and mobile
        const emailLower = email.toString().trim().toLowerCase();
        const mobileTrimmed = mobile.toString().trim();
        
        // Check for duplicates in database
        if (existingEmails.has(emailLower) || existingMobiles.has(mobileTrimmed)) {
          skipped.push({
            row: rowNumber,
            name: name.toString().trim(),
            email: email.toString().trim(),
            mobile: mobileTrimmed,
            reason: existingEmails.has(emailLower) ? 'Email already exists in database' : 'Mobile already exists in database'
          });
          continue;
        }
        
        // Check for duplicates within the same file
        if (fileEmails.has(emailLower) || fileMobiles.has(mobileTrimmed)) {
          skipped.push({
            row: rowNumber,
            name: name.toString().trim(),
            email: email.toString().trim(),
            mobile: mobileTrimmed,
            reason: fileEmails.has(emailLower) ? 'Duplicate email in this file' : 'Duplicate mobile in this file'
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

        // Map additional fields from CSV/Excel
        const nameBangla = row['Name (Bangla)'] || row['name_bangla'] || row['Name Bangla'] || '';
        const bloodGroup = row['Blood Group'] || row['blood_group'] || '';
        const higherStudy1 = row['Higher Study 1'] || row['higher_study_1'] || '';
        const hs1Institute = row['HS 1 Institute'] || row['hs_1_institute'] || '';
        const higherStudy2 = row['Higher Study 2'] || row['higher_study_2'] || '';
        const hs2Institute = row['HS 2 Institute'] || row['hs_2_institute'] || '';
        const school = row['School'] || row['school'] || '';
        const homeDistrict = row['Home District'] || row['home_district'] || '';
        const organization = row['Organization'] || row['organization'] || '';
        const position = row['Position'] || row['position'] || '';
        const department = row['Department'] || row['department'] || '';
        const profession = row['Profession'] || row['profession'] || '';
        const nrbCountry = row['NRB Country'] || row['nrb_country'] || '';
        const livingInArea = row['Living in Area'] || row['living_in_area'] || '';
        const otherClubMember = row['Other Club Member'] || row['other_club_member'] || '';
        const remarks = row['Remarks'] || row['remarks'] || '';

        members.push({
          name: name.toString().trim(),
          name_bangla: nameBangla ? nameBangla.toString().trim() : null,
          email: email.toString().trim(),
          mobile: mobile.toString().trim(),
          membership_type,
          batch: batch ? batch.toString().trim() : null,
          image_url: finalImageUrl || null,
          blood_group: bloodGroup ? bloodGroup.toString().trim() : null,
          higher_study_1: higherStudy1 ? higherStudy1.toString().trim() : null,
          hs_1_institute: hs1Institute ? hs1Institute.toString().trim() : null,
          higher_study_2: higherStudy2 ? higherStudy2.toString().trim() : null,
          hs_2_institute: hs2Institute ? hs2Institute.toString().trim() : null,
          school: school ? school.toString().trim() : null,
          home_district: homeDistrict ? homeDistrict.toString().trim() : null,
          organization: organization ? organization.toString().trim() : null,
          position: position ? position.toString().trim() : null,
          department: department ? department.toString().trim() : null,
          profession: profession ? profession.toString().trim() : null,
          nrb_country: nrbCountry ? nrbCountry.toString().trim() : null,
          living_in_area: livingInArea ? livingInArea.toString().trim() : null,
          other_club_member: otherClubMember ? otherClubMember.toString().trim() : null,
          remarks: remarks ? remarks.toString().trim() : null
        });

        // Add to file sets to prevent duplicates within the same import
        fileEmails.add(emailLower);
        fileMobiles.add(mobileTrimmed);
      } catch (rowError: any) {
        errors.push({
          row: rowNumber,
          error: rowError.message || 'Invalid row data'
        });
      }
    }

    if (members.length === 0) {
      return NextResponse.json(
        { 
          error: 'No new members to import', 
          errors: errors.length > 0 ? errors : undefined,
          skipped: skipped.length > 0 ? skipped : undefined,
          skippedCount: skipped.length
        },
        { status: 400 }
      );
    }

    // Insert members one by one to handle constraint violations gracefully
    // This allows us to identify which specific member caused the issue
    const insertedMembers = [];
    const insertErrors = [];
    
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('members')
        .insert([member])
        .select()
        .single();

      if (insertError) {
        // Check if it's a unique constraint violation
        if (insertError.code === '23505' || insertError.message?.includes('unique constraint')) {
          // Extract which field caused the violation
          let reason = 'Duplicate entry';
          if (insertError.message?.includes('email')) {
            reason = 'Email already exists';
          } else if (insertError.message?.includes('mobile')) {
            reason = 'Mobile already exists';
          }
          
          skipped.push({
            row: i + 2, // Approximate row number
            name: member.name,
            email: member.email,
            mobile: member.mobile,
            reason: reason
          });
          
          // Add to existing sets to prevent retrying
          existingEmails.add(member.email?.toLowerCase().trim() || '');
          existingMobiles.add(member.mobile?.trim() || '');
        } else {
          insertErrors.push({
            row: i + 2,
            name: member.name,
            email: member.email,
            error: insertError.message || 'Insert failed'
          });
        }
      } else if (inserted) {
        insertedMembers.push(inserted);
        // Add to existing sets to prevent duplicates in subsequent inserts
        existingEmails.add(member.email?.toLowerCase().trim() || '');
        existingMobiles.add(member.mobile?.trim() || '');
      }
    }

    // Combine validation errors with insert errors
    const allErrors = [...errors, ...insertErrors];
    
    return NextResponse.json({
      success: true,
      imported: insertedMembers.length,
      skipped: skipped.length,
      total: data.length,
      errors: allErrors.length > 0 ? allErrors : undefined,
      skippedDetails: skipped.length > 0 ? skipped.slice(0, 20) : undefined // Show first 20 skipped for reference
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import members' },
      { status: 500 }
    );
  }
}





