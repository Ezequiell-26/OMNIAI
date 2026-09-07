# OMNIAI en Windows

## Regla canónica

Windows no tiene una segunda base de código de producto. La fuente única es `main`.

El branch histórico `windows-app` conserva trabajo previo y puede consultarse como referencia/backup, pero no debe utilizarse como base de desarrollo ni como instalación separada.

## Instalación en Windows

Usa una única copia del repositorio:

```powershell
git clone https://github.com/Ezequiell-26/OMNIAI.git
cd OMNIAI
git checkout main
bun install
bun run db:push
bun run dev
```

Después abre `http://localhost:3000`.

## Arquitectura

La experiencia de Windows debe consumir los mismos contratos y runtime que la web:

```text
Windows
  ↓
Platform Adapter
  ↓
OMNIAI CORE
  ↓
Agent Runtime / Tools / Models
```

Solo deben cambiar los adapters de I/O (filesystem, terminal, Git, browser, notifications, empaquetado). La lógica del agente, permisos, runs, eventos, routing y recuperación permanece en Core.

## Regla para futuras contribuciones

No crear `windows-*` duplicados de agentes, estado, permisos, modelos, herramientas o ejecución. Antes de implementar una capacidad de escritorio, comprobar si ya existe en `src/lib/core` y reutilizarla.

## Estado

- `DONE`: `main` es la fuente canónica.
- `DONE`: documentación de instalación Windows desde `main`.
- `IN PROGRESS`: adapters nativos de Windows y empaquetado de escritorio.
- `BLOCKED`: nada; el desarrollo base continúa en `main`.
