// ─────────────────────────────────────────────────────────────
// OMNIAI Skills Registry — Fase 3 adelantada
// Filosofía "everything-is-a-plugin" de deepseek-ai/deepseek-harness
// (MIT): cada skill es un plugin autónomo con nombre, descripción,
// schema de parámetros y handler. Los agentes las invocan vía
// protocolo de tool-calls (estilo function-calling de
// openai/openai-agents-python, MIT).
// SOLO backend: los handlers usan z-ai-web-dev-sdk.
// Los metadatos (client-safe) viven en skill-catalog.ts.
// ─────────────────────────────────────────────────────────────
import ZAI from 'z-ai-web-dev-sdk'
import { SKILL_CATALOG, type SkillMeta } from '@/lib/skill-catalog'

export interface SkillDef extends SkillMeta {
  run: (args: Record<string, unknown>) => Promise<string>
}

// ─── helpers ──────────────────────────────────────────────────

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── skills built-in (handlers) ───────────────────────────────

const webSearch: SkillDef = {
  ...SKILL_CATALOG.find((s) => s.id === 'web_search')!,
  async run(args) {
    const query = str(args.query).trim()
    if (!query) throw new Error('Falta el parámetro "query"')
    const num = 6
    const recencyDays = Number(args.recency_days)
    const zai = await ZAI.create()
    const results = (await zai.functions.invoke('web_search', {
      query: query.slice(0, 400),
      num,
      ...(Number.isFinite(recencyDays) && recencyDays > 0
        ? { recency_days: Math.floor(recencyDays) }
        : {}),
    })) as Array<{
      name?: string
      url?: string
      snippet?: string
      host_name?: string
      date?: string
    }>
    if (!Array.isArray(results) || results.length === 0) {
      return 'Sin resultados en la web para esa búsqueda.'
    }
    const lines = results.slice(0, 6).map((r, i) => {
      const head = r.name?.trim() || '(sin título)'
      const host = r.host_name?.trim() || ''
      const date = r.date?.trim() ? ` · ${r.date.trim()}` : ''
      const snippet = r.snippet?.trim().slice(0, 300) || ''
      return `${i + 1}. ${head}${host ? ` — ${host}` : ''}${date}\n   URL: ${r.url ?? 'n/d'}\n   ${snippet}`
    })
    return `Resultados web para "${query}":\n\n${lines.join('\n\n')}`
  },
}

const pageReader: SkillDef = {
  ...SKILL_CATALOG.find((s) => s.id === 'page_reader')!,
  async run(args) {
    const url = str(args.url).trim()
    if (!/^https?:\/\//i.test(url)) {
      throw new Error('Parámetro "url" inválido: debe empezar por http:// o https://')
    }
    const zai = await ZAI.create()
    const result = (await zai.functions.invoke('page_reader', { url })) as {
      data?: { title?: string; html?: string; publishedTime?: string }
    }
    const data = result?.data ?? {}
    const text = stripHtml(data.html ?? '').slice(0, 4000)
    if (!text) return `La página ${url} no devolvió contenido legible.`
    const title = data.title?.trim() || url
    return `Contenido de "${title}" (${url}):\n\n${text}`
  },
}

const calculator: SkillDef = {
  ...SKILL_CATALOG.find((s) => s.id === 'calculator')!,
  async run(args) {
    const raw = str(args.expression).trim()
    if (!raw) throw new Error('Falta el parámetro "expression"')
    const expr = raw.replace(/\^/g, '**').replace(/,/g, '.')
    // Whitelist estricta: solo números, operadores y paréntesis → Function
    // es seguro porque no puede ejecutar identificadores.
    if (expr.replace(/[0-9+\-*/%().\s]/g, '') !== '') {
      throw new Error('La expresión contiene caracteres no permitidos')
    }
    try {
      const value = Function(`"use strict"; return (${expr});`)() as unknown
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error('Resultado no finito')
      }
      const pretty = Number.isInteger(value)
        ? value.toLocaleString('es-AR')
        : value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
      return `${raw} = ${pretty}`
    } catch {
      throw new Error(`No pude evaluar la expresión "${raw}"`)
    }
  },
}

const clock: SkillDef = {
  ...SKILL_CATALOG.find((s) => s.id === 'clock')!,
  async run() {
    const now = new Date()
    const iso = now.toISOString()
    const es = now.toLocaleString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Buenos_Aires',
    })
    return `Fecha y hora del servidor: ${es} (America/Buenos_Aires). ISO UTC: ${iso}`
  },
}

