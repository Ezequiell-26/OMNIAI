/**
 * POST /api/title — genera un título corto para una conversación usando el
 * LLM demo del sandbox (z-ai-web-dev-sdk). Fallback: recorte del texto.
 */

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: unknown };
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 400) : '';
    if (!text) {
      return Response.json({ title: 'Nueva conversación' });
    }

    try {
      const { default: ZAI } = await import('z-ai-web-dev-sdk');
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content:
              'Genera un título de 2 a 5 palabras, en el idioma del usuario, que resuma el tema del mensaje. Responde SOLO con el título, sin comillas ni punto final.',
          },
          { role: 'user', content: text },
        ],
        thinking: { type: 'disabled' },
      });
      const title = (completion.choices[0]?.message?.content ?? '')
        .replace(/^["'\s]+|["'.\s]+$/g, '')
        .slice(0, 60);
      if (title) return Response.json({ title });
    } catch {
      // fallback abajo
    }

    const fallback = text.replace(/\s+/g, ' ').slice(0, 48);
    return Response.json({ title: fallback || 'Nueva conversación' });
  } catch {
    return Response.json({ title: 'Nueva conversación' });
  }
}
