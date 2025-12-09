import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint to check email configuration
 * This helps verify if RESEND_API_KEY is properly set
 */
export async function GET() {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    
    const diagnostics = {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 3) : 'N/A',
      apiKeyFormatValid: apiKey ? apiKey.startsWith('re_') : false,
      fromEmail: process.env.FROM_EMAIL || 'Not set (using default)',
      replyToEmail: process.env.REPLY_TO_EMAIL || 'Not set (using default)',
    };

    // Try to validate the API key by making a test request
    if (apiKey && apiKey.startsWith('re_')) {
      try {
        const resend = new Resend(apiKey);
        // Make a minimal API call to verify the key works
        // Note: This is a lightweight check - we're not sending an email
        const testResult = await resend.domains.list();
        
        // Also test if batch API is accessible (without actually sending)
        let batchApiAccessible = false;
        try {
          // Try to call batch.send with empty array to test API access
          // This should fail with a validation error, not an auth error
          const batchTest = await resend.batch.send([]);
          batchApiAccessible = true;
        } catch (batchTestError: any) {
          const batchErrorMsg = String(batchTestError.message || batchTestError);
          // If it's a validation error (empty array), that's fine - API is accessible
          // If it's an auth error, that's the problem
          if (batchErrorMsg.includes('Authentication Required') || 
              batchErrorMsg.includes('Unauthorized') ||
              batchErrorMsg.includes('401') ||
              batchErrorMsg.includes('403')) {
            batchApiAccessible = false;
          } else {
            // Validation error means API is accessible
            batchApiAccessible = true;
          }
        }
        
        return NextResponse.json({
          success: true,
          message: 'Email configuration is valid!',
          diagnostics: {
            ...diagnostics,
            apiKeyTest: 'PASSED - API key is valid and working',
            canAccessResend: true,
            batchApiAccessible: batchApiAccessible,
            note: batchApiAccessible 
              ? 'Both domains and batch APIs are accessible'
              : 'Domains API works but batch API may have permission issues'
          },
        });
      } catch (testError: any) {
        return NextResponse.json({
          success: false,
          message: 'API key format is correct but authentication failed',
          diagnostics: {
            ...diagnostics,
            apiKeyTest: 'FAILED',
            error: testError.message || 'Unknown error',
            canAccessResend: false,
          },
          help: 'Your RESEND_API_KEY might be expired or invalid. Get a new key from https://resend.com/api-keys',
        }, { status: 401 });
      }
    }

    return NextResponse.json({
      success: false,
      message: 'Email configuration is incomplete',
      diagnostics,
      help: apiKey 
        ? 'API key format is invalid. Resend keys should start with "re_"'
        : 'RESEND_API_KEY is not set in environment variables. Add it in Vercel Dashboard → Settings → Environment Variables',
    }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      diagnostics: {
        hasApiKey: !!process.env.RESEND_API_KEY,
      },
    }, { status: 500 });
  }
}

