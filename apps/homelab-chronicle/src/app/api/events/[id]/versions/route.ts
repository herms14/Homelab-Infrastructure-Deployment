import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { createEventVersion } from '@/lib/event-versions'

// Event Version History API

// GET - Get all versions of an event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const eventId = params.id

  const versions = await prisma.eventVersion.findMany({
    where: { eventId },
    orderBy: { version: 'desc' },
  })

  return NextResponse.json(versions.map(v => ({
    ...v,
    snapshot: JSON.parse(v.snapshot || '{}'),
  })))
}

// POST - Restore event to a specific version
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const eventId = params.id
  const body = await request.json()
  const { versionId } = body

  // Get the version to restore
  const version = await prisma.eventVersion.findUnique({
    where: { id: versionId },
  })

  if (!version || version.eventId !== eventId) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  // Create a backup of current state before restoring
  await createEventVersion(eventId, session.user?.email || 'system', `Before restore to version ${version.version}`)

  // Restore the event
  const snapshot = JSON.parse(version.snapshot || '{}')

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      title: version.title,
      content: version.content,
      category: version.category,
      tags: version.tags,
      icon: snapshot.icon,
      services: snapshot.services || '[]',
      infrastructureNode: snapshot.infrastructureNode,
      codeSnippets: snapshot.codeSnippets || '[]',
    },
  })

  // Create a new version for the restore
  await createEventVersion(eventId, session.user?.email || 'system', `Restored to version ${version.version}`)

  return NextResponse.json({
    success: true,
    message: `Restored to version ${version.version}`,
    event: updatedEvent,
  })
}
