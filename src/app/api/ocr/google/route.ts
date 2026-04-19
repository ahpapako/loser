import { parseTicketFields } from '@/lib/ocr/ticket-parser';

type GoogleVisionResponse = {
  responses?: Array<{
    fullTextAnnotation?: {
      text?: string;
      pages?: Array<{
        confidence?: number;
      }>;
    };
    textAnnotations?: Array<{
      description?: string;
    }>;
    error?: {
      message?: string;
    };
  }>;
};

export const runtime = 'nodejs';

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: 'Missing GOOGLE_VISION_API_KEY in .env.local' },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const image = formData.get('image');

  if (!(image instanceof File)) {
    return Response.json({ error: 'Missing image file' }, { status: 400 });
  }

  if (!image.type.startsWith('image/')) {
    return Response.json({ error: 'File must be an image' }, { status: 400 });
  }

  if (image.size > MAX_IMAGE_SIZE_BYTES) {
    return Response.json(
      { error: 'Image is too large. Maximum size is 8 MB.' },
      { status: 400 }
    );
  }

  const imageBuffer = Buffer.from(await image.arrayBuffer());
  const content = imageBuffer.toString('base64');
  const endpoint = process.env.GOOGLE_VISION_API_ENDPOINT || 'https://vision.googleapis.com';

  const googleResponse = await fetch(
    `${endpoint}/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: { content },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      }),
    }
  );

  const data = (await googleResponse.json()) as GoogleVisionResponse;

  if (!googleResponse.ok) {
    return Response.json(
      { error: 'Google Vision request failed', details: data },
      { status: googleResponse.status }
    );
  }

  const result = data.responses?.[0];

  if (result?.error?.message) {
    return Response.json({ error: result.error.message }, { status: 502 });
  }

  const rawText =
    result?.fullTextAnnotation?.text || result?.textAnnotations?.[0]?.description || '';

  const confidence = result?.fullTextAnnotation?.pages?.[0]?.confidence ?? null;
  const parsed = parseTicketFields(rawText);

  return Response.json({
    rawText,
    confidence,
    parsed,
  });
}
