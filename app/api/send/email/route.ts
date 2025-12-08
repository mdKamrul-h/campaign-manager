import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

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

    // Validate API key exists and has correct format
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json(
        { 
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
      
      // Check if error indicates authentication failure
      const errorMessage = error.message || JSON.stringify(error);
      if (errorMessage.includes('Authentication Required') || 
          errorMessage.includes('Unauthorized') ||
          errorMessage.includes('401') ||
          (typeof error === 'object' && 'statusCode' in error && error.statusCode === 401)) {
        return NextResponse.json(
          { 
            error: 'Resend API authentication failed. Your RESEND_API_KEY is invalid or expired.',
            help: 'Please verify your RESEND_API_KEY in Vercel environment variables. Get a new key from https://resend.com/api-keys'
          },
          { status: 401 }
        );
      }
      
      throw error;
    }

    if (!data || !data.id) {
      console.error('Resend API returned no data or ID');
      return NextResponse.json(
        { 
          error: 'Email service returned invalid response',
          help: 'This might indicate an authentication issue. Please verify your RESEND_API_KEY is correct.'
        },
        { status: 500 }
      );
    }

    console.log(`Email sent successfully. Resend ID: ${data.id}`);
    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('Email send error:', error);
    
    // Check if error response contains HTML (authentication page)
    const errorString = String(error.message || error);
    if (errorString.includes('Authentication Required') || 
        errorString.includes('<!doctype html>') ||
        errorString.includes('<title>Authentication Required</title>')) {
      return NextResponse.json(
        { 
          error: 'Resend API authentication failed. Your RESEND_API_KEY is invalid, expired, or not set correctly.',
          help: 'Steps to fix:\n1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables\n2. Check if RESEND_API_KEY is set\n3. Verify the key starts with "re_"\n4. Get a new key from https://resend.com/api-keys if needed\n5. Redeploy your application after updating the key'
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to send email',
        details: error.name || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
