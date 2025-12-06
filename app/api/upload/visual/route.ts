import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Upload visual/image to Supabase Storage and return public URL
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const imageUrl = formData.get('imageUrl') as string | null; // For generated images from URLs

    if (!file && !imageUrl) {
      return NextResponse.json(
        { error: 'File or imageUrl is required' },
        { status: 400 }
      );
    }

    let imageBuffer: Buffer;
    let fileExt: string;
    let contentType: string;

    if (file) {
      // Handle file upload
      const bytes = await file.arrayBuffer();
      imageBuffer = Buffer.from(bytes);
      fileExt = file.name.split('.').pop() || 'png';
      contentType = file.type || `image/${fileExt}`;
    } else if (imageUrl) {
      // Handle URL (for generated images)
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch image from URL');
        }
        const arrayBuffer = await response.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        
        // Determine file extension from content type or URL
        const contentTypeHeader = response.headers.get('content-type') || 'image/png';
        contentType = contentTypeHeader;
        fileExt = contentTypeHeader.split('/')[1]?.split(';')[0] || 'png';
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to download image: ${error.message}` },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileName = `campaign-visuals/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('campaign-files')
      .upload(fileName, imageBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('campaign-files')
      .getPublicUrl(fileName);

    return NextResponse.json({ 
      url: publicUrl,
      success: true 
    });
  } catch (error: any) {
    console.error('Upload visual error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload visual' },
      { status: 500 }
    );
  }
}
