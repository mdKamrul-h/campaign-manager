import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Create a professional campaign image: ${prompt}`,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const imageUrl = response.data[0]?.url;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error('Visual generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate visual' },
      { status: 500 }
    );
  }
}
