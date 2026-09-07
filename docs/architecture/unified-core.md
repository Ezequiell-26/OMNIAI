# OMNIAI Unified Core

## Objetivo

OMNIAI tiene un solo cerebro lógico: `src/lib/core`.

La web y la aplicación de Windows son superficies diferentes que consumen los mismos contratos, políticas, eventos y decisiones del agente.

```text
                    OMNIAI CORE
                         |
        +----------------+----------------+
        |                |                |
     Web UI          Windows UI       Future UI
        |                |                |
        +-------- Core adapters ---------+
                         |
              Agent / Tools / Models
```

## Regla de una sola fuente de verdad

No se deben crear implementaciones paralelas de `AgentStatus`, `AgentPermission`, `AgentEvent`, routing policy o execution mode en una superficie.

Los contratos canónicos viven en `src/lib/core/contracts.ts` y se exportan desde `src/lib/core/index.ts`.

El código específico de plataforma solo adapta I/O y UI. La lógica de negocio permanece en Core.

## Capas

1. **Core** — contratos, runtime, eventos, políticas y orquestación compartida.
2. **Agent** — herramientas, planificación, routing y sandbox que implementan Core.
3. **Adapters** — filesystem, Git, MCP, browser, ejecución local/privada/remota.
4. **Surfaces** — web y Windows; no deben duplicar lógica del núcleo.
5. **UI** — presentación, controles de permisos, diffs, logs y estado.

## Compatibilidad hacia delante

Los cambios incompatibles del core requieren una versión mayor de `OMNIAI_CORE_VERSION` y una migración explícita. Las superficies deben seguir funcionando con el contrato anterior hasta completar la migración.

## Estrategia web / Windows

`main` es la rama canónica y estable del cerebro. Las ramas `web` y `windows-app` son superficies de trabajo y deben sincronizarse con `main` antes de liberar cambios importantes.

Los backups creados durante la unificación preservan el estado previo de cada rama.

## Proyectos open source estudiados

Las ideas de OpenHands, OpenHands SDK/Canvas/CLI, Agent Zero, SWE-agent y Code Assistant se usan como referencias. El código de terceros solo puede entrar cuando su licencia y atribución sean compatibles y quede registrado en `THIRD-PARTY-NOTICES.md`.
