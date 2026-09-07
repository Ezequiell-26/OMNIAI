/**
 * POST /api/tts — "Leer en voz alta" (texto → audio WAV).
 * Usa el backend Z.ai del sandbox. Límite de la API: 1024 caracteres;
 * se recorta a 1000 y la UI lo indica.
 */

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: unknown };
    const text = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim().slice(0, 1000) : '';
    if (!text) {
      return Response.json({ error: 'Texto vacío.' }, { status: 400 });
    }

    const { default: ZAI } = await import('z-ai-web-dev-sdk');
    const zai = await ZAI.create();
    const response = await zai.audio.tts.create({
      input: text,
      voice: 'tongtong',
      speed: 1.0,
      response_format: 'wav',
      stream: false,
    });

    const arrayBuffer = await response.arrayBuffer();
    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[tts]', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'No se pudo generar el audio.' },
      { status: 500 },
    );
  }
}
