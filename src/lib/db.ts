// Cliente Prisma "fresco": se genera en node_modules/.prisma-fresh/client en
// cada `bun run db:push` (ver generator clientFresh en schema.prisma).
// Ventaja: aunque el proceso del dev server viva días, siempre compila el
// cliente con los modelos actuales — evita el error "db.flow is undefined"
// tras agregar modelos sin reiniciar el server.
import { PrismaClient } from '../../node_modules/.prisma-fresh/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Auto-curación: si la instancia cacheada en globalThis fue creada por un
// cliente viejo (sin los modelos nuevos), se reemplaza por el fresco.
function resolveClient(): PrismaClient {
  const cached = globalForPrisma.prisma
  if (cached && typeof (cached as unknown as Record<string, unknown>).flow === 'object') {
    return cached
  }
  const fresh = new PrismaClient({ log: ['query'] })
  globalForPrisma.prisma = fresh
  return fresh
}

export const db = resolveClient()
