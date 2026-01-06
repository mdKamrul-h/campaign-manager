import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseExcelFile, parseCSVFile } from '@/lib/xlsx-utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const includeDuplicateNames = formData.get('includeDuplicateNames') === 'true';
    const editedDuplicateNamesJson = formData.get('editedDuplicateNames') as string | null;
    const editedDuplicateNames: Map<number, { name?: string; email?: string; mobile?: string }> = new Map();
    
    if (editedDuplicateNamesJson) {
      try {
        const edited = JSON.parse(editedDuplicateNamesJson) as Array<{ row: number; name?: string; email?: string; mobile?: string }>;
        edited.forEach(edit => {
          editedDuplicateNames.set(edit.row, {
            name: edit.name,
            email: edit.email,
            mobile: edit.mobile
          });
        });
      } catch (e) {
        console.error('Error parsing edited duplicate names:', e);
      }
    }

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

    // Get available columns and create a case-insensitive lookup
    const availableColumns = data.length > 0 ? Object.keys(data[0]) : [];
    const columnMap = new Map<string, string>();
    availableColumns.forEach(col => {
      columnMap.set(col.toLowerCase().trim(), col);
    });
    
    // Log available columns for debugging
    console.log('Available columns in file:', availableColumns);

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
    const duplicateNames = []; // Track duplicate names separately
    const imageUploadPromises = [];
    
    // Track emails and mobiles within the current file to prevent duplicates in the same import
    const fileEmails = new Set<string>();
    const fileMobiles = new Set<string>();
    // Track names within the file to detect duplicates
    const fileNames = new Map<string, number>(); // name -> row number (first occurrence)

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 because Excel rows start at 1 and we skip header

      try {
        // Helper function to get value from row with multiple column name variations (case-insensitive)
        const getValue = (variations: string[]): string => {
          // First try direct matches (exact column names)
          for (const variation of variations) {
            // Try exact match
            const value = row[variation];
            if (value !== undefined && value !== null && value !== '') {
              return String(value).trim();
            }
            
            // Try case-insensitive match via columnMap
            const normalized = variation.toLowerCase().trim();
            if (columnMap.has(normalized)) {
              const actualCol = columnMap.get(normalized)!;
              const value2 = row[actualCol];
              if (value2 !== undefined && value2 !== null && value2 !== '') {
                return String(value2).trim();
              }
            }
          }
          
          // Try partial/fuzzy matching (contains)
          for (const variation of variations) {
            const normalized = variation.toLowerCase().trim();
            for (const [key, actualCol] of columnMap.entries()) {
              if (key.includes(normalized) || normalized.includes(key)) {
                const value = row[actualCol];
                if (value !== undefined && value !== null && value !== '') {
                  return String(value).trim();
                }
              }
            }
          }
          return '';
        };

        // Map Excel columns to member fields
        // Support various column name variations (case-insensitive, with/without spaces)
        const name = getValue([
          'Name', 'name', 'NAME', 'Full Name', 'FullName', 'full name', 'FULL NAME',
          'Name (English)', 'Name(English)', 'name_english', 'Member Name', 'member name'
        ]);
        
        const email = getValue([
          'Email', 'email', 'EMAIL', 'E-mail', 'E-Mail', 'e-mail', 'E-MAIL',
          'Email Address', 'email address', 'EMAIL ADDRESS', 'e_mail', 'E_MAIL'
        ]);
        
        const mobile = getValue([
          'Mobile', 'mobile', 'MOBILE', 'Phone', 'phone', 'PHONE',
          'Phone Number', 'phone number', 'PHONE NUMBER', 'Mobile Number', 'mobile number',
          'Contact', 'contact', 'CONTACT', 'Cell', 'cell', 'CELL'
        ]);
        
        const membershipTypeRaw = getValue([
          'Membership Type', 'membership_type', 'Membership', 'membership', 'MEMBERSHIP',
          'Type', 'type', 'TYPE', 'MembershipType', 'membershipType', 'Member Type'
        ]);
        const membershipType = membershipTypeRaw ? membershipTypeRaw.toUpperCase() : 'GM';
        
        const batch = getValue([
          'Batch', 'batch', 'BATCH', 'Batch Number', 'batch number', 'Batch No', 'batch_no'
        ]);
        
        const imageUrl = getValue([
          'Image URL', 'image_url', 'Image', 'image', 'Photo', 'photo', 'Photo URL', 'photo_url',
          'Picture', 'picture', 'Profile Picture', 'profile_picture'
        ]);

        // Validate required fields
        if (!name || !email || !mobile) {
          const missingFields = [];
          if (!name) missingFields.push('Name');
          if (!email) missingFields.push('Email');
          if (!mobile) missingFields.push('Mobile');
          
          // If email is missing, provide helpful info about available columns
          let errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
          if (!email && rowNumber === 2) {
            // Only show column info for first error row to avoid spam
            errorMsg += `. Available columns: ${availableColumns.join(', ')}`;
          }
          
          errors.push({
            row: rowNumber,
            name: name || '(empty)',
            email: email || '(empty)',
            mobile: mobile || '(empty)',
            error: errorMsg
          });
          continue;
        }
        
        // Additional validation: check if email format is valid (basic check)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push({
            row: rowNumber,
            name: name,
            email: email,
            error: `Invalid email format: ${email}`
          });
          continue;
        }
        
        // Check if this row has been edited (for duplicate names) - do this before final validation
        const editedData = editedDuplicateNames.get(rowNumber);
        if (editedData && editedData.email) {
          // Validate edited email format
          if (!emailRegex.test(editedData.email)) {
            errors.push({
              row: rowNumber,
              name: name,
              email: editedData.email,
              error: `Invalid email format in edited data: ${editedData.email}`
            });
            continue;
          }
        }

        // Normalize name
        const nameTrimmed = name.toString().trim();
        
        // Check if this row has been edited (for duplicate names)
        const editedData = editedDuplicateNames.get(rowNumber);
        let finalName = nameTrimmed;
        let finalEmail = email.toString().trim();
        let finalMobile = mobile.toString().trim();
        
        if (editedData) {
          // Use edited values if provided
          if (editedData.name) finalName = editedData.name.trim();
          if (editedData.email) finalEmail = editedData.email.trim();
          if (editedData.mobile) finalMobile = editedData.mobile.trim();
        }

        // Normalize final values for duplicate checking
        const finalEmailLower = finalEmail.toLowerCase();
        const finalMobileTrimmed = finalMobile.trim();
        
        // Check for duplicates in database (ONLY email and mobile) - using final values
        if (existingEmails.has(finalEmailLower) || existingMobiles.has(finalMobileTrimmed)) {
          skipped.push({
            row: rowNumber,
            name: finalName,
            email: finalEmail,
            mobile: finalMobileTrimmed,
            reason: existingEmails.has(finalEmailLower) ? 'Email already exists in database' : 'Mobile already exists in database'
          });
          continue;
        }
        
        // Check for duplicates within the same file (ONLY email and mobile) - using final values
        if (fileEmails.has(finalEmailLower) || fileMobiles.has(finalMobileTrimmed)) {
          skipped.push({
            row: rowNumber,
            name: finalName,
            email: finalEmail,
            mobile: finalMobileTrimmed,
            reason: fileEmails.has(finalEmailLower) ? 'Duplicate email in this file' : 'Duplicate mobile in this file'
          });
          continue;
        }

        // Check for duplicate names (but don't skip - just track for user confirmation)
        const isDuplicateName = fileNames.has(finalName);
        if (isDuplicateName && !includeDuplicateNames) {
          duplicateNames.push({
            row: rowNumber,
            name: finalName,
            email: finalEmail,
            mobile: finalMobileTrimmed,
            firstOccurrenceRow: fileNames.get(finalName) || rowNumber,
            reason: 'Duplicate name found in this file'
          });
          // Skip adding this member to the array until user confirms
          continue;
        } else if (!isDuplicateName) {
          // First occurrence of this name
          fileNames.set(finalName, rowNumber);
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

        members.push({
          name: finalName,
          name_bangla: nameBangla ? nameBangla.toString().trim() : null,
          email: finalEmail,
          mobile: finalMobileTrimmed,
          membership_type,
          batch: batch ? batch.toString().trim() : null,
          group: group ? group.toString().trim() : null,
          roll_no: rollNo ? rollNo.toString().trim() : null,
          image_url: finalImageUrl || null,
          blood_group: bloodGroup ? bloodGroup.toString().trim() : null,
          birthday_month: birthdayMonth ? parseInt(birthdayMonth.toString()) : null,
          birthday_day: birthdayDay ? parseInt(birthdayDay.toString()) : null,
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
          job_location: jobLocation ? jobLocation.toString().trim() : null,
          other_club_member: otherClubMember ? otherClubMember.toString().trim() : null,
          remarks: remarks ? remarks.toString().trim() : null
        });

        // Add to file sets to prevent duplicates within the same import (use final values)
        fileEmails.add(finalEmailLower);
        fileMobiles.add(finalMobileTrimmed);
      } catch (rowError: any) {
        errors.push({
          row: rowNumber,
          error: rowError.message || 'Invalid row data'
        });
      }
    }

    // If there are duplicate names and user hasn't confirmed to include them, 
    // import valid members first, then return duplicate names for confirmation
    if (duplicateNames.length > 0 && !includeDuplicateNames) {
      // Import valid members (non-duplicates) first
      let validMembersImported = 0;
      if (members.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < members.length; i += batchSize) {
          const batch = members.slice(i, i + batchSize);
          try {
            const { data: upserted, error: upsertError } = await supabaseAdmin
              .from('members')
              .upsert(batch, {
                onConflict: 'mobile',
                ignoreDuplicates: false
              })
              .select();

            if (!upsertError && upserted) {
              validMembersImported += upserted.length;
            }
          } catch (err) {
            console.error('Error importing valid members:', err);
          }
        }
      }

      return NextResponse.json(
        { 
          requiresConfirmation: true,
          duplicateNames: duplicateNames,
          message: `Found ${duplicateNames.length} duplicate name(s) in the file. Do you want to include them?`,
          validMembersCount: members.length,
          validMembersImported: validMembersImported,
          errors: errors.length > 0 ? errors : undefined,
          skipped: skipped.length > 0 ? skipped : undefined
        },
        { status: 200 }
      );
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

    // Upsert members (update if exists, insert if new)
    // Use mobile as the conflict key since it has a unique constraint
    const upsertedMembers = [];
    const insertErrors = [];
    
    // Process in batches for better performance
    const batchSize = 50; // Smaller batches for more reliable upserts
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);
      
      try {
        // Use upsert to update existing records or insert new ones
        // Mobile is used as the conflict resolution key
        const { data: upserted, error: upsertError } = await supabaseAdmin
          .from('members')
          .upsert(batch, {
            onConflict: 'mobile',
            ignoreDuplicates: false
          })
          .select();

        if (upsertError) {
          console.error(`Batch upsert error (rows ${i + 2}-${i + batch.length + 1}):`, upsertError);
          
          // If batch fails, try one by one
          for (let j = 0; j < batch.length; j++) {
            const member = batch[j];
            try {
              const { data: singleUpserted, error: singleError } = await supabaseAdmin
                .from('members')
                .upsert([member], {
                  onConflict: 'mobile',
                  ignoreDuplicates: false
                })
                .select()
                .single();

              if (singleError) {
                // If mobile conflict fails, try email as fallback
                if (singleError.code === '23505' && singleError.message?.includes('mobile')) {
                  // Try to find and update by email instead
                  const { data: existing } = await supabaseAdmin
                    .from('members')
                    .select('id')
                    .eq('email', member.email)
                    .maybeSingle();
                  
                  if (existing) {
                    // Update existing by email
                    const { data: updated, error: updateError } = await supabaseAdmin
                      .from('members')
                      .update(member)
                      .eq('id', existing.id)
                      .select()
                      .single();
                    
                    if (!updateError && updated) {
                      upsertedMembers.push(updated);
                    } else if (updateError) {
                      insertErrors.push({
                        row: i + j + 2,
                        name: member.name,
                        email: member.email,
                        mobile: member.mobile,
                        error: updateError.message || 'Update failed'
                      });
                    }
                  } else {
                    insertErrors.push({
                      row: i + j + 2,
                      name: member.name,
                      email: member.email,
                      mobile: member.mobile,
                      error: singleError.message || 'Upsert failed'
                    });
                  }
                } else {
                  insertErrors.push({
                    row: i + j + 2,
                    name: member.name,
                    email: member.email,
                    mobile: member.mobile,
                    error: singleError.message || 'Upsert failed'
                  });
                }
              } else if (singleUpserted) {
                upsertedMembers.push(singleUpserted);
              }
            } catch (err: any) {
              insertErrors.push({
                row: i + j + 2,
                name: member.name,
                email: member.email,
                mobile: member.mobile,
                error: err.message || 'Unexpected error'
              });
            }
          }
        } else if (upserted) {
          upsertedMembers.push(...upserted);
        }
      } catch (batchError: any) {
        console.error(`Batch processing error:`, batchError);
        insertErrors.push({
          row: i + 2,
          error: batchError.message || 'Batch processing failed'
        });
      }
    }

    // Combine validation errors with upsert errors
    const allErrors = [...errors, ...insertErrors];
    
    // Calculate updated vs inserted
    // Note: Supabase upsert doesn't distinguish between insert/update in response
    // So we'll show total upserted (which includes both new and updated)
    const totalUpserted = upsertedMembers.length;
    
    return NextResponse.json({
      success: true,
      imported: totalUpserted,
      updated: totalUpserted, // All upserted records (both new and updated)
      skipped: skipped.length, // Only email/mobile duplicates
      total: data.length,
      errors: allErrors.length > 0 ? allErrors : undefined,
      skippedDetails: skipped.length > 0 ? skipped.slice(0, 20) : undefined, // Show first 20 skipped for reference
      duplicateNamesIncluded: includeDuplicateNames ? duplicateNames.length : 0
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import members' },
      { status: 500 }
    );
  }
}