// ─── registro público ─────────────────────────────────────────

export const SKILLS: SkillDef[] = [webSearch, pageReader, calculator, clock]

export function getSkill(id: string): SkillDef | undefined {
  return SKILLS.find((s) => s.id === id)
}

export function parseSkillIds(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string' && getSkill(x) !== undefined)
  } catch {
    return []
  }
}

/** Bloque de instrucciones que se anexa al system prompt del agente. */
export function buildToolsInstruction(skillIds: string[]): string {
  const skills = skillIds.map(getSkill).filter((s): s is SkillDef => Boolean(s))
  if (skills.length === 0) return ''
  const catalog = skills
    .map((s) => {
      const params = s.params
        .map(
          (p) =>
            `        "${p.name}": ${p.type}${p.required ? '' : ' (opcional)'} — ${p.description}`,
        )
        .join('\n')
      return `  • ${s.id}: ${s.description}${params ? `\n      Parámetros:\n${params}` : '\n      Sin parámetros.'}`
    })
    .join('\n')
  return `

# HERRAMIENTAS DISPONIBLES
Tienes acceso a estas herramientas:
${catalog}

## CÓMO USARLAS
Cuando necesites una herramienta, responde ÚNICAMENTE con una línea con este formato exacto (sin texto adicional):
<tool>{"name":"id_de_herramienta","arguments":{"param":"valor"}}</tool>

El sistema ejecutará la herramienta y te enviará el resultado en un mensaje que empieza con [RESULTADO DE HERRAMIENTA]. Entonces responde al usuario usando esa información.
Reglas: usa UNA herramienta por turno; si no necesitas ninguna, responde normalmente sin la etiqueta <tool>; NUNCA inventes resultados de herramientas; usa la calculadora para cualquier operación aritmética no trivial; usa el reloj si necesitas la fecha de hoy.`
}

export interface SkillExecution {
  skillId: string
  skillName: string
  emoji: string
  args: Record<string, unknown>
  result: string
  ok: boolean
  durationMs: number
}

/** Ejecuta una skill y devuelve la traza (span) de la ejecución. */
export async function executeSkill(
  skillId: string,
  args: Record<string, unknown>,
): Promise<SkillExecution> {
  const skill = getSkill(skillId)
  const startedAt = Date.now()
  if (!skill) {
    return {
      skillId,
      skillName: skillId,
      emoji: '❓',
      args,
      result: `Herramienta desconocida: ${skillId}`,
      ok: false,
      durationMs: Date.now() - startedAt,
    }
  }
  try {
    const result = await skill.run(args ?? {})
    return {
      skillId: skill.id,
      skillName: skill.name,
      emoji: skill.emoji,
      args,
      result: String(result).slice(0, 6000),
      ok: true,
      durationMs: Date.now() - startedAt,
    }
  } catch (e) {
    return {
      skillId: skill.id,
      skillName: skill.name,
      emoji: skill.emoji,
      args,
      result: `Error al ejecutar: ${e instanceof Error ? e.message : 'desconocido'}`,
      ok: false,
      durationMs: Date.now() - startedAt,
    }
  }
}

/** Extrae el primer <tool>{...}</tool> de una respuesta del modelo.
 * Tolerante a: fences de código, `\n` literales, y argumentos enviados
 * en el objeto raíz en vez de dentro de "arguments". */
export function parseToolCall(
  reply: string,
): { name: string; arguments: Record<string, unknown> } | null {
  const match = reply.match(/<tool>([\s\S]*?)<\/tool>/i)
  if (!match) return null
  const raw = match[1]
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .replace(/\\n/g, ' ')
    .trim()

  let parsed: Record<string, unknown> | null = null
  for (const candidate of [raw, raw.replace(/,(\s*})/g, '$1')]) {
    try {
      const value = JSON.parse(candidate) as unknown
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        parsed = value as Record<string, unknown>
        break
      }
    } catch {
      // probar el siguiente candidato
    }
  }
  if (!parsed) return null

  const name = typeof parsed.name === 'string' ? parsed.name : ''
  if (!name) return null
  const explicit = (parsed.arguments ?? parsed.args) as unknown
  let args: Record<string, unknown> = {}
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    args = explicit as Record<string, unknown>
  } else {
    // El modelo puso los parámetros en la raíz: usarlos todos menos "name"
    args = { ...parsed }
    delete args.name
    delete args.arguments
    delete args.args
  }
  return { name, arguments: args }
}
