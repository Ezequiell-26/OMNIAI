// Módulo exclusivo del servidor: nunca importar desde componentes cliente.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const REPO_PATH = process.env.REPO_PATH ?? process.cwd()
const BRANCH = process.env.GIT_SYNC_BRANCH ?? 'main'
const OWNER = process.env.GITHUB_OWNER ?? 'Ezequiell-26'
const REPO_NAME = process.env.GITHUB_REPO ?? 'OMNIAI'
const TOKEN = process.env.GITHUB_TOKEN ?? ''
const INTERVAL_MS = Number(process.env.GIT_SYNC_INTERVAL_MS ?? 60_000)
const MAX_COMMIT_MSG_LEN = 120
const GIT_TIMEOUT_MS = 30_000

let autoCommit = false

const REMOTE_PLAIN = `https://github.com/${OWNER}/${REPO_NAME}.git`
const REMOTE_AUTH = TOKEN
  ? `https://x-access-token:${TOKEN}@github.com/${OWNER}/${REPO_NAME}.git`
  : REMOTE_PLAIN

export interface SyncResult {
  ok: boolean
  action:
    | 'push'
    | 'pull'
    | 'rebase-push'
    | 'noop'
    | 'auto-commit-push'
    | 'error'
  detail: string
  ahead: number
  behind: number
  dirty: boolean
  at: string
}

interface EngineState {
  lastResult: SyncResult | null
  lastError: string | null
  syncing: boolean
  timer: NodeJS.Timeout | null
}

const globalForSync = globalThis as unknown as {
  __gitSyncEngine?: EngineState
}

function state(): EngineState {
  if (!globalForSync.__gitSyncEngine) {
    globalForSync.__gitSyncEngine = {
      lastResult: null,
      lastError: null,
      syncing: false,
      timer: null,
    }
  }
  return globalForSync.__gitSyncEngine
}

async function git(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', REPO_PATH, ...args],
      { timeout: GIT_TIMEOUT_MS },
    )
    return stdout.trim()
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { stderr?: string }
    const msg = (err.stderr?.trim() || err.message).split('\n').slice(-2).join(' ')
    throw new Error(`git ${args[0]}: ${msg}`)
  }
}

async function isDirty(): Promise<boolean> {
  return (await git(['status', '--porcelain'])).length > 0
}

async function count(range: string): Promise<number> {
  const out = await git(['rev-list', '--count', range])
  return Number(out || '0')
}

async function autoCommitChanges(): Promise<string | null> {
  const status = await git(['status', '--porcelain'])
  if (!status) return null
  const firstLine = status.split('\n')[0].slice(0, MAX_COMMIT_MSG_LEN)
  await git(['add', '-A'])
  await git([
    'commit',
    '-m',
    `auto-sync: cambios del proyecto (${new Date().toISOString()})`,
  ])
  return firstLine
}

