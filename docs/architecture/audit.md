# OMNIAI architecture audit — 2026-09-08

## Estado actual

`main` es la fuente canónica del Core. El proyecto ya tiene una separación inicial entre Core, Agent y superficies, pero Web y Windows conservan bastante historia divergente y todavía deben migrar progresivamente a los contratos compartidos.

## Fortalezas actuales

- Core versionado en `src/lib/core`.
- Contratos canónicos para agentes, permisos, eventos, runs y capacidades.
- Máquina de estados validada para ejecuciones.
- RunManager con adapter de persistencia intercambiable.
- PermissionManager con niveles de riesgo y aprobaciones de sesión.
- AI Gateway independiente de un proveedor concreto.
- Model Router con políticas cloud/private/local.
- Project Context Engine y ranking de archivos.
- Interfaces portables para Git, terminal y tests.
- Tool Registry con validación y permisos.
- Workspace y Diff Engine existentes con aprobación para cambios.
- Backups previos a la unificación de ramas.
- Guardas de arquitectura y CI.

## Brechas principales

1. El Agent Execution Engine ya puede iterar modelo → tool → resultado, pero aún necesita adapters concretos para conectar proveedores reales de OMNIAI y streaming de eventos.
2. La persistencia del RunManager todavía depende de adapters; falta una implementación integrada con la persistencia real de la aplicación.
3. Git, terminal y TestRunner tienen contratos portables, pero aún falta conectar adapters reales por plataforma.
4. El Project Context Engine necesita un indexador incremental real sobre el workspace.
5. El Diff Engine debe evolucionar a ChangeSet multiarchivo con hashes y rollback transaccional.
6. Web y Windows deben consumir activamente el Core en vez de conservar lógica de dominio duplicada.
7. MCP, Knowledge/Memory, workflows y observabilidad avanzada necesitan integrarse al runtime real.
8. `bun.lock` debe sincronizarse con la dependencia `diff` antes de volver a exigir `--frozen-lockfile` en CI.

## Riesgos

- Divergencia entre ramas `web` y `windows-app`.
- Funcionalidades de Windows/Web que todavía no estén expresadas como adapters.
- Integración de proveedores que vuelva a introducir acoplamiento en Agent Runtime.
- Cambios grandes realizados por distintas IAs sin respetar Core contracts.

## Regla de integración

No fusionar ramas mediante sobrescritura ciega. Comparar funcionalidad por funcionalidad, extraer lo reutilizable al Core y mantener adapters delgados para cada plataforma.

## Próximas prioridades

### P0
- Runtime real con streaming + cancelación + persistencia.
- Permission/approval event flow conectado a UI.
- Adapter real de workspace, Git y terminal.
- ChangeSet multiarchivo con conflicto por hash y rollback.

### P1
- ProjectIndexer incremental.
- TestRunner real.
- Self-healing loop.
- Multi-agent orchestration.
- Web y Windows consumiendo el mismo runtime.

### P2
- MCP lifecycle.
- Knowledge/RAG.
- Memory.
- Observability/OpenTelemetry bridge.
- Workflow editor.

### P3
- Optimización avanzada de routing.
- Plugins y marketplace.
- Distribución/remoting.
