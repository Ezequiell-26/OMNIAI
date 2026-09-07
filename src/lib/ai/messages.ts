/**
 * Utilidades para extraer texto plano de mensajes UIMessage (AI SDK v7).
 */

import type { TextUIPart, UIMessage } from 'ai';

/** Concatena todas las partes de texto de un mensaje. */
export function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is TextUIPart => part.type === 'text' && part.text.length > 0)
    .map((part) => part.text)
    .join('');
}

/** Texto de la primera petición del usuario (para titular la conversación). */
export function deriveTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'Nueva conversación';
  const text = messageText(firstUser).replace(/\s+/g, ' ').trim();
  if (!text) return 'Nueva conversación';
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

/** ¿El mensaje tiene contenido visible? */
export function hasContent(message: UIMessage): boolean {
  return messageText(message).length > 0 || message.parts.length > 0;
}
