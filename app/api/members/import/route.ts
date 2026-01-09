import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseExcelFile, parseCSVFile } from '@/lib/xlsx-utils';

// Ensure this route is dynamic and not cached
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large imports

type ImportError = { row: number; name?: string; email?: string; mobile?: string; error: string };
type SkippedRecord = { row: number; name: string; email: string; mobile: string; reason: string };

export async function POST(request: NextRequest) {
  console.log('Bulk import API route called');
  
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

    // Parse file
    let data: any[];
    try {
      if (isCSV) {
        console.log('Parsing CSV file...');
        const text = await file.text();
        data = await parseCSVFile(text);
      } else {
        console.log('Parsing Excel file...');
        const arrayBuffer = await file.arrayBuffer();
        data = await parseExcelFile(arrayBuffer);
      }
      console.log(`File parsed successfully: ${data.length} rows`);
    } catch (parseError: any) {
      console.error('Error parsing file:', parseError);
      return NextResponse.json(
        { error: `Failed to parse file: ${parseError.message || 'Unknown error'}` },
        { status: 400 }
      );
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'File is empty or contains no data' },
        { status: 400 }
      );
    }

    // Get available columns and create case-insensitive lookup
    const availableColumns = data.length > 0 ? Object.keys(data[0]) : [];
    const columnMap = new Map<string, string>();
    availableColumns.forEach(col => {
      columnMap.set(col.toLowerCase().trim(), col);
    });
    
    console.log('Available columns:', availableColumns);

    // Fetch all existing mobile numbers from database (for uniqueness check)
    console.log('Fetching existing mobile numbers from database...');
    const { data: existingMembers, error: fetchError } = await supabaseAdmin
      .from('members')
      .select('mobile');

    if (fetchError) {
      console.error('Error fetching existing members:', fetchError);
      return NextResponse.json(
        { error: `Failed to check existing members: ${fetchError.message}` },
        { status: 500 }
      );
    }

    // Create a Set of existing mobile numbers for fast lookup
    const existingMobiles = new Set(
      (existingMembers || [])
        .map(m => m.mobile?.toString().trim())
        .filter(Boolean)
    );
    
    console.log(`Found ${existingMobiles.size} existing mobile numbers in database`);

    // Helper function to get value from row with flexible column matching
    const getValue = (row: any, variations: string[]): string => {
      // Try exact matches first
      for (const variation of variations) {
        const value = row[variation];
        if (value !== undefined && value !== null && value !== '') {
          const strValue = String(value).trim();
          if (strValue !== '') return strValue;
        }
        
        // Try case-insensitive match
        const normalized = variation.toLowerCase().trim();
        if (columnMap.has(normalized)) {
          const actualCol = columnMap.get(normalized)!;
          const value2 = row[actualCol];
          if (value2 !== undefined && value2 !== null && value2 !== '') {
            const strValue2 = String(value2).trim();
            if (strValue2 !== '') return strValue2;
          }
        }
      }
      
      // Try fuzzy matching
      for (const variation of variations) {
        const normalized = variation.toLowerCase().trim();
        for (const [key, actualCol] of columnMap.entries()) {
          if (key.includes(normalized) || normalized.includes(key)) {
            const value = row[actualCol];
            if (value !== undefined && value !== null && value !== '') {
              const strValue = String(value).trim();
              if (strValue !== '') return strValue;
            }
          }
        }
      }
      return '';
    };

    // Process each row
    const membersToInsert: any[] = [];
    const errors: ImportError[] = [];
    const skipped: SkippedRecord[] = [];
    const fileMobiles = new Set<string>(); // Track mobiles within file to catch duplicates

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 because rows start at 1 and we skip header

      try {
        // Extract required fields with flexible column matching
        const name = getValue(row, [
          'Name', 'name', 'NAME', 'Full Name', 'FullName', 'full name', 'FULL NAME',
          'Name (English)', 'Name(English)', 'name_english', 'Member Name', 'member name'
        ]);
        
        const email = getValue(row, [
          'Email', 'email', 'EMAIL', 'E-mail', 'E-Mail', 'e-mail', 'E-MAIL',
          'Email Address', 'email address', 'EMAIL ADDRESS', 'e_mail', 'E_MAIL'
        ]);
        
        const mobile = getValue(row, [
          'Mobile', 'mobile', 'MOBILE', 'Phone', 'phone', 'PHONE',
          'Phone Number', 'phone number', 'PHONE NUMBER', 'Mobile Number', 'mobile number',
          'Contact', 'contact', 'CONTACT', 'Cell', 'cell', 'CELL'
        ]);

        // Validate required fields
        if (!name || !email || !mobile) {
          const missingFields = [];
          if (!name) missingFields.push('Name');
          if (!email) missingFields.push('Email');
          if (!mobile) missingFields.push('Mobile');
          
          errors.push({
            row: rowNumber,
            name: name || '(empty)',
            email: email || '(empty)',
            mobile: mobile || '(empty)',
            error: `Missing required fields: ${missingFields.join(', ')}`
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push({
            row: rowNumber,
            name,
            email,
            mobile,
            error: `Invalid email format: ${email}`
          });
          continue;
        }

        // Normalize mobile number
        const mobileTrimmed = mobile.toString().trim();

        // Check if mobile already exists in database
        if (existingMobiles.has(mobileTrimmed)) {
          skipped.push({
            row: rowNumber,
            name,
            email,
            mobile: mobileTrimmed,
            reason: 'Mobile number already exists in database'
          });
          continue;
        }

        // Check if mobile is duplicate within the same file
        if (fileMobiles.has(mobileTrimmed)) {
          skipped.push({
            row: rowNumber,
            name,
            email,
            mobile: mobileTrimmed,
            reason: 'Duplicate mobile number in this file'
          });
          continue;
        }

        // Add mobile to file tracking set
        fileMobiles.add(mobileTrimmed);

        // Extract optional fields
        const membershipTypeRaw = getValue(row, [
          'Membership Type', 'membership_type', 'Membership', 'membership', 'MEMBERSHIP',
          'Type', 'type', 'TYPE', 'MembershipType', 'membershipType', 'Member Type'
        ]);
        const membershipType = membershipTypeRaw ? membershipTypeRaw.toUpperCase() : 'GM';
        const validMembershipTypes = ['GM', 'LM', 'FM', 'OTHER'];
        const membership_type = validMembershipTypes.includes(membershipType) ? membershipType : 'GM';

        // Helper to normalize optional fields
        const normalizeString = (value: any): string | null => {
          if (!value) return null;
          const trimmed = String(value).trim();
          return trimmed === '' ? null : trimmed;
        };

        // Extract all optional fields
        const nameBangla = row['Name (Bangla)'] || row['name_bangla'] || row['Name Bangla'] || '';
        const batch = getValue(row, ['Batch', 'batch', 'BATCH', 'Batch Number', 'batch number', 'Batch No', 'batch_no']);
        const group = row['Group'] || row['group'] || '';
        const rollNo = row['Roll No'] || row['roll_no'] || row['Roll No.'] || row['Roll Number'] || '';
        const bloodGroup = row['Blood Group'] || row['blood_group'] || '';
        const birthdayMonth = row['Birthday Month'] || row['birthday_month'] || row['Birth Month'] || '';
        const birthdayDay = row['Birthday Day'] || row['birthday_day'] || row['Birth Day'] || '';
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
        const jobLocation = row['Job Location'] || row['job_location'] || '';
        const otherClubMember = row['Other Club Member'] || row['other_club_member'] || '';
        const remarks = row['Remarks'] || row['remarks'] || '';
        const imageUrl = getValue(row, [
          'Image URL', 'image_url', 'Image', 'image', 'Photo', 'photo', 'Photo URL', 'photo_url',
          'Picture', 'picture', 'Profile Picture', 'profile_picture'
        ]);

        // Handle image upload if base64
        let finalImageUrl = normalizeString(imageUrl);
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
            finalImageUrl = null;
          }
        }

        // Prepare member data for insertion
        membersToInsert.push({
          name: name.trim(),
          name_bangla: normalizeString(nameBangla),
          email: email.trim(),
          mobile: mobileTrimmed,
          membership_type,
          batch: normalizeString(batch),
          group: normalizeString(group),
          roll_no: normalizeString(rollNo),
          image_url: finalImageUrl,
          blood_group: normalizeString(bloodGroup),
          birthday_month: birthdayMonth ? parseInt(birthdayMonth.toString()) : null,
          birthday_day: birthdayDay ? parseInt(birthdayDay.toString()) : null,
          higher_study_1: normalizeString(higherStudy1),
          hs_1_institute: normalizeString(hs1Institute),
          higher_study_2: normalizeString(higherStudy2),
          hs_2_institute: normalizeString(hs2Institute),
          school: normalizeString(school),
          home_district: normalizeString(homeDistrict),
          organization: normalizeString(organization),
          position: normalizeString(position),
          department: normalizeString(department),
          profession: normalizeString(profession),
          nrb_country: normalizeString(nrbCountry),
          living_in_area: normalizeString(livingInArea),
          job_location: normalizeString(jobLocation),
          other_club_member: normalizeString(otherClubMember),
          remarks: normalizeString(remarks)
        });

      } catch (rowError: any) {
        errors.push({
          row: rowNumber,
          error: rowError.message || 'Invalid row data'
        });
      }
    }

    console.log(`Processing complete: ${membersToInsert.length} to insert, ${skipped.length} skipped, ${errors.length} errors`);

    // If no members to insert, return early
    if (membersToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: skipped.length,
        total: data.length,
        errors: errors.length > 0 ? errors.slice(0, 50) : undefined,
        skippedDetails: skipped.length > 0 ? skipped.slice(0, 20) : undefined,
        message: 'No new members to import. All members either already exist or have errors.'
      });
    }

    // Insert members into database in batches
    console.log(`Inserting ${membersToInsert.length} members in batches...`);
    const insertedMembers = [];
    const insertErrors: ImportError[] = [];
    const batchSize = 50;

    for (let i = 0; i < membersToInsert.length; i += batchSize) {
      const batch = membersToInsert.slice(i, i + batchSize);
      
      try {
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('members')
          .insert(batch)
          .select();

        if (insertError) {
          console.error(`Batch insert error (batch ${Math.floor(i / batchSize) + 1}):`, insertError);
          
          // If batch fails, try individual inserts to identify problematic records
          for (let j = 0; j < batch.length; j++) {
            try {
              const { data: singleInserted, error: singleError } = await supabaseAdmin
                .from('members')
                .insert([batch[j]])
                .select();

              if (singleError) {
                // Check if it's a unique constraint violation (mobile already exists)
                if (singleError.code === '23505') {
                  if (singleError.message?.includes('mobile')) {
                    skipped.push({
                      row: i + j + 2,
                      name: batch[j].name,
                      email: batch[j].email,
                      mobile: batch[j].mobile,
                      reason: 'Mobile number already exists in database (caught during insert)'
                    });
                  } else if (singleError.message?.includes('email')) {
                    insertErrors.push({
                      row: i + j + 2,
                      name: batch[j].name,
                      email: batch[j].email,
                      mobile: batch[j].mobile,
                      error: 'Email already exists in database'
                    });
                  } else {
                    insertErrors.push({
                      row: i + j + 2,
                      name: batch[j].name,
                      email: batch[j].email,
                      mobile: batch[j].mobile,
                      error: singleError.message || 'Database constraint violation'
                    });
                  }
                } else {
                  insertErrors.push({
                    row: i + j + 2,
                    name: batch[j].name,
                    email: batch[j].email,
                    mobile: batch[j].mobile,
                    error: singleError.message || 'Insert failed'
                  });
                }
              } else if (singleInserted && Array.isArray(singleInserted) && singleInserted.length > 0) {
                insertedMembers.push(...singleInserted);
              }
            } catch (err: any) {
              insertErrors.push({
                row: i + j + 2,
                name: batch[j].name,
                email: batch[j].email,
                mobile: batch[j].mobile,
                error: err.message || 'Unexpected error during insert'
              });
            }
          }
        } else if (inserted && Array.isArray(inserted) && inserted.length > 0) {
          insertedMembers.push(...inserted);
          console.log(`Successfully inserted batch ${Math.floor(i / batchSize) + 1}: ${inserted.length} members`);
        }
      } catch (batchError: any) {
        console.error(`Batch processing exception:`, batchError);
        for (let j = 0; j < batch.length; j++) {
          insertErrors.push({
            row: i + j + 2,
            name: batch[j].name,
            email: batch[j].email,
            mobile: batch[j].mobile,
            error: batchError.message || 'Batch processing failed'
          });
        }
      }
    }

    // Combine all errors
    const allErrors = [...errors, ...insertErrors];
    const totalInserted = insertedMembers.length;

    console.log(`Import completed: ${totalInserted} inserted, ${skipped.length} skipped, ${allErrors.length} errors`);

    return NextResponse.json({
      success: true,
      imported: totalInserted,
      skipped: skipped.length,
      total: data.length,
      errors: allErrors.length > 0 ? allErrors.slice(0, 100) : undefined,
      skippedDetails: skipped.length > 0 ? skipped.slice(0, 50) : undefined,
      availableColumns: availableColumns
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to import members',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
