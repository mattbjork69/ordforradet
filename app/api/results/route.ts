
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const results = await prisma.result.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' }
  })
  return NextResponse.json(results)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { total, correct, avgDifficulty, estMean, estLo, estHi } = body
  const r = await prisma.result.create({
    data: { total, correct, avgDifficulty, estMean, estLo, estHi, userId: session.user.id }
  })
  return NextResponse.json(r, { status: 201 })
}