export async function runSync(manual = false): Promise<SyncResult> {
  const s = state()
  if (s.syncing) {
    return {
      ok: false,
      action: 'noop',
      detail: 'Ya hay una sincronización en curso',
      ahead: 0,
      behind: 0,
      dirty: false,
      at: new Date().toISOString(),
    }
  }
  s.syncing = true
  s.lastError = null
  const at = new Date().toISOString()
  try {
    const dirty = await isDirty()

    // 1) Traer estado remoto
    await git(['fetch', REMOTE_AUTH, BRANCH])
    const behind = await count('HEAD..FETCH_HEAD')
    const ahead = await count('FETCH_HEAD..HEAD')

    let result: SyncResult

    // 2) Cambios locales pendientes -> opcionalmente auto-commit + push
    if (dirty && autoCommit) {
      const msg = await autoCommitChanges()
      if (msg) {
        await git(['push', REMOTE_AUTH, `${BRANCH}:${BRANCH}`])
        result = {
          ok: true,
          action: 'auto-commit-push',
          detail: `Commit+push automáticos: "${msg}"`,
          ahead: 0,
          behind: 0,
          dirty: await isDirty(),
          at,
        }
        s.lastResult = result
        return result
      }
    }

    if (ahead > 0 && behind === 0) {
      // 3) Local adelante -> push
      await git(['push', REMOTE_AUTH, `${BRANCH}:${BRANCH}`])
      result = {
        ok: true,
        action: 'push',
        detail: `${ahead} commit(s) enviados a GitHub`,
        ahead: 0,
        behind: 0,
        dirty,
        at,
      }
    } else if (behind > 0 && ahead === 0) {
      // 4) Remoto adelante -> pull (fast-forward only)
      if (dirty) {
        result = {
          ok: true,
          action: 'noop',
          detail: `GitHub tiene ${behind} commit(s) nuevos, pero hay cambios sin commitear. Haz commit o activa auto-commit.`,
          ahead,
          behind,
          dirty,
          at,
        }
      } else {
        await git(['merge', '--ff-only', 'FETCH_HEAD'])
        result = {
          ok: true,
          action: 'pull',
          detail: `${behind} commit(s) traídos desde GitHub`,
          ahead: 0,
          behind: 0,
          dirty: await isDirty(),
          at,
        }
      }
    } else if (behind > 0 && ahead > 0) {
      // 5) Divergencia -> rebase + push
      if (dirty) {
        result = {
          ok: true,
          action: 'noop',
          detail: `Historias divergidas (${ahead} local / ${behind} remoto) con cambios pendientes. Se requiere atención manual.`,
          ahead,
          behind,
          dirty,
          at,
        }
      } else {
        try {
          await git(['rebase', 'FETCH_HEAD'])
          await git(['push', REMOTE_AUTH, `${BRANCH}:${BRANCH}`])
          result = {
            ok: true,
            action: 'rebase-push',
            detail: `Rebase de ${ahead} commit(s) sobre ${behind} remoto(s) y push exitoso`,
            ahead: 0,
            behind: 0,
            dirty: false,
            at,
          }
        } catch {
          await git(['rebase', '--abort']).catch(() => {})
          throw new Error(
            'Conflicto de rebase: se abortó automáticamente. Requiere resolución manual.',
          )
        }
      }
    } else {
      result = {
        ok: true,
        action: 'noop',
        detail: manual ? 'Todo sincronizado ✅' : 'Sin cambios',
        ahead,
        behind,
        dirty,
        at,
      }
    }

    s.lastResult = result
    return result
  } catch (e) {
    s.lastError = e instanceof Error ? e.message : String(e)
    const fail: SyncResult = {
      ok: false,
      action: 'error',
      detail: s.lastError,
      ahead: 0,
      behind: 0,
      dirty: false,
      at,
    }
    s.lastResult = fail
    return fail
  } finally {
    s.syncing = false
  }
}

export function getStatus() {
  const s = state()
  return {
    repo: `${OWNER}/${REPO_NAME}`,
    repoUrl: REMOTE_PLAIN,
    branch: BRANCH,
    intervalMs: INTERVAL_MS,
    autoCommit,
    syncing: s.syncing,
    lastResult: s.lastResult,
    lastError: s.lastError,
    configured: TOKEN.length > 0,
  }
}

export async function triggerSync(): Promise<SyncResult> {
  return runSync(true)
}

export function setAutoCommit(value: boolean): boolean {
  autoCommit = value
  return autoCommit
}

/** Arranca el motor una sola vez por proceso (idempotente). */
export function startEngine(): void {
  const s = state()
  if (s.timer) return
  s.timer = setInterval(() => {
    void runSync(false)
  }, INTERVAL_MS)
  console.log(
    `[git-sync] motor iniciado -> ${OWNER}/${REPO_NAME} (${BRANCH}), cada ${INTERVAL_MS / 1000}s`,
  )
  setTimeout(() => {
    void runSync(false)
  }, 3_000)
}
