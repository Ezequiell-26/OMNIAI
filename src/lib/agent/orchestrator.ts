import type { AgentDefinition, AgentPlan } from './types';

export const BUILTIN_AGENTS: AgentDefinition[] = [
  { id: 'architect', name: 'Architect', description: 'Analiza repositorio y divide el trabajo.', systemPrompt: 'Diseña una implementación segura, incremental y verificable.', permissions: ['read_files'], tools: ['search_files','read_file'] },
  { id: 'coder', name: 'Coder', description: 'Implementa cambios.', systemPrompt: 'Modifica solo lo necesario y conserva convenciones.', permissions: ['read_files','write_files'], tools: ['search_files','read_file','write_file','edit_file'] },
  { id: 'tester', name: 'Tester', description: 'Valida regresiones.', systemPrompt: 'Ejecuta comprobaciones y reporta fallos reproducibles.', permissions: ['read_files','run_commands'], tools: ['run_tests','run_command'] },
  { id: 'reviewer', name: 'Reviewer', description: 'Revisa calidad y seguridad.', systemPrompt: 'Busca errores, riesgos y deuda técnica.', permissions: ['read_files'], tools: ['search_files','read_file'] },
  { id: 'security', name: 'Security', description: 'Audita permisos, secretos y supply chain.', systemPrompt: 'Prioriza secretos, ejecución, red y rutas.', permissions: ['read_files'], tools: ['search_files','read_file'] },
];

export function createStarterPlan(goal: string): AgentPlan {
  const id = crypto.randomUUID();
  const highRisk = /delete|deploy|production|secret|database|credential|rm\s+-rf/i.test(goal);
  return { id, goal, risk: highRisk ? 'high' : 'medium', requiresApproval: highRisk, steps: [
    { id: `${id}-1`, title: 'Understand repository', description: 'Mapea archivos, stack, entry points y convenciones.', agent: 'architect', dependencies: [], status: 'pending' },
    { id: `${id}-2`, title: 'Implement changes', description: 'Aplica cambios coherentes y pequeños.', agent: 'coder', dependencies: [`${id}-1`], status: 'pending' },
    { id: `${id}-3`, title: 'Run verification', description: 'Ejecuta tests, typecheck y verificaciones relevantes.', agent: 'tester', dependencies: [`${id}-2`], status: 'pending' },
    { id: `${id}-4`, title: 'Review result', description: 'Revisa diff, seguridad y mantenibilidad.', agent: 'reviewer', dependencies: [`${id}-3`], status: 'pending' },
  ] };
}
