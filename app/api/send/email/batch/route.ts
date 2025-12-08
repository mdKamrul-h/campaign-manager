import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

/**
 * Send batch emails using Resend batch API
 * Accepts an array of email objects
 */
export async function POST(request: NextRequest) {
  try {
    // Check Content-Type before parsing
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { emails } = requestBody;

    // Validate required fields
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Emails array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate API key exists and has correct format
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json(
        { 
          success: false,
          error: 'Email service not configured. RESEND_API_KEY is missing in environment variables.',
          help: 'Please set RESEND_API_KEY in your Vercel project settings (Settings → Environment Variables)'
        },
        { status: 500 }
      );
    }

    // Validate API key format (Resend keys start with 're_')
    if (!apiKey.startsWith('re_')) {
      console.error('RESEND_API_KEY has invalid format');
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid RESEND_API_KEY format. Resend API keys should start with "re_"',
          help: 'Please check your RESEND_API_KEY in Vercel environment variables and ensure it\'s correct'
        },
        { status: 500 }
      );
    }

    // Initialize Resend client with validated API key
    const resend = new Resend(apiKey);

    const fromEmail = process.env.FROM_EMAIL || 'Mallick NDC99 Ballot 7 <vote@mallicknazrul.com>';
    const replyTo = process.env.REPLY_TO_EMAIL || 'vote@mallicknazrul.com';

    // Validate each email object
    const validatedEmails = emails.map((email: any, index: number) => {
      if (!email.to || !email.to.trim()) {
        throw new Error(`Email at index ${index} is missing recipient address`);
      }
      if (!email.subject || !email.subject.trim()) {
        throw new Error(`Email at index ${index} is missing subject`);
      }
      
      // Preserve reply_to and headers from email object, or use defaults
      const emailReplyTo = email.reply_to || replyTo;
      const emailHeaders = email.headers || {
        'X-Priority': '1', // High priority (1 = High, 3 = Normal, 5 = Low)
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        // Avoid 'Precedence: bulk' as it signals marketing emails
        // These headers help avoid promotions tab
        'X-Mailer': 'Campaign Manager',
      };
      
      return {
        from: email.from || fromEmail,
        to: Array.isArray(email.to) ? email.to : [email.to.trim()],
        subject: email.subject.trim(),
        html: email.html || email.text || '',
        text: email.text || '',
        reply_to: emailReplyTo,
        headers: emailHeaders,
      };
    });

    console.log(`Attempting to send batch of ${validatedEmails.length} emails`);

    try {
      const { data, error } = await resend.batch.send(validatedEmails);

      if (error) {
        console.error('Resend batch API error:', error);
        
        // Check if error indicates authentication failure
        const errorMessage = error.message || JSON.stringify(error);
        if (errorMessage.includes('Authentication Required') || 
            errorMessage.includes('Unauthorized') ||
            errorMessage.includes('401') ||
            (typeof error === 'object' && 'statusCode' in error && error.statusCode === 401)) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Resend API authentication failed. Your RESEND_API_KEY is invalid or expired.',
              help: 'Please verify your RESEND_API_KEY in Vercel environment variables. Get a new key from https://resend.com/api-keys'
            },
            { status: 401 }
          );
        }
        
        return NextResponse.json(
          { 
            success: false,
            error: error.message || 'Resend API error',
            details: JSON.stringify(error)
          },
          { status: 500 }
        );
      }

      if (!data) {
        console.error('Resend API returned no data');
        return NextResponse.json(
          { 
            success: false,
            error: 'Email service returned invalid response (no data)',
            help: 'This might indicate an authentication issue. Please verify your RESEND_API_KEY is correct.'
          },
          { status: 500 }
        );
      }

      // Use validatedEmails.length since data is not an array
      const emailCount = validatedEmails.length;
      console.log(`Batch email sent successfully. ${emailCount} emails processed`);
      return NextResponse.json({ 
        success: true, 
        count: emailCount,
        data: data || validatedEmails.map((_, i) => ({ id: `batch-${i}` }))
      });
    } catch (resendError: any) {
      console.error('Resend batch send exception:', resendError);
      
      // Check if error response contains HTML (authentication page)
      const errorString = String(resendError.message || resendError);
      if (errorString.includes('Authentication Required') || 
          errorString.includes('<!doctype html>') ||
          errorString.includes('<title>Authentication Required</title>')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Resend API authentication failed. Your RESEND_API_KEY is invalid, expired, or not set correctly.',
            help: 'Steps to fix:\n1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables\n2. Check if RESEND_API_KEY is set\n3. Verify the key starts with "re_"\n4. Get a new key from https://resend.com/api-keys if needed\n5. Redeploy your application after updating the key'
          },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: resendError.message || 'Failed to send batch emails via Resend',
          details: resendError.name || 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Batch email send error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to send batch emails',
        details: error.name || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

