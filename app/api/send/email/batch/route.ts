import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send batch emails with individual error handling
 * Sends emails in chunks and continues even if some fail
 * Returns detailed results for each email
 */
export async function POST(request: NextRequest) {
  try {
    const { emails } = await request.json();

    // Validate required fields
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Emails array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service not configured. Please set RESEND_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    const fromEmail = process.env.FROM_EMAIL || 'Mallick NDC99 Ballot 7 <vote@mallicknazrul.com>';
    const replyTo = process.env.REPLY_TO_EMAIL || 'vote@mallicknazrul.com';

    // Email validation regex (supports all valid email formats including custom domains)
    // This regex accepts: user@domain.com, user@company.com, user@any-domain.any-tld
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Validate and prepare emails
    const validatedEmails = emails.map((email: any, index: number) => {
      if (!email.to || !email.to.trim()) {
        return { valid: false, index, error: 'Missing recipient address', email: null };
      }
      
      const emailAddress = Array.isArray(email.to) ? email.to[0] : email.to.trim();
      
      // Validate email format (supports ALL domains including custom ones like @company.com)
      // The regex checks for: local-part@domain.tld format
      if (!emailRegex.test(emailAddress)) {
        console.warn(`Invalid email format detected: ${emailAddress}`);
        return { valid: false, index, error: `Invalid email format: ${emailAddress}`, email: null };
      }
      
      // Log custom domain emails for debugging
      const domain = emailAddress.split('@')[1];
      const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
      if (domain && !commonDomains.some(d => domain.toLowerCase().includes(d))) {
        console.log(`Sending to custom domain: ${emailAddress} (domain: ${domain})`);
      }
      
      if (!email.subject || !email.subject.trim()) {
        return { valid: false, index, error: 'Missing subject', email: null };
      }
      
      const emailReplyTo = email.reply_to || replyTo;
      const emailHeaders = email.headers || {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Campaign Manager',
      };
      
      return {
        valid: true,
        index,
        error: null,
        email: {
          from: email.from || fromEmail,
          to: Array.isArray(email.to) ? email.to : [email.to.trim()],
          subject: email.subject.trim(),
          html: email.html || email.text || '',
          text: email.text || '',
          reply_to: emailReplyTo,
          headers: emailHeaders,
          // Store original email address for tracking
          originalTo: Array.isArray(email.to) ? email.to[0] : email.to.trim(),
        }
      };
    });

    // Separate valid and invalid emails
    const validEmails = validatedEmails.filter(e => e.valid).map(e => e.email!);
    const invalidEmails = validatedEmails.filter(e => !e.valid);

    if (validEmails.length === 0) {
      return NextResponse.json({
        success: false,
        sent: 0,
        failed: emails.length,
        skipped: invalidEmails.length,
        results: invalidEmails.map(e => ({
          to: emails[e.index]?.to || 'unknown',
          success: false,
          error: e.error
        }))
      });
    }

    // Resend batch API can handle up to 100 emails per batch
    // For 800 emails, we'll split into chunks of 100
    const BATCH_SIZE = 100;
    const results: Array<{ to: string; success: boolean; id?: string; error?: string }> = [];
    const failedEmails: Array<{ email: any; error: string }> = [];

    // Process emails in chunks
    for (let i = 0; i < validEmails.length; i += BATCH_SIZE) {
      const chunk = validEmails.slice(i, i + BATCH_SIZE);
      
      try {
        const { data, error } = await resend.batch.send(chunk);

        if (error) {
          // If batch fails, try sending individually
          console.warn(`Batch chunk ${i / BATCH_SIZE + 1} failed, trying individual sends:`, error.message);
          
          // Send each email individually with rate limiting
          // Resend allows 10 requests per second, so we use 150ms delay (safe margin)
          for (let idx = 0; idx < chunk.length; idx++) {
            const email = chunk[idx];
            
            // Add delay between individual sends (except first)
            if (idx > 0) {
              await new Promise(resolve => setTimeout(resolve, 150));
            }
            
            try {
              const { data: individualData, error: individualError } = await resend.emails.send({
                from: email.from,
                to: email.to[0],
                subject: email.subject,
                html: email.html,
                text: email.text,
                reply_to: email.reply_to,
                headers: email.headers,
              });

              if (individualError) {
                const errorMsg = individualError.message || 'Unknown error';
                const errorString = String(errorMsg).toLowerCase();
                
                // Check for rate limit errors (429, rate limit, too many requests)
                const isRateLimit = errorString.includes('rate limit') || 
                                   errorString.includes('too many requests') || 
                                   errorString.includes('429') ||
                                   (typeof individualError === 'object' && 'statusCode' in individualError && individualError.statusCode === 429);
                
                if (isRateLimit) {
                  console.warn(`Rate limit detected for ${email.originalTo}. Waiting before retry...`);
                  // Wait 1 second for Resend rate limits (10 req/s = 100ms, but we wait longer to be safe)
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Retry once
                  try {
                    const { data: retryData, error: retryError } = await resend.emails.send({
                      from: email.from,
                      to: email.to[0],
                      subject: email.subject,
                      html: email.html,
                      text: email.text,
                      reply_to: email.reply_to,
                      headers: email.headers,
                    });
                    
                    if (retryError) {
                      const retryErrorMsg = retryError.message || 'Unknown error';
                      const retryErrorString = String(retryErrorMsg).toLowerCase();
                      const stillRateLimited = retryErrorString.includes('rate limit') || 
                                             retryErrorString.includes('too many requests') || 
                                             retryErrorString.includes('429');
                      
                      if (stillRateLimited) {
                        const domain = email.originalTo.split('@')[1];
                        console.error(`Rate limit still active for ${email.originalTo} (domain: ${domain})`);
                        results.push({
                          to: email.originalTo,
                          success: false,
                          error: 'Rate limit exceeded. Please try again later or contact Resend support to increase rate limit.'
                        });
                        failedEmails.push({ email, error: 'Rate limit exceeded' });
                      } else {
                        // Other error on retry
                        const domain = email.originalTo.split('@')[1];
                        console.error(`Failed to send to ${email.originalTo} (domain: ${domain}) after retry:`, retryErrorMsg);
                        results.push({
                          to: email.originalTo,
                          success: false,
                          error: retryErrorMsg
                        });
                        failedEmails.push({ email, error: retryErrorMsg });
                      }
                    } else {
                      // Retry succeeded
                      const domain = email.originalTo.split('@')[1];
                      console.log(`Successfully sent to ${email.originalTo} (domain: ${domain}) after rate limit retry, Resend ID: ${retryData?.id}`);
                      results.push({
                        to: email.originalTo,
                        success: true,
                        id: retryData?.id
                      });
                    }
                  } catch (retryException: any) {
                    const domain = email.originalTo.split('@')[1];
                    console.error(`Retry exception for ${email.originalTo} (domain: ${domain}):`, retryException.message);
                    results.push({
                      to: email.originalTo,
                      success: false,
                      error: 'Rate limit exceeded and retry failed'
                    });
                    failedEmails.push({ email, error: 'Rate limit exceeded' });
                  }
                } else {
                  // Not a rate limit error, handle normally
                  const domain = email.originalTo.split('@')[1];
                  console.error(`Failed to send to ${email.originalTo} (domain: ${domain}):`, errorMsg);
                  console.error('Full error details:', JSON.stringify(individualError));
                  
                  results.push({
                    to: email.originalTo,
                    success: false,
                    error: errorMsg
                  });
                  failedEmails.push({ email, error: errorMsg });
                }
              } else {
                const domain = email.originalTo.split('@')[1];
                console.log(`Successfully sent to ${email.originalTo} (domain: ${domain}), Resend ID: ${individualData?.id}`);
                results.push({
                  to: email.originalTo,
                  success: true,
                  id: individualData?.id
                });
              }
            } catch (individualException: any) {
              const errorMsg = individualException.message || 'Failed to send email';
              results.push({
                to: email.originalTo,
                success: false,
                error: errorMsg
              });
              failedEmails.push({ email, error: errorMsg });
              console.error(`Exception sending to ${email.originalTo}:`, errorMsg);
            }
          }
        } else if (data) {
          // Batch succeeded - mark all as sent
          // Resend batch API returns data but not individual IDs
          chunk.forEach((email, idx) => {
            results.push({
              to: email.originalTo,
              success: true,
              id: `batch-${i + idx}-${Date.now()}`
            });
          });
        } else {
          // No data returned - mark all as failed
          chunk.forEach((email) => {
            const errorMsg = 'No response from email service';
            results.push({
              to: email.originalTo,
              success: false,
              error: errorMsg
            });
            failedEmails.push({ email, error: errorMsg });
          });
        }

        // Delay between chunks to avoid rate limiting
        // Resend allows 10 requests/second, so 200ms delay between chunks is safe
        if (i + BATCH_SIZE < validEmails.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (chunkError: any) {
        console.error(`Error processing chunk ${i / BATCH_SIZE + 1}:`, chunkError);
        
        // Try sending individually if chunk fails with rate limiting
        for (let idx = 0; idx < chunk.length; idx++) {
          const email = chunk[idx];
          
          // Add delay between individual sends (except first)
          if (idx > 0) {
            await new Promise(resolve => setTimeout(resolve, 150));
          }
          
          try {
            const { data: individualData, error: individualError } = await resend.emails.send({
              from: email.from,
              to: email.to[0],
              subject: email.subject,
              html: email.html,
              text: email.text,
              reply_to: email.reply_to,
              headers: email.headers,
            });

            if (individualError) {
              const errorMsg = individualError.message || 'Unknown error';
              const errorString = String(errorMsg).toLowerCase();
              
              // Check for rate limit errors (429, rate limit, too many requests)
              const isRateLimit = errorString.includes('rate limit') || 
                                 errorString.includes('too many requests') || 
                                 errorString.includes('429') ||
                                 (typeof individualError === 'object' && 'statusCode' in individualError && individualError.statusCode === 429);
              
              if (isRateLimit) {
                console.warn(`Rate limit detected for ${email.originalTo}. Waiting before retry...`);
                // Wait 1 second for Resend rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Retry once
                try {
                  const { data: retryData, error: retryError } = await resend.emails.send({
                    from: email.from,
                    to: email.to[0],
                    subject: email.subject,
                    html: email.html,
                    text: email.text,
                    reply_to: email.reply_to,
                    headers: email.headers,
                  });
                  
                  if (retryError) {
                    const retryErrorMsg = retryError.message || 'Unknown error';
                    const retryErrorString = String(retryErrorMsg).toLowerCase();
                    const stillRateLimited = retryErrorString.includes('rate limit') || 
                                           retryErrorString.includes('too many requests') || 
                                           retryErrorString.includes('429');
                    
                    if (stillRateLimited) {
                      const domain = email.originalTo.split('@')[1];
                      console.error(`Rate limit still active for ${email.originalTo} (domain: ${domain})`);
                      results.push({
                        to: email.originalTo,
                        success: false,
                        error: 'Rate limit exceeded. Please try again later or contact Resend support to increase rate limit.'
                      });
                      failedEmails.push({ email, error: 'Rate limit exceeded' });
                    } else {
                      // Other error on retry
                      const domain = email.originalTo.split('@')[1];
                      console.error(`Failed to send to ${email.originalTo} (domain: ${domain}) after retry:`, retryErrorMsg);
                      results.push({
                        to: email.originalTo,
                        success: false,
                        error: retryErrorMsg
                      });
                      failedEmails.push({ email, error: retryErrorMsg });
                    }
                  } else {
                    // Retry succeeded
                    const domain = email.originalTo.split('@')[1];
                    console.log(`Successfully sent to ${email.originalTo} (domain: ${domain}) after rate limit retry, Resend ID: ${retryData?.id}`);
                    results.push({
                      to: email.originalTo,
                      success: true,
                      id: retryData?.id
                    });
                  }
                } catch (retryException: any) {
                  const domain = email.originalTo.split('@')[1];
                  console.error(`Retry exception for ${email.originalTo} (domain: ${domain}):`, retryException.message);
                  results.push({
                    to: email.originalTo,
                    success: false,
                    error: 'Rate limit exceeded and retry failed'
                  });
                  failedEmails.push({ email, error: 'Rate limit exceeded' });
                }
              } else {
                // Not a rate limit error, handle normally
                const domain = email.originalTo.split('@')[1];
                console.error(`Failed to send to ${email.originalTo} (domain: ${domain}):`, errorMsg);
                console.error('Full error details:', JSON.stringify(individualError));
                
                results.push({
                  to: email.originalTo,
                  success: false,
                  error: errorMsg
                });
                failedEmails.push({ email, error: errorMsg });
              }
            } else {
              const domain = email.originalTo.split('@')[1];
              console.log(`Successfully sent to ${email.originalTo} (domain: ${domain}), Resend ID: ${individualData?.id}`);
              results.push({
                to: email.originalTo,
                success: true,
                id: individualData?.id
              });
            }
          } catch (individualException: any) {
            const errorMsg = individualException.message || 'Failed to send email';
            const errorString = String(errorMsg).toLowerCase();
            
            // Check if exception is due to rate limiting
            const isRateLimit = errorString.includes('rate limit') || 
                               errorString.includes('too many requests') || 
                               errorString.includes('429');
            
            if (isRateLimit) {
              console.warn(`Rate limit exception for ${email.originalTo}. Waiting before retry...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Retry once
              try {
                const { data: retryData, error: retryError } = await resend.emails.send({
                  from: email.from,
                  to: email.to[0],
                  subject: email.subject,
                  html: email.html,
                  text: email.text,
                  reply_to: email.reply_to,
                  headers: email.headers,
                });
                
                if (retryError) {
                  results.push({
                    to: email.originalTo,
                    success: false,
                    error: 'Rate limit exceeded. Please try again later.'
                  });
                  failedEmails.push({ email, error: 'Rate limit exceeded' });
                } else {
                  results.push({
                    to: email.originalTo,
                    success: true,
                    id: retryData?.id
                  });
                }
              } catch (retryException: any) {
                results.push({
                  to: email.originalTo,
                  success: false,
                  error: 'Rate limit exceeded and retry failed'
                });
                failedEmails.push({ email, error: 'Rate limit exceeded' });
              }
            } else {
              results.push({
                to: email.originalTo,
                success: false,
                error: errorMsg
              });
              failedEmails.push({ email, error: errorMsg });
            }
          }
        }
      }
    }

    // Add invalid emails to results
    invalidEmails.forEach(e => {
      results.push({
        to: emails[e.index]?.to || 'unknown',
        success: false,
        error: e.error || 'Invalid email'
      });
    });

    const sentCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`Batch email processing complete: ${sentCount} sent, ${failedCount} failed out of ${emails.length} total`);

    // Always return success if at least one email was sent
    return NextResponse.json({
      success: sentCount > 0,
      sent: sentCount,
      failed: failedCount,
      skipped: invalidEmails.length,
      total: emails.length,
      results: results,
      failedDetails: failedEmails.length > 0 ? failedEmails.map(f => ({
        to: f.email.originalTo,
        error: f.error
      })) : undefined
    });
  } catch (error: any) {
    console.error('Batch email send error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to send batch emails',
        details: error.name || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

