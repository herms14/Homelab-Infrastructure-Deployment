import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// Event Linking API - Link related events together

// GET - Get all links for an event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const eventId = params.id

  const links = await prisma.eventLink.findMany({
    where: {
      OR: [
        { fromEventId: eventId },
        { toEventId: eventId },
      ],
    },
    include: {
      fromEvent: {
        select: { id: true, title: true, date: true, category: true },
      },
      toEvent: {
        select: { id: true, title: true, date: true, category: true },
      },
    },
  })

  return NextResponse.json(links.map(link => ({
    id: link.id,
    linkType: link.linkType,
    description: link.description,
    direction: link.fromEventId === eventId ? 'outgoing' : 'incoming',
    linkedEvent: link.fromEventId === eventId ? link.toEvent : link.fromEvent,
    createdAt: link.createdAt,
  })))
}

// POST - Create a new link between events
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fromEventId = params.id
  const body = await request.json()
  const { toEventId, linkType = 'related', description } = body

  if (!toEventId) {
    return NextResponse.json({ error: 'toEventId is required' }, { status: 400 })
  }

  if (fromEventId === toEventId) {
    return NextResponse.json({ error: 'Cannot link event to itself' }, { status: 400 })
  }

  // Verify both events exist
  const [fromEvent, toEvent] = await Promise.all([
    prisma.event.findUnique({ where: { id: fromEventId } }),
    prisma.event.findUnique({ where: { id: toEventId } }),
  ])

  if (!fromEvent || !toEvent) {
    return NextResponse.json({ error: 'One or both events not found' }, { status: 404 })
  }

  // Check if link already exists
  const existingLink = await prisma.eventLink.findFirst({
    where: {
      OR: [
        { fromEventId, toEventId },
        { fromEventId: toEventId, toEventId: fromEventId },
      ],
    },
  })

  if (existingLink) {
    return NextResponse.json({ error: 'Link already exists' }, { status: 409 })
  }

  const link = await prisma.eventLink.create({
    data: {
      fromEventId,
      toEventId,
      linkType,
      description,
    },
    include: {
      fromEvent: {
        select: { id: true, title: true, date: true, category: true },
      },
      toEvent: {
        select: { id: true, title: true, date: true, category: true },
      },
    },
  })

  return NextResponse.json(link, { status: 201 })
}

// DELETE - Remove a link
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const linkId = searchParams.get('linkId')

  if (!linkId) {
    return NextResponse.json({ error: 'linkId is required' }, { status: 400 })
  }

  await prisma.eventLink.delete({
    where: { id: linkId },
  })

  return NextResponse.json({ success: true })
}
