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
        
        return NextResponse.json({
          success: true,
          message: 'Email configuration is valid!',
          diagnostics: {
            ...diagnostics,
            apiKeyTest: 'PASSED - API key is valid and working',
            canAccessResend: true,
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
