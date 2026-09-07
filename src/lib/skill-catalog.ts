// Catálogo client-safe de skills OMNIAI (solo metadatos, sin handlers).
// Filosofía "everything-is-a-plugin" inspirada en deepseek-ai/deepseek-harness (MIT).
// Los handlers reales viven en src/lib/skills.ts (backend, z-ai-web-dev-sdk).

export interface SkillParamMeta {
  name: string
  type: 'string' | 'number'
  description: string
  required: boolean
}

export interface SkillMeta {
  id: string
  name: string
  emoji: string
  description: string
  /** Repo MIT/Apache que inspiró la skill (atribución). */
  inspiredBy: string
  params: SkillParamMeta[]
}

export const SKILL_CATALOG: SkillMeta[] = [
  {
    id: 'web_search',
    name: 'Búsqueda web',
    emoji: '🔍',
    description:
      'Busca información actualizada en internet y devuelve los resultados más relevantes (título, URL y extracto).',
    inspiredBy: 'deepseek-harness · everything-is-a-plugin (MIT)',
    params: [
      { name: 'query', type: 'string', description: 'Texto a buscar en la web', required: true },
      {
        name: 'recency_days',
        type: 'number',
        description: 'Opcional: limitar a resultados de los últimos N días',
        required: false,
      },
    ],
  },
  {
    id: 'page_reader',
    name: 'Lector de páginas',
    emoji: '📄',
    description:
      'Lee el contenido de una página web específica (artículo, documentación, blog) y devuelve su texto principal.',
    inspiredBy: 'modelcontextprotocol/servers · fetch (MIT/Apache-2.0)',
    params: [
      { name: 'url', type: 'string', description: 'URL completa de la página a leer', required: true },
    ],
  },
  {
    id: 'calculator',
    name: 'Calculadora',
    emoji: '🧮',
    description:
      'Evalúa expresiones matemáticas exactas (+ - * / paréntesis potencias ** y porcentajes). Úsala para cualquier cálculo numérico.',
    inspiredBy: 'modelcontextprotocol/servers · everything server (MIT/Apache-2.0)',
    params: [
      {
        name: 'expression',
        type: 'string',
        description: 'Expresión matemática, ej: (1250 * 12) / 3',
        required: true,
      },
    ],
  },
  {
    id: 'clock',
    name: 'Reloj y calendario',
    emoji: '🕒',
    description:
      'Devuelve la fecha y hora actual del servidor (con día de la semana) para no inventar fechas.',
    inspiredBy: 'modelcontextprotocol/servers · time (MIT/Apache-2.0)',
    params: [],
  },
]

export const DEFAULT_AGENT_SKILLS = ['web_search', 'calculator', 'clock']
