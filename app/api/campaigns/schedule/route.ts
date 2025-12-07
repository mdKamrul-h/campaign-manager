import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * AI-based campaign scheduling
 * Analyzes campaign content and suggests optimal send time
 */
export async function POST(request: NextRequest) {
  try {
    const { campaignId, campaignContent, channel } = await request.json();

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // AI-based scheduling logic
    // This uses OpenAI to analyze content and suggest optimal timing
    let suggestedTime: Date | null = null;
    let reasoning = '';

    try {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (openaiApiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are an expert in marketing campaign timing. Analyze campaign content and suggest the optimal send time based on:\n1. Content type and urgency\n2. Channel (email, SMS, social media)\n3. Best practices for engagement\n4. Time zone considerations\n\nRespond with JSON: {"suggestedTime": "YYYY-MM-DDTHH:mm:ss", "reasoning": "explanation"}'
              },
              {
                role: 'user',
                content: `Campaign Channel: ${channel}\nCampaign Content: ${campaignContent?.substring(0, 500) || 'No content'}\n\nSuggest the optimal send time. Current time: ${new Date().toISOString()}`
              }
            ],
            temperature: 0.7,
          }),
        });

        const aiData = await response.json();
        const aiResponse = aiData.choices?.[0]?.message?.content;
        
        if (aiResponse) {
          try {
            const parsed = JSON.parse(aiResponse);
            if (parsed.suggestedTime) {
              suggestedTime = new Date(parsed.suggestedTime);
              reasoning = parsed.reasoning || 'AI-suggested optimal send time';
            }
          } catch (e) {
            // If JSON parsing fails, use default logic
            console.warn('Failed to parse AI response:', e);
          }
        }
      }
    } catch (aiError) {
      console.error('AI scheduling error:', aiError);
      // Fall through to default logic
    }

    // Default scheduling logic if AI fails
    if (!suggestedTime) {
      const now = new Date();
      // Default: Schedule for next business day at 10 AM
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      // If tomorrow is weekend, move to Monday
      if (tomorrow.getDay() === 0) {
        tomorrow.setDate(tomorrow.getDate() + 1);
      } else if (tomorrow.getDay() === 6) {
        tomorrow.setDate(tomorrow.getDate() + 2);
      }
      
      suggestedTime = tomorrow;
      reasoning = 'Scheduled for next business day at 10 AM (default optimal time)';
    }

    // Update campaign with scheduled time
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update({
        scheduled_at: suggestedTime.toISOString(),
        status: 'scheduled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      campaign: data,
      scheduledAt: suggestedTime.toISOString(),
      reasoning,
    });
  } catch (error: any) {
    console.error('Schedule campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to schedule campaign' },
      { status: 500 }
    );
  }
}





