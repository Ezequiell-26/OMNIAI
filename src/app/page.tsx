import { StudioShell } from "@/components/studio/studio-shell";

/**
 * OmniAI Studio — página principal.
 * Toda la lógica vive en el cliente (Local-First): el servidor solo sirve
 * el shell inicial y el endpoint de streaming /api/chat.
 */
export default function Page() {
  return <StudioShell />;
}
