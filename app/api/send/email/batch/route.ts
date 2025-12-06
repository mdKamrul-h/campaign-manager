import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service not configured. Please set RESEND_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    const fromEmail = process.env.FROM_EMAIL || 'Mallick NDC99 Ballot 7 <vote@mallicknazrul.com>';

    // Validate each email object
    const validatedEmails = emails.map((email: any, index: number) => {
      if (!email.to || !email.to.trim()) {
        throw new Error(`Email at index ${index} is missing recipient address`);
      }
      if (!email.subject || !email.subject.trim()) {
        throw new Error(`Email at index ${index} is missing subject`);
      }
      return {
        from: email.from || fromEmail,
        to: Array.isArray(email.to) ? email.to : [email.to.trim()],
        subject: email.subject.trim(),
        html: email.html || email.text || '',
        text: email.text || '',
      };
    });

    console.log(`Attempting to send batch of ${validatedEmails.length} emails`);

    try {
      const { data, error } = await resend.batch.send(validatedEmails);

      if (error) {
        console.error('Resend batch API error:', error);
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
            error: 'Email service returned invalid response (no data)'
          },
          { status: 500 }
        );
      }

      console.log(`Batch email sent successfully. ${data.length || validatedEmails.length} emails processed`);
      return NextResponse.json({ 
        success: true, 
        count: data.length || validatedEmails.length,
        data: data || validatedEmails.map((_, i) => ({ id: `batch-${i}` }))
      });
    } catch (resendError: any) {
      console.error('Resend batch send exception:', resendError);
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

