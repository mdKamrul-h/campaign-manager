import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { replaceVariables } from '@/lib/variable-replacement';
import { createEmailHTML, createEmailText } from '@/lib/email-formatter';

export async function POST(request: NextRequest) {
  let channel: string | undefined; // Declare channel outside try block for error handling
  try {
    const {
      title,
      content,
      visual_url,
      channel: requestChannel,
      targetType,
      targetValue,
      selectedMemberIds, // Specific member IDs to send to (for batch selection)
      sendText,
      sendVisual,
      smsSenderId, // Custom SMS sender ID
      modifiedEmails, // Modified emails: { memberId: { subject, content } }
      approvedMemberIds, // Only send to approved member IDs if provided
    } = await request.json();
    
    channel = requestChannel; // Assign to outer variable

    // Validation: Must send either text or visual
    if (!sendText && !sendVisual) {
      return NextResponse.json(
        { error: 'Please select at least one option: send text or send visual' },
        { status: 400 }
      );
    }

    // Validation: If sending text, content is required
    if (sendText && (!content || !content.trim())) {
      return NextResponse.json(
        { error: 'Content is required when sending text. Please generate content first.' },
        { status: 400 }
      );
    }

    // Validation: For SMS channel, content is mandatory
    if (channel === 'sms') {
      if (!content || !content.trim()) {
        return NextResponse.json(
          { error: 'SMS campaigns require content. Please generate content before sending.' },
          { status: 400 }
        );
      }
      // SMS content length validation (1600 chars = ~10 SMS messages)
      if (content.length > 1600) {
        return NextResponse.json(
          { error: `SMS content is too long (${content.length} characters). Please keep it under 1600 characters.` },
          { status: 400 }
        );
      }
    }

    // Validation: If sending visual, visual URL is required
    if (sendVisual && !visual_url) {
      return NextResponse.json(
        { error: 'Visual URL is required when sending visual. Please generate or upload a visual first.' },
        { status: 400 }
      );
    }

    // Validation: Title is required
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Campaign title is required' },
        { status: 400 }
      );
    }

    // Get target members
    let query = supabaseAdmin.from('members').select('*');

    if (targetType === 'select-members' && selectedMemberIds && Array.isArray(selectedMemberIds) && selectedMemberIds.length > 0) {
      // Use specific member IDs for select-members option
      query = query.in('id', selectedMemberIds);
    } else if (targetType === 'batch' && targetValue) {
      if (selectedMemberIds && Array.isArray(selectedMemberIds) && selectedMemberIds.length > 0) {
        // Use specific member IDs if provided
        query = query.in('id', selectedMemberIds);
      } else {
        // Otherwise, get all members in batch
        query = query.eq('batch', targetValue);
      }
    } else if (targetType === 'batch-filter' && targetValue) {
      // Filter by batch year ranges - handled below in the query execution section
      // Set query to get all members with batch (we'll filter in memory)
      query = query.not('batch', 'is', null);
    } else if (targetType === 'membership' && targetValue) {
      // Use pattern matching for membership types (GM-*, DM-*, FM-*, LM-*)
      query = query.like('membership_type', `${targetValue}-%`);
    }

    // Execute query and filter members
    let members;
    const { data: queryMembers, error: membersError } = await query;
    if (membersError) throw membersError;
    
    if (targetType === 'batch-filter' && targetValue) {
      // Filter by batch year ranges in memory
      members = (queryMembers || []).filter(m => {
        if (!m.batch || m.batch.trim() === '') return false;
        const batchNum = parseInt(m.batch);
        if (isNaN(batchNum)) return false;
        
        if (targetValue === 'senior') {
          return batchNum < 1999;
        } else if (targetValue === 'junior') {
          return batchNum > 1999;
        } else if (targetValue === 'batchmate') {
          return batchNum === 1999;
        }
        return false;
      });
    } else {
      members = queryMembers;
    }

    if (!members || members.length === 0) {
      return NextResponse.json(
        { error: 'No members found matching the criteria' },
        { status: 400 }
      );
    }

    // Save campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .insert([{
        title,
        content,
        visual_url,
        channel,
        status: 'sent',
        target_audience: { type: targetType, value: targetValue },
      }])
      .select()
      .single();

    if (campaignError) throw campaignError;

    // For email campaigns, use batch sending for better performance
    if (channel === 'email') {
      try {
        // Filter members - only send to approved ones if provided
        let membersToSend = members.filter(m => m.email && m.email.trim());
        if (approvedMemberIds && Array.isArray(approvedMemberIds) && approvedMemberIds.length > 0) {
          membersToSend = membersToSend.filter(m => approvedMemberIds.includes(m.id));
        }

        // Prepare email batch with personalized content
        const emailBatch = membersToSend.map((member) => {
            // Check if this email was modified
            const modified = modifiedEmails && modifiedEmails[member.id];
            
            // Use modified content/subject if available, otherwise use personalized defaults
            let personalizedContent: string;
            let personalizedTitle: string;
            
            if (modified) {
              personalizedContent = modified.content;
              personalizedTitle = modified.subject;
            } else {
              personalizedContent = replaceVariables(content, member);
              personalizedTitle = replaceVariables(title, member);
            }
            
            // Create properly formatted HTML email
            const htmlContent = createEmailHTML(
              personalizedContent,
              sendVisual && visual_url ? visual_url : undefined
            );
            
            // Create plain text version for email clients that don't support HTML
            const textContent = createEmailText(personalizedContent);
            
            return {
              to: member.email.trim(),
              subject: personalizedTitle,
              text: textContent,
              html: htmlContent,
              reply_to: process.env.REPLY_TO_EMAIL || 'vote@mallicknazrul.com',
              headers: {
                'X-Priority': '1', // High priority
                'X-MSMail-Priority': 'High',
                'Importance': 'high',
                // Avoid 'Precedence: bulk' as it signals marketing emails
                'X-Mailer': 'Campaign Manager',
              },
            };
          });

        if (emailBatch.length === 0) {
          return NextResponse.json(
            { error: 'No valid email addresses found in target members' },
            { status: 400 }
          );
        }

        console.log(`Sending batch email to ${emailBatch.length} recipients`);

        // Send batch emails
        let batchResponse;
        try {
          batchResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send/email/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emails: emailBatch }),
          });
        } catch (fetchError: any) {
          // Handle network errors (fetch failed, DNS errors, etc.)
          const errorMessage = fetchError.message || 'Unknown network error';
          if (errorMessage.includes('fetch failed') || errorMessage.includes('Failed to fetch') || errorMessage.includes('ECONNREFUSED')) {
            throw new Error(`Unable to reach email service. This usually means:\n1. NEXTAUTH_URL is incorrect (current: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'})\n2. Email service endpoint is down\n3. Network connectivity issue\n\nOriginal error: ${errorMessage}`);
          }
          throw fetchError;
        }

        // Check if response is HTML (error page) before parsing as JSON
        const contentType = batchResponse.headers.get('content-type');
        let batchResult;
        
        if (contentType && contentType.includes('application/json')) {
          batchResult = await batchResponse.json();
        } else {
          // Response is not JSON, likely an HTML error page
          const responseText = await batchResponse.text();
          const trimmedResponse = responseText.trim();
          
          if (trimmedResponse.startsWith('<!DOCTYPE') || trimmedResponse.startsWith('<html') || trimmedResponse.startsWith('<HTML')) {
            console.error('Batch email API returned HTML error page. Response:', trimmedResponse.substring(0, 500));
            throw new Error('Email service returned HTML error page. This usually means: 1) Invalid API URL, 2) API service is down, 3) Server error. Check your NEXTAUTH_URL environment variable.');
          } else {
            // Try to parse as JSON anyway, might be text error
            try {
              batchResult = JSON.parse(responseText);
            } catch {
              throw new Error(`Email service returned invalid response: ${responseText.substring(0, 200)}`);
            }
          }
        }

        // Process results - handle partial successes
        const emailMembers = members.filter(m => m.email && m.email.trim());
        const emailResults = batchResult.results || [];
        
        // Create a map of email -> result for quick lookup
        const resultMap = new Map<string, { success: boolean; error?: string }>();
        emailResults.forEach((result: any) => {
          if (result.to) {
            resultMap.set(result.to.toLowerCase().trim(), {
              success: result.success || false,
              error: result.error
            });
          }
        });

        // Log each email send attempt individually
        const logPromises = emailMembers.map(async (member) => {
          const emailLower = member.email.toLowerCase().trim();
          const result = resultMap.get(emailLower);
          
          if (result && result.success) {
            await supabaseAdmin
              .from('campaign_logs')
              .insert([{
                campaign_id: campaign.id,
                member_id: member.id,
                channel,
                status: 'success',
                error_message: null,
              }]);
            return { success: true, member: member.name, email: member.email };
          } else {
            const errorMsg = result?.error || 'Email send failed';
            await supabaseAdmin
              .from('campaign_logs')
              .insert([{
                campaign_id: campaign.id,
                member_id: member.id,
                channel,
                status: 'failed',
                error_message: errorMsg,
              }]);
            return { success: false, member: member.name, email: member.email, error: errorMsg };
          }
        });

        const loggedResults = await Promise.all(logPromises);

        // Handle non-email members
        const nonEmailMembers = members.filter(m => !m.email || !m.email.trim());
        const nonEmailResults = nonEmailMembers.map((member) => {
          return { success: false, member: member.name, error: 'Email address is missing' };
        });

        const allResults = [...loggedResults, ...nonEmailResults];
        const successCount = loggedResults.filter(r => r.success).length;
        const failedCount = loggedResults.filter(r => !r.success).length + nonEmailMembers.length;

        // Return success if at least one email was sent
        return NextResponse.json({
          success: successCount > 0,
          campaign_id: campaign.id,
          total: members.length,
          sent: successCount,
          failed: failedCount,
          skipped: nonEmailMembers.length,
          results: allResults,
          warning: failedCount > 0 
            ? `${failedCount} email(s) failed to send. Check results for details.`
            : nonEmailMembers.length > 0 
            ? `${nonEmailMembers.length} members skipped (no email address)`
            : undefined
        });
      } catch (batchError: any) {
        console.error('Batch email error:', batchError);
        return NextResponse.json(
          { error: batchError.message || 'Failed to send batch emails' },
          { status: 500 }
        );
      }
    }

    // Send to each member (for SMS and social media)
    const sendPromises = members.map(async (member) => {
      try {
        let success = false;
        let error = null;

        if (channel === 'sms') {
          // Validate phone number format
          if (!member.mobile || !member.mobile.trim()) {
            error = 'Phone number is missing';
            success = false;
          } else {
            try {
              // Format phone number for BulkSMSBD (remove + and non-digits)
              const formattedMobile = member.mobile.trim().replace(/[^\d]/g, '');
              
              // Validate Bangladesh phone number format
              if (!formattedMobile.match(/^(880|01)\d{9,10}$/)) {
                error = `Invalid phone number format for ${member.name}. Expected Bangladesh format: 880XXXXXXXXX or 01XXXXXXXXX`;
                success = false;
              } else {
                // Replace variables in SMS content for each member
                const personalizedContent = replaceVariables(content, member);
                
                // Use Railway SMS proxy if configured, otherwise use direct SMS route
                // Support both SMS_PROXY_URL and RAILWAY_SMS_SERVICE_URL for compatibility
                const smsEndpoint = (process.env.SMS_PROXY_URL || process.env.RAILWAY_SMS_SERVICE_URL)
                  ? `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/sms/proxy`
                  : `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send/sms`;
                
                const response = await fetch(smsEndpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: member.mobile.trim(), // SMS API will format it
                    message: personalizedContent,
                    senderId: smsSenderId, // Pass custom sender ID
                  }),
                });

                // Handle non-JSON responses
                let smsResult;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                  smsResult = await response.json();
                } else {
                  const textResponse = await response.text();
                  console.error('SMS API returned non-JSON response:', textResponse.substring(0, 200));
                  smsResult = {
                    success: false,
                    error: 'Invalid response from SMS API',
                    details: textResponse.substring(0, 200)
                  };
                }
                
                // Handle Railway proxy response format
                // Railway returns: { success: true, code: "202", message: "...", ... }
                // Direct SMS returns: { success: true, statusCode: 202, ... }
                const isSuccess = smsResult.success === true || 
                                 smsResult.statusCode === 202 || 
                                 smsResult.code === '202' || 
                                 smsResult.code === 202;
                
                if (response.ok && isSuccess) {
                  success = true;
                  const statusCode = smsResult.statusCode || parseInt(smsResult.code) || 202;
                  console.log(`SMS sent successfully to ${member.name} (${member.mobile}): Status ${statusCode}`);
                } else {
                  success = false;
                  // Get detailed error message (handle both Railway and direct API formats)
                  let errorMsg = smsResult.error || smsResult.details || smsResult.message || `SMS sending failed (Status: ${response.status})`;
                  
                  // Ensure error message is a string (not an object)
                  if (typeof errorMsg !== 'string') {
                    errorMsg = typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : String(errorMsg);
                  }
                  
                  const statusCode = smsResult.statusCode || (smsResult.code ? parseInt(String(smsResult.code)) : 0) || 0;
                  
                  if (statusCode && statusCode > 0) {
                    error = `${errorMsg} (Error Code: ${statusCode})`;
                  } else {
                    error = errorMsg;
                  }
                  
                  console.error(`SMS failed for ${member.name} (${member.mobile}):`, {
                    error: error,
                    statusCode: statusCode,
                    code: smsResult.code,
                    response: smsResult
                  });
                }
              }
            } catch (smsError: any) {
              success = false;
              // Capture more detailed error information
              let errorMsg = 'Failed to send SMS';
              if (smsError.message) {
                errorMsg = smsError.message;
              } else if (smsError.error) {
                errorMsg = smsError.error;
              } else if (typeof smsError === 'string') {
                errorMsg = smsError;
              }
              
              // Add context about the error
              if (smsError.message?.includes('fetch failed') || smsError.message?.includes('Failed to fetch')) {
                errorMsg = 'Network error: Cannot reach SMS API. Check NEXTAUTH_URL and network connectivity.';
              } else if (smsError.message?.includes('timeout')) {
                errorMsg = 'Request timeout: SMS API took too long to respond.';
              }
              
              error = errorMsg;
              console.error(`SMS error for ${member.name} (${member.mobile}):`, {
                error: smsError,
                message: smsError.message,
                stack: smsError.stack,
                name: smsError.name
              });
            }
          }
        } else if (channel && ['facebook', 'instagram', 'linkedin', 'whatsapp'].includes(channel)) {
          const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send/social`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platform: channel as string,
              message: content,
              imageUrl: sendVisual ? visual_url : null,
            }),
          });
          success = response.ok;
        }

        // Log the send attempt
        await supabaseAdmin
          .from('campaign_logs')
          .insert([{
            campaign_id: campaign.id,
            member_id: member.id,
            channel,
            status: success ? 'success' : 'failed',
            error_message: error,
          }]);

        return { success, member: member.name, error: error || undefined };
      } catch (err: any) {
        console.error(`Failed to send to ${member.name}:`, err);
        return { success: false, member: member.name, error: err.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter((r) => r.success).length;

    // Check if all sends failed
    const allFailed = successCount === 0 && members.length > 0;
    const someFailed = successCount > 0 && successCount < members.length;

    return NextResponse.json({
      success: !allFailed, // Only true if at least one message was sent
      campaign_id: campaign.id,
      total: members.length,
      sent: successCount,
      failed: members.length - successCount,
      results,
      warning: allFailed 
        ? 'All SMS messages failed to send. Check Twilio configuration and phone numbers.' 
        : someFailed 
        ? 'Some SMS messages failed to send. Check the results for details.'
        : undefined
    });
  } catch (error: any) {
    console.error('Send campaign error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      channel: channel,
      error: error
    });
    
    // Provide more detailed error messages
    let errorMessage = 'Failed to send campaign';
    let errorDetails = '';
    
    if (error.message) {
      errorMessage = error.message;
    } else if (error.name) {
      errorMessage = `${error.name}: ${error.message || 'Unknown error'}`;
    }
    
    // Check for common error types
    if (error.message?.includes('fetch failed') || error.message?.includes('Failed to fetch')) {
      errorMessage = 'Network error: Unable to reach service';
      errorDetails = 'Check your NEXTAUTH_URL environment variable and network connectivity.';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Request timeout: Service took too long to respond';
      errorDetails = 'The API may be slow or unavailable. Please try again.';
    } else if (error.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Connection refused: Cannot connect to service';
      errorDetails = 'Check if the API endpoint is accessible.';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails || error.message || 'Unknown error occurred',
        channel: channel,
        help: channel === 'sms' 
          ? 'Check: 1) BULKSMSBD_API_KEY is set, 2) SMS_SENDER_ID is correct, 3) Phone numbers are valid, 4) API is accessible'
          : channel === 'email'
          ? 'Check: 1) RESEND_API_KEY is set, 2) FROM_EMAIL is configured, 3) Email addresses are valid'
          : 'Check your configuration and try again'
      },
      { status: 500 }
    );
  }
}
