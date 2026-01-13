import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// Import API - Import events from JSON export

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { events, options = {} } = body

    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid import data: events must be an array' }, { status: 400 })
    }

    const {
      skipDuplicates = true,
      updateExisting = false,
      preserveIds = false,
    } = options

    const results = {
      imported: 0,
      skipped: 0,
      updated: 0,
      errors: [] as string[],
    }

    for (const eventData of events) {
      try {
        // Validate required fields
        if (!eventData.title || !eventData.date || !eventData.category) {
          results.errors.push(`Invalid event: missing required fields (title, date, or category)`)
          continue
        }

        // Check for existing event by sourceRef or title+date
        let existingEvent = null

        if (eventData.id && preserveIds) {
          existingEvent = await prisma.event.findUnique({ where: { id: eventData.id } })
        }

        if (!existingEvent && eventData.sourceRef) {
          existingEvent = await prisma.event.findFirst({
            where: { sourceRef: eventData.sourceRef }
          })
        }

        if (!existingEvent) {
          existingEvent = await prisma.event.findFirst({
            where: {
              title: eventData.title,
              date: new Date(eventData.date),
            }
          })
        }

        if (existingEvent) {
          if (updateExisting) {
            await prisma.event.update({
              where: { id: existingEvent.id },
              data: {
                title: eventData.title,
                content: eventData.content || '',
                category: eventData.category,
                icon: eventData.icon,
                tags: Array.isArray(eventData.tags) ? JSON.stringify(eventData.tags) : eventData.tags || '[]',
                services: Array.isArray(eventData.services) ? JSON.stringify(eventData.services) : eventData.services || '[]',
                codeSnippets: Array.isArray(eventData.codeSnippets) ? JSON.stringify(eventData.codeSnippets) : eventData.codeSnippets || '[]',
                infrastructureNode: eventData.infrastructureNode,
              },
            })
            results.updated++
          } else if (skipDuplicates) {
            results.skipped++
          }
          continue
        }

        // Create new event
        const newEventData: any = {
          title: eventData.title,
          date: new Date(eventData.date),
          content: eventData.content || '',
          category: eventData.category,
          icon: eventData.icon,
          tags: Array.isArray(eventData.tags) ? JSON.stringify(eventData.tags) : eventData.tags || '[]',
          source: eventData.source || 'import',
          sourceRef: eventData.sourceRef,
          services: Array.isArray(eventData.services) ? JSON.stringify(eventData.services) : eventData.services || '[]',
          codeSnippets: Array.isArray(eventData.codeSnippets) ? JSON.stringify(eventData.codeSnippets) : eventData.codeSnippets || '[]',
          infrastructureNode: eventData.infrastructureNode,
          beforeImageId: eventData.beforeImageId,
          afterImageId: eventData.afterImageId,
        }

        if (preserveIds && eventData.id) {
          newEventData.id = eventData.id
        }

        await prisma.event.create({ data: newEventData })
        results.imported++

      } catch (error: any) {
        results.errors.push(`Failed to import "${eventData.title}": ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Imported ${results.imported}, updated ${results.updated}, skipped ${results.skipped} event(s)`,
    })

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Failed to import events: ' + error.message }, { status: 500 })
  }
}
