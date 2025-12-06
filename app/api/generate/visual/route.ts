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

    // Extract data first to help TypeScript understand the type
    const imageData = response.data;
    
    if (!imageData || imageData.length === 0 || !imageData[0]?.url) {
      throw new Error('No image generated');
    }

    const imageUrl = imageData[0].url;

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error('Visual generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate visual' },
      { status: 500 }
    );
  }
}
