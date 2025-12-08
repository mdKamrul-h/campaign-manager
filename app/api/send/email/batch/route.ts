import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send batch emails using Resend batch API
 * Accepts an array of email objects
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

    // Use validatedEmails.length since data is not an array
    const emailCount = validatedEmails.length;
    console.log(`Batch email sent successfully. ${emailCount} emails processed`);
    return NextResponse.json({ 
      success: true, 
      count: emailCount,
      data: data || validatedEmails.map((_, i) => ({ id: `batch-${i}` }))
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

