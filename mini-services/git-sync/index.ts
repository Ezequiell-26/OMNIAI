/**
 * Git Sync Service
 * -----------------
 * Mantiene el proyecto local sincronizado automáticamente con GitHub (hub).
 *
 * - Local adelante (nuevos commits aquí)  -> push automático a GitHub
 * - Remoto adelante (push externo a GitHub) -> pull automático (ff-only)
 * - Divergencia -> rebase automático; si hay conflicto, aborta y reporta
 * - El árbol de trabajo sucio NUNCA se toca (no stash, no discard)
 *
 * API (puerto 3031):
 *   GET  /status  -> estado de sincronización
 *   POST /sync    -> sincronizar ahora
 *   POST /config  -> { autoCommit: boolean }  (commit+push de cambios pendientes)
 */

const PORT = Number(process.env.PORT ?? 3031);
const REPO_PATH = process.env.REPO_PATH ?? "/home/z/my-project";
const BRANCH = process.env.BRANCH ?? "main";
const OWNER = process.env.GITHUB_OWNER ?? "Ezequiell-26";
const REPO_NAME = process.env.GITHUB_REPO ?? "OMNIAI";
const TOKEN = process.env.GITHUB_TOKEN ?? "";
const INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS ?? 60_000);
const MAX_COMMIT_MSG_LEN = 120;

let autoCommit = process.env.AUTO_COMMIT === "true";

const REMOTE_PLAIN = `https://github.com/${OWNER}/${REPO_NAME}.git`;
const REMOTE_AUTH = TOKEN
  ? `https://x-access-token:${TOKEN}@github.com/${OWNER}/${REPO_NAME}.git`
  : REMOTE_PLAIN;

interface SyncResult {
  ok: boolean;
  action:
    | "push"
    | "pull"
    | "rebase-push"
    | "noop"
    | "auto-commit-push"
    | "error";
  detail: string;
  ahead: number;
  behind: number;
  dirty: boolean;
  at: string;
}

let lastResult: SyncResult | null = null;
let lastError: string | null = null;
let syncing = false;

