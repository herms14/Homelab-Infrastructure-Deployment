import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Related Events API - Find events related to a specific event

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const eventId = params.id

  // Get the source event
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      linkedTo: {
        include: {
          toEvent: true,
        },
      },
      linkedFrom: {
        include: {
          fromEvent: true,
        },
      },
    },
  })

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Get explicitly linked events
  const linkedEvents = [
    ...event.linkedTo.map(l => ({ ...l.toEvent, linkType: l.linkType, linkDirection: 'to' })),
    ...event.linkedFrom.map(l => ({ ...l.fromEvent, linkType: l.linkType, linkDirection: 'from' })),
  ]

  // Parse tags and services for similarity matching
  const eventTags = JSON.parse(event.tags || '[]')
  const eventServices = JSON.parse(event.services || '[]')

  // Find similar events based on:
  // 1. Same category
  // 2. Shared tags
  // 3. Same services
  // 4. Same infrastructure node
  // 5. Close in time (within 7 days)

  const allEvents = await prisma.event.findMany({
    where: {
      id: { not: eventId },
    },
    orderBy: { date: 'desc' },
  })

  const scoredEvents = allEvents.map(e => {
    let score = 0
    const reasons: string[] = []

    // Same category
    if (e.category === event.category) {
      score += 2
      reasons.push('same category')
    }

    // Shared tags
    const eTags = JSON.parse(e.tags || '[]')
    const sharedTags = eventTags.filter((t: string) => eTags.includes(t))
    if (sharedTags.length > 0) {
      score += sharedTags.length * 2
      reasons.push(`${sharedTags.length} shared tags`)
    }

    // Same services
    const eServices = JSON.parse(e.services || '[]')
    const sharedServices = eventServices.filter((s: string) => eServices.includes(s))
    if (sharedServices.length > 0) {
      score += sharedServices.length * 3
      reasons.push(`${sharedServices.length} shared services`)
    }

    // Same infrastructure node
    if (e.infrastructureNode && e.infrastructureNode === event.infrastructureNode) {
      score += 3
      reasons.push('same infrastructure node')
    }

    // Close in time (within 7 days)
    const eventDate = new Date(event.date)
    const eDate = new Date(e.date)
    const daysDiff = Math.abs((eventDate.getTime() - eDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff <= 7) {
      score += Math.ceil(3 - daysDiff / 2)
      reasons.push(`${Math.round(daysDiff)} days apart`)
    }

    // Same source
    if (e.source && e.source === event.source && e.source !== 'manual') {
      score += 1
      reasons.push('same source')
    }

    return {
      ...e,
      similarityScore: score,
      similarityReasons: reasons,
    }
  })

  // Filter and sort by score
  const suggestedEvents = scoredEvents
    .filter(e => e.similarityScore > 0)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 10)

  return NextResponse.json({
    eventId,
    linkedEvents,
    suggestedEvents,
  })
}
