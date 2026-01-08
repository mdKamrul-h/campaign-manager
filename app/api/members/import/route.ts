import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseExcelFile, parseCSVFile } from '@/lib/xlsx-utils';

type SkippedRecord = { row: number; name: string; email: string; mobile: string; reason: string };

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
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
    const duplicateMobileGroups = new Map<string, any[]>(); // mobile -> array of duplicate records
    const imageUploadPromises = [];
    
    // Track mobiles within the current file to prevent duplicates in the same import
    const fileMobiles = new Map<string, any>(); // mobile -> first record

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
        
        // Helper to normalize optional string fields (empty string -> null)
        const normalizeString = (value: any): string | null => {
          if (!value) return null;
          const trimmed = String(value).trim();
          return trimmed === '' ? null : trimmed;
        };

        // Prepare member data structure for duplicate detection (with all fields)
        const memberData = {
          row: rowNumber,
          name: nameTrimmed,
          email: emailValue,
          mobile: mobileTrimmed,
          name_bangla: normalizeString(nameBangla),
          membership_type,
          batch: normalizeString(batchValue),
          group: normalizeString(group),
          roll_no: normalizeString(rollNo),
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
          remarks: normalizeString(remarks),
          image_url: normalizeString(imageUrl)
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

        // Handle image if provided as base64 or URL
        let finalImageUrl = memberData.image_url;

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
            finalImageUrl = null;
          }
        }

        // Add valid member to import list (edited duplicates already handled at the beginning)
        // All optional fields are already normalized to null in memberData
        members.push({
          name: memberData.name,
          name_bangla: memberData.name_bangla,
          email: memberData.email,
          mobile: memberData.mobile, // Already trimmed
          membership_type: memberData.membership_type,
          batch: memberData.batch,
          group: memberData.group,
          roll_no: memberData.roll_no,
          image_url: finalImageUrl,
          blood_group: memberData.blood_group,
          birthday_month: memberData.birthday_month,
          birthday_day: memberData.birthday_day,
          higher_study_1: memberData.higher_study_1,
          hs_1_institute: memberData.hs_1_institute,
          higher_study_2: memberData.higher_study_2,
          hs_2_institute: memberData.hs_2_institute,
          school: memberData.school,
          home_district: memberData.home_district,
          organization: memberData.organization,
          position: memberData.position,
          department: memberData.department,
          profession: memberData.profession,
          nrb_country: memberData.nrb_country,
          living_in_area: memberData.living_in_area,
          job_location: memberData.job_location,
          other_club_member: memberData.other_club_member,
          remarks: memberData.remarks
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
    
    // If there are duplicate mobile records and no edited duplicates provided, return for user confirmation
    if (allDuplicateGroups.length > 0 && editedDuplicates.length === 0) {
      // Import valid members (non-duplicates) first
      let validMembersImported = 0;
      const duplicateImportErrors = [];
      
      if (members.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < members.length; i += batchSize) {
          const batch = members.slice(i, i + batchSize);
          const batchStartRow = i + 2;
          
          try {
            const { data: upserted, error: upsertError } = await supabaseAdmin
              .from('members')
              .upsert(batch, {
                onConflict: 'mobile',
                ignoreDuplicates: false
              })
              .select();

            if (upsertError) {
              console.error(`Error importing valid members batch (rows ${batchStartRow}-${batchStartRow + batch.length - 1}):`, upsertError);
              // Try individual inserts
              for (let j = 0; j < batch.length; j++) {
                try {
                  const { data: singleUpserted, error: singleError } = await supabaseAdmin
                    .from('members')
                    .upsert([batch[j]], {
                      onConflict: 'mobile',
                      ignoreDuplicates: false
                    })
                    .select();

                  if (!singleError && singleUpserted && Array.isArray(singleUpserted) && singleUpserted.length > 0) {
                    validMembersImported += singleUpserted.length;
                  } else if (singleError) {
                    duplicateImportErrors.push({
                      row: batchStartRow + j,
                      error: singleError.message || 'Failed to import valid member'
                    });
                  }
                } catch (singleErr: any) {
                  console.error(`Error importing individual member at row ${batchStartRow + j}:`, singleErr);
                  duplicateImportErrors.push({
                    row: batchStartRow + j,
                    error: singleErr.message || 'Failed to import valid member'
                  });
                }
              }
            } else if (upserted && Array.isArray(upserted) && upserted.length > 0) {
              validMembersImported += upserted.length;
            } else {
              console.warn(`Valid members batch returned no data for rows ${batchStartRow}-${batchStartRow + batch.length - 1}`);
            }
          } catch (err: any) {
            console.error(`Exception importing valid members batch (rows ${batchStartRow}-${batchStartRow + batch.length - 1}):`, err);
            for (let j = 0; j < batch.length; j++) {
              duplicateImportErrors.push({
                row: batchStartRow + j,
                error: err.message || 'Failed to import valid member'
              });
            }
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
          errors: errors.length > 0 || duplicateImportErrors.length > 0 
            ? [...errors, ...duplicateImportErrors] 
            : undefined,
          skipped: skipped.length > 0 ? skipped : undefined
        },
        { status: 200 }
      );
    }

    if (members.length === 0) {
      console.log('No members to import after validation. Errors:', errors.length, 'Skipped:', skipped.length);
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

    console.log(`Starting bulk import: ${members.length} members to process in batches`);

    // Upsert members (update if exists, insert if new)
    // Use mobile as the conflict key since it has a unique constraint
    const upsertedMembers = [];
    const insertErrors = [];
    
    // Process in batches for better performance
    const batchSize = 50; // Smaller batches for more reliable upserts
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);
      const batchStartRow = i + 2; // +2 because Excel rows start at 1 and we skip header
      
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
          console.error(`Batch upsert error (rows ${batchStartRow}-${batchStartRow + batch.length - 1}):`, upsertError);
          console.error('Error details:', JSON.stringify(upsertError, null, 2));
          
          // If batch fails, try one by one
          for (let j = 0; j < batch.length; j++) {
            const member = batch[j];
            const rowNumber = batchStartRow + j;
            
            try {
              const { data: singleUpserted, error: singleError } = await supabaseAdmin
                .from('members')
                .upsert([member], {
                  onConflict: 'mobile',
                  ignoreDuplicates: false
                })
                .select();

              if (singleError) {
                console.error(`Single upsert error for row ${rowNumber}:`, singleError);
                // Handle mobile conflict error (unique constraint violation)
                if (singleError.code === '23505' && singleError.message?.includes('mobile')) {
                  // Mobile already exists - this should have been caught earlier, but handle gracefully
                  insertErrors.push({
                    row: rowNumber,
                    name: member.name,
                    email: member.email,
                    mobile: member.mobile,
                    error: 'Mobile number already exists in database (unique constraint violation)'
                  });
                } else if (singleError.code === '23505' && singleError.message?.includes('email')) {
                  // Email conflict
                  insertErrors.push({
                    row: rowNumber,
                    name: member.name,
                    email: member.email,
                    mobile: member.mobile,
                    error: 'Email already exists in database (unique constraint violation)'
                  });
                } else {
                  insertErrors.push({
                    row: rowNumber,
                    name: member.name,
                    email: member.email,
                    mobile: member.mobile,
                    error: singleError.message || `Upsert failed: ${singleError.code || 'Unknown error'}`
                  });
                }
              } else if (singleUpserted && Array.isArray(singleUpserted) && singleUpserted.length > 0) {
                upsertedMembers.push(...singleUpserted);
              } else if (singleUpserted) {
                // Handle case where singleUpserted is a single object (shouldn't happen with select(), but just in case)
                upsertedMembers.push(singleUpserted);
              } else {
                // No data returned but no error - might be a silent failure
                console.warn(`No data returned for row ${rowNumber}, but no error reported`);
                insertErrors.push({
                  row: rowNumber,
                  name: member.name,
                  email: member.email,
                  mobile: member.mobile,
                  error: 'Upsert completed but no data returned'
                });
              }
            } catch (err: any) {
              console.error(`Exception during single upsert for row ${rowNumber}:`, err);
              insertErrors.push({
                row: rowNumber,
                name: member.name,
                email: member.email,
                mobile: member.mobile,
                error: err.message || 'Unexpected error during upsert'
              });
            }
          }
        } else if (upserted && Array.isArray(upserted) && upserted.length > 0) {
          upsertedMembers.push(...upserted);
          console.log(`Successfully upserted batch ${Math.floor(i / batchSize) + 1}: ${upserted.length} members`);
        } else {
          // No error but also no data - this shouldn't happen, but log it
          console.warn(`Batch upsert returned no data for batch starting at row ${batchStartRow}`);
          // Try individual inserts to get better error messages
          for (let j = 0; j < batch.length; j++) {
            insertErrors.push({
              row: batchStartRow + j,
              name: batch[j].name,
              email: batch[j].email,
              mobile: batch[j].mobile,
              error: 'Batch upsert returned no data'
            });
          }
        }
      } catch (batchError: any) {
        console.error(`Batch processing exception (rows ${batchStartRow}-${batchStartRow + batch.length - 1}):`, batchError);
        // Add errors for all members in this batch
        for (let j = 0; j < batch.length; j++) {
          insertErrors.push({
            row: batchStartRow + j,
            name: batch[j].name,
            email: batch[j].email,
            mobile: batch[j].mobile,
            error: batchError.message || 'Batch processing failed'
          });
        }
      }
    }

    // Combine validation errors with upsert errors
    const allErrors = [...errors, ...insertErrors];
    
    // Calculate updated vs inserted
    // Note: Supabase upsert doesn't distinguish between insert/update in response
    // So we'll show total upserted (which includes both new and updated)
    const totalUpserted = upsertedMembers.length;
    
    console.log(`Import completed. Total processed: ${data.length}, Successfully imported: ${totalUpserted}, Errors: ${allErrors.length}, Skipped: ${skipped.length}`);
    
    // If no members were imported and there are errors, return error status
    if (totalUpserted === 0 && allErrors.length > 0) {
      console.error('Import failed: No members imported and errors occurred');
      return NextResponse.json({
        success: false,
        error: `Failed to import members. ${allErrors.length} error(s) occurred.`,
        imported: 0,
        updated: 0,
        skipped: skipped.length,
        total: data.length,
        errors: allErrors.slice(0, 50), // Limit to first 50 errors
        skippedDetails: skipped.length > 0 ? skipped.slice(0, 20) : undefined
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      imported: totalUpserted,
      updated: totalUpserted, // All upserted records (both new and updated)
      skipped: skipped.length, // Only mobile duplicates
      total: data.length,
      errors: allErrors.length > 0 ? allErrors.slice(0, 50) : undefined, // Limit to first 50 errors
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





