import { NextResponse } from 'next/server'
import { ensureFreshness, getStatus } from '@/lib/git-sync-engine'

export const dynamic = 'force-dynamic'

export async function GET() {
  ensureFreshness()
  return NextResponse.json(getStatus())
}
