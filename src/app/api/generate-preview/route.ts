import { NextRequest, NextResponse } from 'next/server';
import { generateMaterialPreview, isNanoBananaEnabled } from '@/lib/nano-banana/client';
import type { MaterialAnnotation } from '@/lib/nano-banana/client';

export async function POST(request: NextRequest) {
  if (!isNanoBananaEnabled()) {
    return NextResponse.json(
      { error: 'AI preview feature is not configured. Please set GOOGLE_GENAI_API_KEY.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    const { productImageUrl, productName, annotations } = body as {
      productImageUrl: string;
      productName: string;
      annotations: MaterialAnnotation[];
    };

    if (!productImageUrl || !productName || !annotations || annotations.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: productImageUrl, productName, annotations' },
        { status: 400 }
      );
    }

    const result = await generateMaterialPreview({
      productImageUrl,
      productName,
      annotations,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageBase64: result.imageBase64,
    });
  } catch (error) {
    console.error('Generate preview API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
