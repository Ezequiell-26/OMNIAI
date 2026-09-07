import { NextResponse } from 'next/server'
import { triggerSync } from '@/lib/git-sync-engine'

export const dynamic = 'force-dynamic'

export async function POST() {
  const result = await triggerSync()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
