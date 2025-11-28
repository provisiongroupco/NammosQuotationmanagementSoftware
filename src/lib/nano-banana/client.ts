import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey) {
  console.warn('GOOGLE_GENAI_API_KEY is not set. Nano Banana features will be disabled.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

async function extractColorFromSwatch(
  imageBase64: string,
  mimeType: string,
  materialName: string
): Promise<string> {
  if (!ai) return materialName;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Look at this material swatch image. What is the EXACT color?
Respond with ONLY the color name and hex code in this format: "COLOR_NAME (#HEXCODE)"
Examples: "White (#FFFFFF)", "Cream (#FFFDD0)", "Dark Brown (#3E2723)", "Navy Blue (#000080)"
Be precise - if it's off-white, say "Off-White" or "Cream", not just "White".`,
            },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        },
      ],
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) {
      return text;
    }
  } catch (e) {
    console.warn('Failed to extract color from swatch:', e);
  }

  return materialName;
}

export interface MaterialAnnotation {
  partName: string;
  materialName: string;
  materialType: string;
  materialCode: string;
  swatchImageUrl?: string;
}

export interface GeneratePreviewParams {
  productImageUrl: string;
  productName: string;
  annotations: MaterialAnnotation[];
}

export interface GeneratePreviewResult {
  success: boolean;
  imageBase64?: string;
  error?: string;
}

interface PartColorInfo {
  partName: string;
  materialName: string;
  materialType: string;
  extractedColor: string;
}

function buildPrompt(productName: string, partsWithColors: PartColorInfo[]): string {
  const partNames = partsWithColors.map(a => a.partName.toLowerCase());
  const partsList = partNames.join(', ');

  const materialDescriptions = partsWithColors
    .map((part) => {
      return `- ${part.partName.toUpperCase()}: Change to ${part.extractedColor} ${part.materialType}`;
    })
    .join('\n');

  const colorList = partsWithColors
    .map((part) => `  * ${part.partName}: ${part.extractedColor}`)
    .join('\n');

  return `Edit this furniture image ("${productName}"). Change ONLY the specified parts to the EXACT colors listed.

MATERIAL CHANGES:
${materialDescriptions}

EXACT COLORS TO USE:
${colorList}

RULES:
1. Change ONLY the ${partsList} - leave everything else UNCHANGED
2. Use the EXACT colors specified above (including the hex codes if provided)
3. Keep the furniture shape, angle, lighting, and background identical
4. Make the material look realistic with proper texture and reflections

Generate the edited image.`;
}

export async function generateMaterialPreview(
  params: GeneratePreviewParams
): Promise<GeneratePreviewResult> {
  if (!ai) {
    return {
      success: false,
      error: 'Google GenAI API key not configured. Please set GOOGLE_GENAI_API_KEY environment variable.',
    };
  }

  try {
    const imageResponse = await fetch(params.productImageUrl);
    if (!imageResponse.ok) {
      return {
        success: false,
        error: 'Failed to fetch product image',
      };
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const mimeType = contentType.includes('jpeg') || contentType.includes('jpg')
      ? 'image/jpeg'
      : 'image/png';

    const partsWithColors: PartColorInfo[] = [];

    for (const ann of params.annotations) {
      let extractedColor = ann.materialName;

      if (ann.swatchImageUrl) {
        try {
          const swatchResponse = await fetch(ann.swatchImageUrl);
          if (swatchResponse.ok) {
            const swatchBuffer = await swatchResponse.arrayBuffer();
            const swatchBase64 = Buffer.from(swatchBuffer).toString('base64');
            const swatchContentType = swatchResponse.headers.get('content-type') || 'image/png';
            const swatchMimeType = swatchContentType.includes('jpeg') || swatchContentType.includes('jpg')
              ? 'image/jpeg'
              : 'image/png';

            extractedColor = await extractColorFromSwatch(swatchBase64, swatchMimeType, ann.materialName);
            console.log(`Extracted color for ${ann.partName}: ${extractedColor}`);
          }
        } catch (e) {
          console.warn(`Failed to fetch/analyze swatch image for ${ann.partName}:`, e);
        }
      }

      partsWithColors.push({
        partName: ann.partName,
        materialName: ann.materialName,
        materialType: ann.materialType,
        extractedColor,
      });
    }

    const prompt = buildPrompt(params.productName, partsWithColors);
    console.log('Generated prompt:', prompt);

    const imageParts: { inlineData: { mimeType: string; data: string } }[] = [
      { inlineData: { mimeType, data: base64Image } },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            ...imageParts,
          ],
        },
      ],
      config: {
        responseModalities: ['image', 'text'],
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      return {
        success: false,
        error: 'No response from AI model',
      };
    }

    const parts = response.candidates[0].content?.parts || [];

    for (const part of parts) {
      if (part.inlineData?.data) {
        return {
          success: true,
          imageBase64: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
        };
      }
    }

    const textResponse = parts.find((p) => p.text)?.text;
    return {
      success: false,
      error: textResponse || 'No image generated',
    };
  } catch (error) {
    console.error('Nano Banana API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export function isNanoBananaEnabled(): boolean {
  return !!apiKey;
}