async function git(args: string[]): Promise<string> {
  const proc = Bun.spawn(["git", "-C", REPO_PATH, ...args], {
    cwd: REPO_PATH,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code === 0) return out.trim();
  throw new Error(`git ${args[0]}: ${(err.trim() || `exit ${code}`).split("\n").slice(-2).join(" ").trim()}`);
}

async function isDirty(): Promise<boolean> {
  return (await git(["status", "--porcelain"])).length > 0;
}

async function count(range: string): Promise<number> {
  const out = await git(["rev-list", "--count", range]);
  return Number(out || "0");
}

async function autoCommitChanges(): Promise<string | null> {
  const status = await git(["status", "--porcelain"]);
  if (!status) return null;
  const firstLine = status.split("\n")[0].slice(0, MAX_COMMIT_MSG_LEN);
  await git(["add", "-A"]);
  await git([
    "commit",
    "-m",
    `auto-sync: cambios del proyecto (${new Date().toISOString()})`,
  ]);
  return firstLine;
}

async function runSync(manual: boolean): Promise<SyncResult> {
  if (syncing) {
    return {
      ok: false,
      action: "noop",
      detail: "Ya hay una sincronización en curso",
      ahead: 0,
      behind: 0,
      dirty: false,
      at: new Date().toISOString(),
    };
  }
  syncing = true;
  lastError = null;
  const at = new Date().toISOString();
  try {
    const dirty = await isDirty();

    // 1) Traer estado remoto
    await git(["fetch", REMOTE_AUTH, BRANCH]);
    const behind = await count(`HEAD..FETCH_HEAD`);
    const ahead = await count(`FETCH_HEAD..HEAD`);

    let result: SyncResult;

    // 2) Cambios locales pendientes -> opcionalmente auto-commit + push
    if (dirty && autoCommit) {
      const msg = await autoCommitChanges();
      if (msg) {
        await git(["push", REMOTE_AUTH, `${BRANCH}:${BRANCH}`]);
        result = {
          ok: true,
          action: "auto-commit-push",
          detail: `Commit+push automáticos: "${msg}"`,
          ahead: 0,
          behind: 0,
          dirty: await isDirty(),
          at,
        };
        lastResult = result;
        return result;
      }
    }

    if (ahead > 0 && behind === 0) {
      // 3) Local adelante -> push
      await git(["push", REMOTE_AUTH, `${BRANCH}:${BRANCH}`]);
      result = {
        ok: true,
        action: "push",
        detail: `${ahead} commit(s) enviados a GitHub`,
        ahead: 0,
        behind: 0,
        dirty,
        at,
      };
    } else if (behind > 0 && ahead === 0) {
      // 4) Remoto adelante -> pull (fast-forward only)
      if (dirty) {
        result = {
          ok: true,
          action: "noop",
          detail: `GitHub tiene ${behind} commit(s) nuevos, pero hay cambios sin commitear. Haz commit o actívalo con auto-commit.`,
          ahead,
          behind,
          dirty,
          at,
        };
      } else {
        await git(["merge", "--ff-only", "FETCH_HEAD"]);
        result = {
          ok: true,
          action: "pull",
          detail: `${behind} commit(s) traídos desde GitHub`,
          ahead: 0,
          behind: 0,
          dirty: await isDirty(),
          at,
        };
      }
    } else if (behind > 0 && ahead > 0) {
      // 5) Divergencia -> rebase + push
      if (dirty) {
        result = {
          ok: true,
          action: "noop",
          detail: `Historias divergidas (${ahead} local / ${behind} remoto) con cambios pendientes. Se requiere atención manual.`,
          ahead,
          behind,
          dirty,
          at,
        };
      } else {
        try {
          await git(["rebase", "FETCH_HEAD"]);
          await git(["push", REMOTE_AUTH, `${BRANCH}:${BRANCH}`]);
          result = {
            ok: true,
            action: "rebase-push",
            detail: `Rebase de ${ahead} commit(s) sobre ${behind} remoto(s) y push exitoso`,
            ahead: 0,
            behind: 0,
            dirty: false,
            at,
          };
        } catch {
          await git(["rebase", "--abort"]).catch(() => {});
          throw new Error(
            "Conflicto de rebase: se abortó automáticamente. Se requiere resolución manual.",
          );
        }
      }
    } else {
      result = {
        ok: true,
        action: "noop",
        detail: manual ? "Todo sincronizado ✅" : "Sin cambios",
        ahead,
        behind,
        dirty,
        at,
      };
    }

    lastResult = result;
    return result;
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
    const fail: SyncResult = {
      ok: false,
      action: "error",
      detail: lastError,
      ahead: 0,
      behind: 0,
      dirty: false,
      at,
    };
    lastResult = fail;
    return fail;
  } finally {
    syncing = false;
  }
}

const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/status") {
      return Response.json(
        {
          repo: `${OWNER}/${REPO_NAME}`,
          repoUrl: REMOTE_PLAIN,
          branch: BRANCH,
          intervalMs: INTERVAL_MS,
          autoCommit,
          syncing,
          lastResult,
          lastError,
        },
        { headers: jsonHeaders },
      );
    }

    if (url.pathname === "/sync" && req.method === "POST") {
      const result = await runSync(true);
      return Response.json(result, {
        status: result.ok ? 200 : 500,
        headers: jsonHeaders,
      });
    }

    if (url.pathname === "/config" && req.method === "POST") {
      try {
        const body = (await req.json()) as { autoCommit?: boolean };
        if (typeof body.autoCommit === "boolean") autoCommit = body.autoCommit;
        return Response.json({ ok: true, autoCommit }, { headers: jsonHeaders });
      } catch {
        return Response.json(
          { ok: false, error: "JSON inválido" },
          { status: 400, headers: jsonHeaders },
        );
      }
    }

    return Response.json({ service: "git-sync", ok: true }, { headers: jsonHeaders });
  },
});

console.log(
  `[git-sync] servicio en puerto ${PORT} -> ${OWNER}/${REPO_NAME} (${BRANCH})`,
);
console.log(
  `[git-sync] intervalo: ${INTERVAL_MS / 1000}s | autoCommit: ${autoCommit}`,
);

// Primera sincronización al arrancar, luego por intervalo
setTimeout(() => {
  void runSync(false);
}, 3_000);
setInterval(() => {
  void runSync(false);
}, INTERVAL_MS);
