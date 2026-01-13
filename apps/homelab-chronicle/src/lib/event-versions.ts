import { prisma } from '@/lib/prisma'

/**
 * Create a new version snapshot when an event is updated
 */
export async function createEventVersion(
  eventId: string,
  changedBy?: string,
  changeNote?: string
) {
  // Get current event state
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  })

  if (!event) return null

  // Get latest version number
  const latestVersion = await prisma.eventVersion.findFirst({
    where: { eventId },
    orderBy: { version: 'desc' },
  })

  const newVersion = (latestVersion?.version || 0) + 1

  // Create version snapshot
  const version = await prisma.eventVersion.create({
    data: {
      eventId,
      version: newVersion,
      title: event.title,
      content: event.content,
      category: event.category,
      tags: event.tags,
      changedBy,
      changeNote,
      snapshot: JSON.stringify({
        title: event.title,
        content: event.content,
        category: event.category,
        tags: event.tags,
        icon: event.icon,
        services: event.services,
        infrastructureNode: event.infrastructureNode,
        codeSnippets: event.codeSnippets,
        beforeImageId: event.beforeImageId,
        afterImageId: event.afterImageId,
      }),
    },
  })

  return version
}
