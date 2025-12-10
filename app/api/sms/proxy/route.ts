import { NextRequest, NextResponse } from 'next/server';

/**
 * SMS Proxy Route for Railway
 * 
 * This route proxies SMS requests to a Railway-hosted SMS service
 * that has a static outbound IP for BulkSMSBD whitelisting.
 * 
 * Railway Service: bulksms-proxy-production.up.railway.app
 * 
 * Usage:
 * - Set SMS_PROXY_URL or RAILWAY_SMS_SERVICE_URL in environment variables (Vercel)
 * - This route forwards requests to Railway, which uses static IP
 * 
 * The campaign route (app/api/send/campaign/route.ts) automatically uses this
 * proxy if SMS_PROXY_URL or RAILWAY_SMS_SERVICE_URL is set.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, senderId, numbers } = body;

    // Validate required fields
    if (numbers && Array.isArray(numbers) && numbers.length > 0) {
      // Bulk SMS request
      if (!numbers.every((n: any) => n.number && n.message)) {
        return NextResponse.json(
          { error: 'Each number must have both "number" and "message" fields', success: false },
          { status: 400 }
        );
      }
    } else {
      // Single SMS request
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
    }

    // Get Railway SMS service URL from environment (support both variable names)
    let railwayServiceUrl = process.env.SMS_PROXY_URL || process.env.RAILWAY_SMS_SERVICE_URL;
    
    if (!railwayServiceUrl) {
      return NextResponse.json(
        {
          error: 'Railway SMS service URL not configured. Please set SMS_PROXY_URL or RAILWAY_SMS_SERVICE_URL in environment variables.',
          success: false,
          help: 'Set SMS_PROXY_URL to your Railway SMS service URL (e.g., https://bulksms-proxy-production.up.railway.app)'
        },
        { status: 500 }
      );
    }

    // Normalize URL - ensure it has https:// protocol
    railwayServiceUrl = railwayServiceUrl.trim();
    if (!railwayServiceUrl.startsWith('http://') && !railwayServiceUrl.startsWith('https://')) {
      railwayServiceUrl = `https://${railwayServiceUrl}`;
    }
    // Remove trailing slash if present
    railwayServiceUrl = railwayServiceUrl.replace(/\/$/, '');

    // Determine endpoint and format request for Railway service
    let railwayUrl: string;
    let requestBody: any;

    if (numbers && Array.isArray(numbers) && numbers.length > 0) {
      // Bulk SMS - use /api/send-sms-bulk endpoint
      railwayUrl = `${railwayServiceUrl}/api/send-sms-bulk`;
      // Railway service expects: { numbers: ["8801...", "8801..."], message: "...", senderid: "..." }
      requestBody = {
        numbers: numbers.map((n: any) => n.number),
        message: numbers[0].message, // Railway bulk endpoint uses single message for all
        senderid: senderId || undefined
      };
    } else {
      // Single SMS - use /api/send-sms endpoint
      railwayUrl = `${railwayServiceUrl}/api/send-sms`;
      // Railway service expects: { number: "...", message: "...", senderid: "..." }
      requestBody = {
        number: to,
        message: message,
        senderid: senderId || undefined
      };
    }
    
    console.log('Proxying SMS request to Railway:', {
      railwayUrl: railwayUrl.replace(railwayServiceUrl, '***'),
      endpoint: numbers ? 'bulk' : 'single',
      hasTo: !!to,
      hasNumbers: !!numbers,
      numbersCount: numbers?.length || 0,
      requestBody: numbers ? { numbersCount: requestBody.numbers?.length, message: requestBody.message?.substring(0, 50) } : { number: requestBody.number, message: requestBody.message?.substring(0, 50) }
    });

    try {
      const response = await fetch(railwayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CampaignManager-Proxy/1.0',
        },
        body: JSON.stringify(requestBody),
        // Add timeout
        signal: AbortSignal.timeout(60000), // 60 second timeout for Railway
      });

      console.log('Railway response status:', response.status, response.statusText);

      // Handle response
      const contentType = response.headers.get('content-type');
      let result;

      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
        console.log('Railway SMS service response:', JSON.stringify(result));
      } else {
        const textResponse = await response.text();
        console.error('Railway SMS service returned non-JSON response:', textResponse.substring(0, 200));
        result = {
          success: false,
          error: 'Invalid response from Railway SMS service',
          details: textResponse.substring(0, 200)
        };
      }

      // Railway service returns: { success: true/false, code: "202", message: "...", data: "..." }
      // Convert to our expected format
      if (result.success === true || result.success === 'true') {
        // Success - Railway returns code "202" for success
        const codeValue = typeof result.code === 'string' ? result.code : String(result.code || '202');
        return NextResponse.json({
          success: true,
          status: 'sent',
          statusCode: parseInt(codeValue) || 202,
          message: result.message || 'SMS Submitted Successfully',
          to: to || 'bulk',
          senderId: senderId || undefined
        });
      } else {
        // Error - return Railway's error format
        // Handle different error formats from Railway
        let errorMessage = 'Failed to send SMS';
        let statusCode = 0;
        let errorCode: string | number | undefined;
        let errorDetails: any = null;

        // Extract error details from result.data if it exists (BulkSMSBD JSON response)
        // This is the primary source of truth for BulkSMSBD errors
        if (result.data && typeof result.data === 'object') {
          // BulkSMSBD returns: { response_code: 1032, error_message: "...", ... }
          if (result.data.response_code) {
            statusCode = parseInt(String(result.data.response_code)) || 0;
            errorCode = result.data.response_code;
          }
          if (result.data.error_message) {
            // Prioritize error_message from data over generic messages
            errorMessage = result.data.error_message;
          }
          errorDetails = result.data;
        }

        // Handle result.code - might be '[object Object]' if Railway service has a bug
        // Only use if we haven't already extracted from result.data
        if (statusCode === 0 && result.code && result.code !== '[object Object]') {
          errorCode = result.code;
          const codeStr = typeof result.code === 'string' ? result.code : String(result.code);
          const parsedCode = parseInt(codeStr);
          if (!isNaN(parsedCode)) {
            statusCode = parsedCode;
          }
        }

        // Extract error message (only if not already set from result.data)
        if (errorMessage === 'Failed to send SMS') {
          if (typeof result.message === 'string' && result.message !== 'Error code: [object Object]') {
            errorMessage = result.message;
          } else if (typeof result.error === 'string') {
            errorMessage = result.error;
          } else if (result.error && typeof result.error === 'object') {
            errorMessage = JSON.stringify(result.error);
            if (!errorDetails) errorDetails = result.error;
          }
        }

        // If we still don't have error details, use result.data
        if (!errorDetails && result.data) {
          errorDetails = result.data;
        }

        // Special handling for IP whitelist error (1032)
        if (statusCode === 1032 || errorCode === 1032) {
          const ipAddress = errorMessage?.match(/\d+\.\d+\.\d+\.\d+/)?.[0] || 
                           errorDetails?.error_message?.match(/\d+\.\d+\.\d+\.\d+/)?.[0] || 
                           'unknown';
          errorMessage = `IP Not Whitelisted (Error 1032)`;
          return NextResponse.json(
            {
              success: false,
              error: errorMessage,
              statusCode: 1032,
              code: 1032,
              ipAddress: ipAddress,
              details: errorDetails?.error_message || errorMessage,
              help: `Your Railway IP (${ipAddress}) needs to be whitelisted in BulkSMSBD dashboard. Contact BulkSMSBD support to whitelist this IP address.`
            },
            { status: 403 }
          );
        }

        console.error('Railway SMS service error:', {
          success: result.success,
          code: errorCode,
          statusCode: statusCode,
          message: errorMessage,
          details: errorDetails,
          fullResponse: result
        });

        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            statusCode: statusCode,
            code: errorCode,
            details: errorDetails || result.data || result.error
          },
          { status: response.status >= 400 ? response.status : 400 }
        );
      }
    } catch (fetchError: any) {
      console.error('Failed to proxy SMS request to Railway:', fetchError);
      
      // Check for specific error types
      if (fetchError.name === 'AbortError' || fetchError.message?.includes('timeout')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Request timeout: Railway SMS service took too long to respond',
            details: 'The Railway service may be slow or unavailable. Please try again.',
            help: 'Check if your Railway SMS service is running and accessible.'
          },
          { status: 504 }
        );
      }

      if (fetchError.message?.includes('ECONNREFUSED') || fetchError.message?.includes('Failed to fetch')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot connect to Railway SMS service',
            details: fetchError.message || 'Network error',
            help: `Verify SMS_PROXY_URL is correct: ${railwayServiceUrl}. Make sure it includes https:// protocol. Check if the Railway service is deployed and running.`
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to proxy SMS request to Railway',
          details: fetchError.message || 'Unknown error',
          help: 'Check your Railway SMS service configuration and network connectivity.'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('SMS proxy error:', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}
