import { NextRequest, NextResponse } from 'next/server';

// BulkSMSBD.net API Configuration
const API_KEY = process.env.BULKSMSBD_API_KEY || 'Bh6WCte0rmh9n0CCepCo';
// Note: Sender ID must match exactly as registered in BulkSMSBD (case-sensitive)
// API docs show "MALLICK NDC" (all caps), but use what's registered in your account
const DEFAULT_SENDER_ID = process.env.SMS_SENDER_ID || 'MALLICK NDC';
// Try HTTPS first, fallback to HTTP if needed
const API_BASE_URL = process.env.BULKSMSBD_API_URL || 'http://bulksmsbd.net/api';

// Validate API key on startup
if (!process.env.BULKSMSBD_API_KEY) {
  console.warn('⚠️ BULKSMSBD_API_KEY not set in environment variables. Using default key from documentation.');
}

// Error code mappings from BulkSMSBD API
const ERROR_MESSAGES: Record<number, string> = {
  202: 'SMS Submitted Successfully',
  1001: 'Invalid Number',
  1002: 'Sender ID not correct or sender ID is disabled',
  1003: 'Please provide all required fields or contact your system administrator',
  1005: 'Internal Error',
  1006: 'Balance Validity Not Available',
  1007: 'Balance Insufficient',
  1011: 'User ID not found',
  1012: 'Masking SMS must be sent in Bengali',
  1013: 'Sender ID has not found Gateway by API key',
  1014: 'Sender Type Name not found using this sender by API key',
  1015: 'Sender ID has not found Any Valid Gateway by API key',
  1016: 'Sender Type Name Active Price Info not found by this sender ID',
  1017: 'Sender Type Name Price Info not found by this sender ID',
  1018: 'The Owner of this account is disabled',
  1019: 'The sender type name price of this account is disabled',
  1020: 'The parent of this account is not found',
  1021: 'The parent active sender type name price of this account is not found',
  1031: 'Your Account Not Verified, Please Contact Administrator',
  1032: 'IP Not whitelisted',
};

/**
 * Convert phone number to BulkSMSBD format
 * Removes + and spaces, keeps only digits
 * Example: +8801712345678 -> 8801712345678
 */
function formatPhoneNumber(phone: string): string {
  // Remove +, spaces, dashes, and other non-digit characters
  return phone.replace(/[^\d]/g, '');
}

/**
 * Validate phone number format for Bangladesh
 * Should be 880XXXXXXXXX (11 digits after country code)
 */
function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  const formatted = formatPhoneNumber(phone);
  
  // Check if it's a valid Bangladesh number
  if (formatted.startsWith('880') && formatted.length === 13) {
    return { valid: true };
  }
  
  // Also accept numbers without country code (11 digits starting with 01)
  if (formatted.startsWith('01') && formatted.length === 11) {
    return { valid: true };
  }
  
  return {
    valid: false,
    error: `Invalid phone number format. Expected: 88017XXXXXXXX or 017XXXXXXXX (Bangladesh format). Received: ${phone}`
  };
}

