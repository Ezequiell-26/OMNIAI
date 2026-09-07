/**
 * Registro de Skills integradas de OmniAI Studio (compartido cliente/servidor).
 *
 * Una "skill" es una capacidad que el modelo puede invocar como herramienta:
 * - `web_search`   → búsqueda web real (backend Z.ai).
 * - `page_reader`  → lectura/extracto de una URL.
 * - `image_gen`    → generación de imágenes (devuelve Markdown embebido).
 * - `clock`        → fecha y hora actual (con zona del navegador).
 * - `calculator`   → evaluador aritmético seguro.
 *
 * Además el usuario puede crear **skills personalizadas** que solo inyectan
 * instrucciones en el prompt del sistema (ver use-app-store).
 */

export type BuiltinSkillId = 'web_search' | 'page_reader' | 'image_gen' | 'clock' | 'calculator';

export interface BuiltinSkillDef {
  id: BuiltinSkillId;
  name: string;
  description: string;
  /** Nombre del icono Lucide usado por la UI (mapa en skills-panel). */
  icon: 'Search' | 'Globe' | 'ImageIcon' | 'Clock' | 'Calculator';
  /** JSON Schema de los parámetros (protocolo demo + herramientas dinámicas). */
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export const BUILTIN_SKILLS: BuiltinSkillDef[] = [
  {
    id: 'web_search',
    name: 'Búsqueda web',
    description: 'Busca información actualizada en internet y cita las fuentes.',
    icon: 'Search',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Consulta de búsqueda' },
        num: { type: 'number', description: 'Número de resultados (por defecto 6)' },
      },
      required: ['query'],
    },
  },
  {
    id: 'page_reader',
    name: 'Lector web',
    description: 'Lee una URL y extrae su contenido principal en texto.',
    icon: 'Globe',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL completa de la página (https://…)' },
      },
      required: ['url'],
    },
  },
  {
    id: 'image_gen',
    name: 'Generador de imágenes',
    description: 'Crea una imagen a partir de una descripción y la muestra en el chat.',
    icon: 'ImageIcon',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Descripción detallada de la imagen' },
        size: {
          type: 'string',
          description: 'Tamaño: 1024x1024, 1344x768 (horizontal) o 768x1344 (vertical)',
        },
      },
      required: ['prompt'],
    },
  },
  {
    id: 'clock',
    name: 'Reloj',
    description: 'Obtiene la fecha y hora actual con la zona horaria indicada.',
    icon: 'Clock',
    parameters: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'Zona horaria IANA, p. ej. America/Buenos_Aires' },
      },
      required: [],
    },
  },
  {
    id: 'calculator',
    name: 'Calculadora',
    description: 'Evalúa expresiones aritméticas de forma segura (solo números y operadores).',
    icon: 'Calculator',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Expresión matemática, p. ej. (1250*1.21)/3' },
      },
      required: ['expression'],
    },
  },
];

export const BUILTIN_SKILL_IDS = BUILTIN_SKILLS.map((s) => s.id);

/** Prompt-protocolo para el proveedor demo (JSON tool-call). */
export function demoToolProtocolSection(manifest: string): string {
  return [
    '',
    '## Herramientas disponibles',
    manifest,
    '',
    '## Protocolo de herramientas (OBLIGATORIO)',
    'Si para responder necesitas una herramienta, responde EXCLUSIVAMENTE con un objeto JSON:',
    '{"tool":"<nombre>","args":{ ...argumentos CONCRETOS... }}',
    'Ejemplo correcto para buscar en la web:',
    '{"tool":"web_search","args":{"query":"precio actual del bitcoin en dólares"}}',
    'REGLAS: los argumentos deben contener los valores reales extraídos de la conversación',
    '(nunca un objeto vacío, nunca placeholders como "<query>").',
    'No añadas ningún otro texto antes ni después del JSON.',
    'Tras recibir el resultado de la herramienta, responde al usuario normalmente en Markdown.',
    'Si NO necesitas ninguna herramienta, responde directamente en Markdown (nunca devuelvas JSON).',
  ].join('\n');
}

/** Renderiza el manifiesto de herramientas (JSON) para los prompts. */
export function renderToolManifest(
  tools: Array<{ name: string; description: string; parameters?: unknown }>,
): string {
  return JSON.stringify(
    tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters ?? { type: 'object', properties: {}, required: [] },
    })),
    null,
    2,
  );
}
