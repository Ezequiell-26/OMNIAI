import { GitSyncPanel } from '@/components/git-sync-panel'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="Logo OMNIAI"
              className="size-10 object-contain"
            />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">OMNIAI</h1>
              <p className="text-muted-foreground text-xs">
                Proyecto sincronizado con GitHub
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="hidden border-emerald-300 bg-emerald-50 text-emerald-700 sm:inline-flex"
          >
            Auto-sync activo
          </Badge>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-6 px-4 py-8 sm:px-6">
        <GitSyncPanel />
      </main>

      <footer className="mt-auto border-t pb-[env(safe-area-inset-bottom)]">
        <div className="text-muted-foreground mx-auto w-full max-w-5xl px-4 py-3 text-center text-xs sm:px-6">
          Repo:{' '}
          <a
            href="https://github.com/Ezequiell-26/OMNIAI"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:underline"
          >
            github.com/Ezequiell-26/OMNIAI
          </a>{' '}
          · Licencia MIT
        </div>
      </footer>
    </div>
  )
}
