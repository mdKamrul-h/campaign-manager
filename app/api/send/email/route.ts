import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text } = await request.json();

    // Validate required fields
    if (!to || !to.trim()) {
      return NextResponse.json(
        { error: 'Recipient email address is required' },
        { status: 400 }
      );
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json(
        { error: 'Email subject is required' },
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
    
    console.log(`Attempting to send email to: ${to}, from: ${fromEmail}, subject: ${subject}`);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to.trim()],
      subject: subject.trim(),
      html: html || text || '',
      text: text || '',
      reply_to: replyTo,
      headers: {
        'X-Priority': '1', // High priority (1 = High, 3 = Normal, 5 = Low)
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        // Avoid 'Precedence: bulk' as it signals marketing emails
        // These headers help avoid promotions tab
        'X-Mailer': 'Campaign Manager',
      },
    });

    if (error) {
      console.error('Resend API error:', error);
      throw error;
    }

    if (!data || !data.id) {
      console.error('Resend API returned no data or ID');
      return NextResponse.json(
        { error: 'Email service returned invalid response' },
        { status: 500 }
      );
    }

    console.log(`Email sent successfully. Resend ID: ${data.id}`);
    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to send email',
        details: error.name || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
