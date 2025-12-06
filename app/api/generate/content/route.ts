import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt, channel, useDocuments } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    let contextText = '';

    // Fetch documents for context if requested
    if (useDocuments) {
      const { data: documents } = await supabaseAdmin
        .from('documents')
        .select('name, content_text')
        .limit(5);

      if (documents && documents.length > 0) {
        contextText = '\n\nContext from uploaded documents:\n';
        documents.forEach((doc) => {
          if (doc.content_text) {
            contextText += `\n${doc.name}:\n${doc.content_text.substring(0, 1000)}\n`;
          }
        });
      }
    }

    const channelGuidelines: Record<string, string> = {
      facebook: 'engaging, friendly, use emojis moderately, 1-2 paragraphs',
      instagram: 'visual-focused, concise, hashtag-friendly, inspiring',
      linkedin: 'professional, informative, thought-leadership tone',
      whatsapp: 'personal, conversational, brief and to the point',
      sms: 'very brief, clear call-to-action, under 160 characters',
      email: 'professional, detailed, well-structured. Format your response as: Subject: [subject line]\n\n[email body content]. The subject line should be on the first line starting with "Subject: " followed by the email body on the next lines.',
    };

    const systemPrompt = channel === 'email' 
      ? `You are a professional campaign content writer. Generate email content that is ${channelGuidelines[channel]}. ${contextText}\n\nIMPORTANT: Format your response EXACTLY as:\nSubject: [Your subject line here]\n\n[Your email body content here]\n\nThe subject line must be on the first line starting with "Subject: " followed by a newline, then the email body.`
      : `You are a professional campaign content writer. Generate ${channel} content that is ${channelGuidelines[channel] || 'engaging and effective'}. ${contextText}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const rawContent = completion.choices[0]?.message?.content || '';

    // For email channel, extract subject and body separately
    if (channel === 'email' && rawContent.includes('Subject:')) {
      const subjectMatch = rawContent.match(/^Subject:\s*(.+?)(?:\n\n|\n|$)/i);
      const subject = subjectMatch ? subjectMatch[1].trim() : '';
      // Remove the subject line from content
      const content = rawContent.replace(/^Subject:\s*.+?(?:\n\n|\n|$)/i, '').trim();
      
      return NextResponse.json({ 
        content,
        subject: subject || undefined, // Only include subject if found
      });
    }

    return NextResponse.json({ content: rawContent });
  } catch (error: any) {
    console.error('Content generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    );
  }
}
