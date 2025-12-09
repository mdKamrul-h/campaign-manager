import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Test endpoint to send a single email and see detailed results
 * Useful for debugging custom domain email issues
 */
export async function POST(request: NextRequest) {
  try {
    const { to, subject, content } = await request.json();

    if (!to || !to.trim()) {
      return NextResponse.json(
        { error: 'Email address (to) is required' },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL || 'Mallick NDC99 Ballot 7 <vote@mallicknazrul.com>';

    // Extract domain for logging
    const domain = to.split('@')[1];
    const isCustomDomain = !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'].some(d => domain?.toLowerCase().includes(d));

    console.log(`Testing email send to: ${to}`);
    console.log(`Domain: ${domain}, Is custom domain: ${isCustomDomain}`);

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [to.trim()],
        subject: subject || 'Test Email',
        html: content || '<p>This is a test email.</p>',
        text: content || 'This is a test email.',
      });

      if (error) {
        console.error(`Resend error for ${to}:`, error);
        return NextResponse.json({
          success: false,
          to,
          domain,
          isCustomDomain,
          error: error.message || JSON.stringify(error),
          errorDetails: error,
          note: isCustomDomain 
            ? 'This is a custom domain. If sending fails, it may be due to: 1) Invalid email format, 2) Recipient server rejection, 3) Domain reputation issues'
            : 'Standard email domain'
        }, { status: 500 });
      }

      if (!data || !data.id) {
        return NextResponse.json({
          success: false,
          to,
          domain,
          isCustomDomain,
          error: 'No response from Resend API',
          note: 'Resend API returned no data'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        to,
        domain,
        isCustomDomain,
        resendId: data.id,
        message: `Email sent successfully to ${to} (${domain})`
      });
    } catch (sendError: any) {
      console.error(`Exception sending to ${to}:`, sendError);
      return NextResponse.json({
        success: false,
        to,
        domain,
        isCustomDomain,
        error: sendError.message || 'Unknown error',
        errorDetails: JSON.stringify(sendError),
        note: isCustomDomain 
          ? 'Custom domain email failed. Check: 1) Email format is valid, 2) Resend dashboard logs, 3) Recipient server settings'
          : 'Standard domain email failed'
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to test email' },
      { status: 500 }
    );
  }
}
