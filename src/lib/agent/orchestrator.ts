import type { AgentDefinition, AgentPlan } from './types';

export const BUILTIN_AGENTS: AgentDefinition[] = [
  { id: 'architect', name: 'Architect', description: 'Analiza el repositorio y divide el trabajo.', systemPrompt: 'Diseña una implementación segura, incremental y verificable.', permissions: ['read_files'], tools: ['search_files', 'read_file'] },
  { id: 'coder', name: 'Coder', description: 'Implementa cambios y mantiene el diff pequeño.', systemPrompt: 'Modifica solo lo necesario. Mantén tipos, pruebas y convenciones.', permissions: ['read_files', 'write_files'], tools: ['search_files', 'read_file', 'write_file', 'edit_file'] },
  { id: 'tester', name: 'Tester', description: 'Ejecuta pruebas y valida regresiones.', systemPrompt: 'Valida cambios y reporta fallos reproducibles.', permissions: ['read_files', 'run_commands'], tools: ['run_tests', 'run_command'] },
  { id: 'reviewer', name: 'Reviewer', description: 'Revisa seguridad, calidad y mantenibilidad.', systemPrompt: 'Encuentra errores, riesgos y deuda técnica.', permissions: ['read_files'], tools: ['search_files', 'read_file'] },
  { id: 'security', name: 'Security', description: 'Busca vulnerabilidades y permisos excesivos.', systemPrompt: 'Prioriza secretos, ejecución, red, rutas y supply chain.', permissions: ['read_files'], tools: ['search_files', 'read_file'] },
];

/** Creates a deterministic starter plan; model-driven planning plugs into the same contract. */
export function createStarterPlan(goal: string): AgentPlan {
  const id = crypto.randomUUID();
  return {
    id,
    goal,
    risk: /delete|deploy|production|secret|database/i.test(goal) ? 'high' : 'medium',
    requiresApproval: /delete|deploy|production|secret|database/i.test(goal),
    steps: [
      { id: `${id}-1`, title: 'Understand repository', description: 'Map files, stack, entry points and existing conventions.', agent: 'architect', dependencies: [], status: 'pending' },
      { id: `${id}-2`, title: 'Implement changes', description: 'Apply the smallest coherent set of code changes.', agent: 'coder', dependencies: [`${id}-1`], status: 'pending' },
      { id: `${id}-3`, title: 'Run verification', description: 'Execute tests, typecheck and relevant checks.', agent: 'tester', dependencies: [`${id}-2`], status: 'pending' },
      { id: `${id}-4`, title: 'Review result', description: 'Review diff, security and maintainability before shipping.', agent: 'reviewer', dependencies: [`${id}-3`], status: 'pending' },
    ],
  };
}
