import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseExcelFile, parseCSVFile } from '@/lib/xlsx-utils';

type SkippedRecord = { row: number; name: string; email: string; mobile: string; reason: string };

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const includeDuplicateNames = formData.get('includeDuplicateNames') === 'true';
    const editedDuplicatesJson = formData.get('editedDuplicates') as string | null;
    const editedDuplicates: Array<any> = [];
    
    if (editedDuplicatesJson) {
      try {
        editedDuplicates.push(...JSON.parse(editedDuplicatesJson));
      } catch (e) {
        console.error('Error parsing edited duplicates:', e);
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
    // Only check by mobile number (not email)
    const { data: existingMembers } = await supabaseAdmin
      .from('members')
      .select('mobile');

    const existingMobiles = new Set(
      (existingMembers || []).map(m => m.mobile?.trim()).filter(Boolean)
    );

    // Process each row
    const members: any[] = [];
    const errors: Array<{ row: number; name?: string; email?: string; mobile?: string; error: string }> = [];
    const skipped: SkippedRecord[] = [];
    const duplicateNames: Array<{ row: number; name: string; email: string; mobile: string; firstOccurrenceRow: number; reason: string }> = []; // Track duplicate names separately
    const duplicateMobileGroups = new Map<string, any[]>(); // mobile -> array of duplicate records
    const imageUploadPromises = [];
    
    // Track mobiles within the current file to prevent duplicates in the same import
    const fileMobiles = new Map<string, any>(); // mobile -> first record
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

        // Check if this row was a duplicate that was edited by user (must check BEFORE duplicate detection)
        let emailValue = email.toString().trim();
        let mobileValue = mobile.toString().trim();
        let nameValue = name.toString().trim();
        
        const editedDuplicate = editedDuplicates.find(ed => ed.row === rowNumber);
        if (editedDuplicate) {
          // Use edited values instead of original
          emailValue = editedDuplicate.email || emailValue;
          mobileValue = editedDuplicate.mobile || mobileValue;
          nameValue = editedDuplicate.name || nameValue;
          
          // Validate edited email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emailValue)) {
            errors.push({
              row: rowNumber,
              name: nameValue,
              email: emailValue,
              error: `Invalid email format in edited data: ${emailValue}`
            });
            continue;
          }
        }
        
        // Trim mobile number (after potential edit)
        const mobileTrimmed = mobileValue.trim();
        const nameTrimmed = nameValue;
        
        // Check if edited mobile still conflicts (only if edited)
        if (editedDuplicate) {
          if (existingMobiles.has(mobileTrimmed) || fileMobiles.has(mobileTrimmed)) {
            // Still a duplicate after edit
            errors.push({
              row: rowNumber,
              name: nameTrimmed,
              email: emailValue,
              mobile: mobileValue,
              error: 'Edited mobile number still conflicts with existing data'
            });
            continue;
          }
        }
        
        // Validate membership type
        const validMembershipTypes = ['GM', 'LM', 'FM', 'OTHER'];
        const membership_type = validMembershipTypes.includes(membershipType) ? membershipType : 'GM';
        
        // Map additional fields from CSV/Excel (before duplicate check so we have full data)
        const nameBangla = row['Name (Bangla)'] || row['name_bangla'] || row['Name Bangla'] || '';
        const batchValue = batch ? batch.toString().trim() : '';
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
        // imageUrl is already defined above at line 164
        
        // Prepare member data structure for duplicate detection (with all fields)
        const memberData = {
          row: rowNumber,
          name: nameTrimmed,
          email: emailValue,
          mobile: mobileTrimmed,
          name_bangla: nameBangla ? nameBangla.toString().trim() : '',
          membership_type,
          batch: batchValue,
          group: group ? group.toString().trim() : '',
          roll_no: rollNo ? rollNo.toString().trim() : '',
          blood_group: bloodGroup ? bloodGroup.toString().trim() : '',
          birthday_month: birthdayMonth ? parseInt(birthdayMonth.toString()) : null,
          birthday_day: birthdayDay ? parseInt(birthdayDay.toString()) : null,
          higher_study_1: higherStudy1 ? higherStudy1.toString().trim() : '',
          hs_1_institute: hs1Institute ? hs1Institute.toString().trim() : '',
          higher_study_2: higherStudy2 ? higherStudy2.toString().trim() : '',
          hs_2_institute: hs2Institute ? hs2Institute.toString().trim() : '',
          school: school ? school.toString().trim() : '',
          home_district: homeDistrict ? homeDistrict.toString().trim() : '',
          organization: organization ? organization.toString().trim() : '',
          position: position ? position.toString().trim() : '',
          department: department ? department.toString().trim() : '',
          profession: profession ? profession.toString().trim() : '',
          nrb_country: nrbCountry ? nrbCountry.toString().trim() : '',
          living_in_area: livingInArea ? livingInArea.toString().trim() : '',
          job_location: jobLocation ? jobLocation.toString().trim() : '',
          other_club_member: otherClubMember ? otherClubMember.toString().trim() : '',
          remarks: remarks ? remarks.toString().trim() : '',
          image_url: imageUrl || ''
        };

        // Check for duplicates in database (ONLY mobile)
        if (existingMobiles.has(mobileTrimmed)) {
          const duplicateGroup = duplicateMobileGroups.get(mobileTrimmed) || [];
          
          duplicateGroup.push({
            ...memberData,
            reason: 'Mobile number already exists in database',
            duplicateType: 'mobile',
            isExisting: true
          });
          
          duplicateMobileGroups.set(mobileTrimmed, duplicateGroup);
          continue;
        }
        
        // Check for duplicates within the same file (ONLY mobile)
        const hasMobileDuplicate = fileMobiles.has(mobileTrimmed);
        
        if (hasMobileDuplicate) {
          const duplicateGroup = duplicateMobileGroups.get(mobileTrimmed) || [];
          const firstRecord = fileMobiles.get(mobileTrimmed);
          
          // Add first record to group if not already there
          if (duplicateGroup.length === 0 && firstRecord) {
            duplicateGroup.push({
              ...firstRecord,
              reason: 'Duplicate mobile in this file (first occurrence)',
              duplicateType: 'mobile',
              isExisting: false
            });
          }
          
          // Add current record
          duplicateGroup.push({
            ...memberData,
            reason: 'Duplicate mobile in this file',
            duplicateType: 'mobile',
            isExisting: false
          });
          
          duplicateMobileGroups.set(mobileTrimmed, duplicateGroup);
          continue;
        }
        
        // Store first occurrence for future duplicate detection
        fileMobiles.set(mobileTrimmed, memberData);

        // Check for duplicate names (but don't skip - just track for user confirmation)
        const isDuplicateName = fileNames.has(nameTrimmed);
        if (isDuplicateName && !includeDuplicateNames) {
          duplicateNames.push({
            row: rowNumber,
            name: nameTrimmed,
            email: emailValue,
            mobile: mobileTrimmed,
            firstOccurrenceRow: fileNames.get(nameTrimmed) || rowNumber,
            reason: 'Duplicate name found in this file'
          });
          // Skip adding this member to the array until user confirms
          continue;
        } else if (!isDuplicateName) {
          // First occurrence of this name
          fileNames.set(nameTrimmed, rowNumber);
        }

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

        // Add valid member to import list (edited duplicates already handled at the beginning)
        members.push({
          name: memberData.name,
          name_bangla: memberData.name_bangla || null,
          email: memberData.email,
          mobile: mobileTrimmed,
          membership_type: memberData.membership_type,
          batch: memberData.batch || null,
          group: memberData.group || null,
          roll_no: memberData.roll_no || null,
          image_url: finalImageUrl || null,
          blood_group: memberData.blood_group || null,
          birthday_month: memberData.birthday_month,
          birthday_day: memberData.birthday_day,
          higher_study_1: memberData.higher_study_1 || null,
          hs_1_institute: memberData.hs_1_institute || null,
          higher_study_2: memberData.higher_study_2 || null,
          hs_2_institute: memberData.hs_2_institute || null,
          school: memberData.school || null,
          home_district: memberData.home_district || null,
          organization: memberData.organization || null,
          position: memberData.position || null,
          department: memberData.department || null,
          profession: memberData.profession || null,
          nrb_country: memberData.nrb_country || null,
          living_in_area: memberData.living_in_area || null,
          job_location: memberData.job_location || null,
          other_club_member: memberData.other_club_member || null,
          remarks: memberData.remarks || null
        });

        // Add to file sets to prevent duplicates within the same import
        fileMobiles.set(mobileTrimmed, memberData);
      } catch (rowError: any) {
        errors.push({
          row: rowNumber,
          error: rowError.message || 'Invalid row data'
        });
      }
    }

    // Combine all duplicate groups (mobile only)
    const allDuplicateGroups: Array<{ type: string; key: string; records: any[] }> = [];
    
    duplicateMobileGroups.forEach((records, mobile) => {
      allDuplicateGroups.push({ type: 'mobile', key: mobile, records });
    });
    
    // If there are duplicate email/mobile records and no edited duplicates provided, return for user confirmation
    if (allDuplicateGroups.length > 0 && editedDuplicates.length === 0) {
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
          requiresDuplicateConfirmation: true,
          duplicateGroups: allDuplicateGroups,
          message: `Found ${allDuplicateGroups.length} duplicate group(s) (mobile number). Please review and modify or approve them.`,
          validMembersCount: members.length,
          validMembersImported: validMembersImported,
          errors: errors.length > 0 ? errors : undefined,
          skipped: skipped.length > 0 ? skipped : undefined
        },
        { status: 200 }
      );
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