export async function POST(request: NextRequest) {
  try {
    const { to, message, senderId, numbers } = await request.json();

    // Validate API key
    if (!API_KEY) {
      return NextResponse.json(
        { 
          error: 'BulkSMSBD API key not configured. Please set BULKSMSBD_API_KEY in .env.local',
          success: false 
        },
        { status: 500 }
      );
    }

    // Use custom sender ID if provided, otherwise use default
    const senderIdValue = senderId || DEFAULT_SENDER_ID;

    // Support for bulk SMS (many to many)
    if (numbers && Array.isArray(numbers) && numbers.length > 0) {
      return await sendBulkSMS(numbers, senderIdValue);
    }

    // Single SMS or one to many
    if (!to || !to.trim()) {
      return NextResponse.json(
        { error: 'Recipient phone number is required', success: false },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message content is required', success: false },
        { status: 400 }
      );
    }

    // Validate and format phone number
    const phoneValidation = validatePhoneNumber(to);
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { error: phoneValidation.error, success: false },
        { status: 400 }
      );
    }

    const formattedNumber = formatPhoneNumber(to);
    
    // URL encode the message to handle special characters
    const encodedMessage = encodeURIComponent(message.trim());

    // Build API URL - ensure proper encoding
    // Note: API expects exact format: api_key=KEY&type=text&number=NUMBER&senderid=SENDER&message=MESSAGE
    const apiUrl = `${API_BASE_URL}/smsapi?api_key=${API_KEY}&type=text&number=${formattedNumber}&senderid=${encodeURIComponent(senderIdValue)}&message=${encodedMessage}`;

    console.log('Sending SMS via BulkSMSBD:', {
      to: formattedNumber,
      senderId: senderIdValue,
      messageLength: message.length,
      apiUrl: apiUrl.replace(API_KEY, '***').substring(0, 200) // Hide API key and truncate in logs
    });
    
    // Log the actual URL for debugging (without API key)
    console.log('Full API URL (for debugging):', apiUrl.replace(API_KEY, '***'));

    // Send SMS via GET request
    let response: Response;
    let responseText: string;
    
    try {
      response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'User-Agent': 'CampaignManager/1.0',
        },
        // Add timeout
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      responseText = await response.text();
      console.log('BulkSMSBD API Response (first 500 chars):', responseText.substring(0, 500));
    } catch (fetchError: any) {
      console.error('Failed to fetch from BulkSMSBD API:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: `Network error: ${fetchError.message || 'Failed to connect to SMS API'}`,
          statusCode: 0,
          to: formattedNumber
        },
        { status: 500 }
      );
    }

    // Check if response is HTML (error page)
    const trimmedResponse = responseText.trim();
    if (trimmedResponse.startsWith('<!DOCTYPE') || trimmedResponse.startsWith('<html') || trimmedResponse.startsWith('<HTML')) {
      console.error('BulkSMSBD API returned HTML error page. Full response:', responseText);
      return NextResponse.json(
        {
          success: false,
          error: 'API returned HTML error page. This usually means: 1) Invalid API URL, 2) API service is down, 3) Invalid API key or parameters.',
          statusCode: 0,
          to: formattedNumber,
          details: 'Check your BULKSMSBD_API_KEY and SMS_SENDER_ID in .env.local. Verify the API is accessible.'
        },
        { status: 500 }
      );
    }

    // Try to parse as JSON first (some errors return JSON)
    let statusCode: number;
    let jsonResponse: any = null;
    
    try {
      jsonResponse = JSON.parse(trimmedResponse);
      if (jsonResponse.response_code) {
        statusCode = jsonResponse.response_code;
        // Handle IP whitelist error specifically
        if (statusCode === 1032) {
          const ipAddress = jsonResponse.error_message?.match(/\d+\.\d+\.\d+\.\d+/)?.[0] || 'unknown';
          return NextResponse.json(
            {
              success: false,
              error: `IP Not Whitelisted (Error 1032)`,
              statusCode: 1032,
              to: formattedNumber,
              details: jsonResponse.error_message || 'Your IP address is not whitelisted in BulkSMSBD',
              ipAddress: ipAddress,
              help: `Your IP address (${ipAddress}) needs to be whitelisted in BulkSMSBD dashboard. However, since you're using Vercel, your IP changes with each deployment. Contact BulkSMSBD support to whitelist Vercel's IP ranges or use a different approach.`
            },
            { status: 403 }
          );
        }
      }
    } catch (e) {
      // Not JSON, continue with number parsing
    }

    // Parse response as number (API usually returns status code as text/number)
    if (!jsonResponse) {
      statusCode = parseInt(trimmedResponse);
      
      // Check if status code is valid number
      if (isNaN(statusCode)) {
        console.error('Invalid response from BulkSMSBD API. Expected number or JSON, got:', trimmedResponse);
        return NextResponse.json(
          {
            success: false,
            error: `Invalid API response format. Expected status code (number) or JSON, but received: ${trimmedResponse.substring(0, 200)}`,
            statusCode: 0,
            to: formattedNumber,
            rawResponse: trimmedResponse.substring(0, 500)
          },
          { status: 500 }
        );
      }
    }

    if (statusCode === 202) {
      // Success
      return NextResponse.json({
        success: true,
        status: 'sent',
        statusCode: 202,
        message: 'SMS Submitted Successfully',
        to: formattedNumber,
        senderId: senderIdValue
      });
    } else {
      // Error
      const errorMessage = ERROR_MESSAGES[statusCode] || `API Error: ${statusCode}`;
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          statusCode: statusCode,
          to: formattedNumber
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('SMS send error:', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      { 
        error: error.message || 'Failed to send SMS',
        success: false,
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Send bulk SMS (many to many)
 * Format: numbers array with {number, message} objects
 */
async function sendBulkSMS(
  numbers: Array<{ number: string; message: string }>,
  senderId: string
): Promise<NextResponse> {
  try {
    const results = [];
    const errors = [];

    // Rate limit: 2 requests per second = 500ms delay between requests
    const RATE_LIMIT_DELAY_MS = 500;

    for (let i = 0; i < numbers.length; i++) {
      const item = numbers[i];
      
      // Add delay before each request (except the first one)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      }

      const phoneValidation = validatePhoneNumber(item.number);
      if (!phoneValidation.valid) {
        errors.push({
          number: item.number,
          error: phoneValidation.error
        });
        continue;
      }

      const formattedNumber = formatPhoneNumber(item.number);
      const encodedMessage = encodeURIComponent(item.message.trim());

      const apiUrl = `${API_BASE_URL}/smsapi?api_key=${API_KEY}&type=text&number=${formattedNumber}&senderid=${encodeURIComponent(senderId)}&message=${encodedMessage}`;

      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: { 
            'Accept': '*/*',
            'User-Agent': 'CampaignManager/1.0'
          },
          signal: AbortSignal.timeout(30000),
        });

        const responseText = await response.text();
        
        // Check for rate limit errors in response
        if (responseText.includes('Too many requests') || responseText.includes('rate limit')) {
          console.warn(`Rate limit detected for ${formattedNumber}. Waiting longer before retry...`);
          // Wait longer if rate limited (2 seconds)
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Retry once
          try {
            const retryResponse = await fetch(apiUrl, {
              method: 'GET',
              headers: { 
                'Accept': '*/*',
                'User-Agent': 'CampaignManager/1.0'
              },
              signal: AbortSignal.timeout(30000),
            });
            const retryResponseText = await retryResponse.text();
            
            if (retryResponseText.includes('Too many requests') || retryResponseText.includes('rate limit')) {
              errors.push({
                number: formattedNumber,
                error: 'Rate limit exceeded. Please try again later or contact support to increase rate limit.',
                statusCode: 429
              });
              continue;
            }
            
            // Process retry response
            const retryStatusCode = parseInt(retryResponseText.trim());
            if (!isNaN(retryStatusCode) && retryStatusCode === 202) {
              results.push({
                number: formattedNumber,
                success: true,
                statusCode: 202
              });
            } else {
              errors.push({
                number: formattedNumber,
                error: ERROR_MESSAGES[retryStatusCode] || `Error ${retryStatusCode}`,
                statusCode: retryStatusCode
              });
            }
            continue;
          } catch (retryErr: any) {
            errors.push({
              number: formattedNumber,
              error: 'Rate limit exceeded and retry failed',
              statusCode: 429
            });
            continue;
          }
        }
        
        // Check for HTML error page
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          errors.push({
            number: formattedNumber,
            error: 'API returned HTML error page',
            statusCode: 0
          });
          continue;
        }
        
        // Try to parse as JSON first
        let statusCode: number;
        let jsonResponse: any = null;
        
        try {
          jsonResponse = JSON.parse(responseText.trim());
          if (jsonResponse.response_code) {
            statusCode = jsonResponse.response_code;
            // Handle IP whitelist error specifically
            if (statusCode === 1032) {
              const ipAddress = jsonResponse.error_message?.match(/\d+\.\d+\.\d+\.\d+/)?.[0] || 'unknown';
              errors.push({
                number: formattedNumber,
                error: `IP Not Whitelisted (${ipAddress}). Contact BulkSMSBD support to whitelist Vercel IP ranges.`,
                statusCode: 1032
              });
              continue;
            }
          }
        } catch (e) {
          // Not JSON, continue with number parsing
        }
        
        // Parse as number if not JSON
        if (!jsonResponse) {
          statusCode = parseInt(responseText.trim());
          
          if (isNaN(statusCode)) {
            errors.push({
              number: formattedNumber,
              error: `Invalid API response: ${responseText.substring(0, 100)}`,
              statusCode: 0
            });
            continue;
          }
        }

        if (statusCode === 202) {
          results.push({
            number: formattedNumber,
            success: true,
            statusCode: 202
          });
        } else {
          errors.push({
            number: formattedNumber,
            error: ERROR_MESSAGES[statusCode] || `Error ${statusCode}`,
            statusCode
          });
        }
      } catch (err: any) {
        errors.push({
          number: formattedNumber,
          error: err.message || 'Failed to send'
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      total: numbers.length,
      sent: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send bulk SMS'
      },
      { status: 500 }
    );
  }
}
