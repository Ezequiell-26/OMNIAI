// Cliente Prisma "fresco": se genera en node_modules/.prisma-fresh/client en
// cada `bun run db:push` (ver generator clientFresh en schema.prisma).
// Ventaja: aunque el proceso del dev server viva días, siempre compila el
// cliente con los modelos actuales — evita el error "db.flow is undefined"
// tras agregar modelos sin reiniciar el server.
import { PrismaClient } from '../../node_modules/.prisma-fresh/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaFingerprint?: string
}

// Huella del schema actual: bump cuando cambien modelos/campos (junto con
// db:push). Si el cliente cacheado en globalThis fue creado por una versión
// anterior, se reemplaza por el fresco (auto-curación sin restart).
const SCHEMA_FINGERPRINT = 'v3:agent.skills+message.toolUses'

function resolveClient(): PrismaClient {
  const cached = globalForPrisma.prisma
  if (cached && globalForPrisma.prismaFingerprint === SCHEMA_FINGERPRINT) {
    return cached
  }
  const fresh = new PrismaClient({ log: ['query'] })
  globalForPrisma.prisma = fresh
  globalForPrisma.prismaFingerprint = SCHEMA_FINGERPRINT
  return fresh
}

export const db = resolveClient()
