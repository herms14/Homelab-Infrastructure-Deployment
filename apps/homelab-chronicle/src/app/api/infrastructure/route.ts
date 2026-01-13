import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// Infrastructure Nodes API - For service dependency graph

// GET - List all infrastructure nodes with their events
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const withEvents = searchParams.get('withEvents') === 'true'
  const type = searchParams.get('type')

  const where = type ? { type } : {}

  const nodes = await prisma.infrastructureNode.findMany({
    where,
    orderBy: { name: 'asc' },
  })

  // If requested, get events for each node
  let nodesWithEvents = nodes.map(n => ({
    ...n,
    services: JSON.parse(n.services || '[]'),
    metadata: JSON.parse(n.metadata || '{}'),
    events: [] as any[],
    eventCount: 0,
  }))

  if (withEvents) {
    for (const node of nodesWithEvents) {
      const events = await prisma.event.findMany({
        where: { infrastructureNode: node.name },
        orderBy: { date: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          date: true,
          category: true,
        },
      })
      node.events = events
      node.eventCount = await prisma.event.count({
        where: { infrastructureNode: node.name },
      })
    }
  }

  // Build hierarchy
  const rootNodes = nodesWithEvents.filter(n => !n.parentId)
  const childNodes = nodesWithEvents.filter(n => n.parentId)

  function buildTree(parentId: string | null): any[] {
    return nodesWithEvents
      .filter(n => n.parentId === parentId)
      .map(n => ({
        ...n,
        children: buildTree(n.id),
      }))
  }

  return NextResponse.json({
    nodes: nodesWithEvents,
    hierarchy: buildTree(null),
    stats: {
      total: nodes.length,
      byType: nodes.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    },
  })
}

// POST - Create or update infrastructure node
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, type, ip, description, parentId, services, metadata } = body

  if (!name || !type) {
    return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
  }

  const node = await prisma.infrastructureNode.upsert({
    where: { name },
    update: {
      type,
      ip,
      description,
      parentId,
      services: JSON.stringify(services || []),
      metadata: JSON.stringify(metadata || {}),
    },
    create: {
      name,
      type,
      ip,
      description,
      parentId,
      services: JSON.stringify(services || []),
      metadata: JSON.stringify(metadata || {}),
    },
  })

  return NextResponse.json(node)
}

// DELETE - Remove infrastructure node
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  await prisma.infrastructureNode.delete({
    where: { name },
  })

  return NextResponse.json({ success: true })
}
