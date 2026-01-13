import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

// Watchtower Webhook Handler
// Configure in Watchtower:
// WATCHTOWER_NOTIFICATION_URL=https://chronicle.hrmsmrflrii.xyz/api/webhooks/watchtower
// WATCHTOWER_NOTIFICATION_TEMPLATE={{range .}}{{.Name}}: {{.State}}{{end}}

interface WatchtowerUpdate {
  name: string
  currentImage: string
  latestImage: string
  state: 'Updated' | 'Fresh' | 'Failed'
  error?: string
}

function parseWatchtowerPayload(body: string): WatchtowerUpdate[] {
  // Watchtower can send in different formats
  // Try JSON first, then plain text
  try {
    const data = JSON.parse(body)
    if (Array.isArray(data)) return data
    if (data.updates) return data.updates
    if (data.entries) return data.entries
    return [data]
  } catch {
    // Parse plain text format: "container1: Updated, container2: Fresh"
    const updates: WatchtowerUpdate[] = []
    const lines = body.split(/[,\n]/).map(l => l.trim()).filter(Boolean)

    for (const line of lines) {
      const match = line.match(/^(.+?):\s*(.+)$/)
      if (match) {
        updates.push({
          name: match[1].trim(),
          currentImage: '',
          latestImage: '',
          state: match[2].trim() as any,
        })
      }
    }

    return updates
  }
}

function generateUpdateContent(updates: WatchtowerUpdate[]): string {
  const updatedContainers = updates.filter(u => u.state === 'Updated')
  const failedContainers = updates.filter(u => u.state === 'Failed')
  const freshContainers = updates.filter(u => u.state === 'Fresh')

  let content = '<h4>Container Update Summary</h4>'

  if (updatedContainers.length > 0) {
    content += '<p><strong>Updated:</strong></p><ul>'
    for (const u of updatedContainers) {
      content += `<li>🔄 <strong>${u.name}</strong>`
      if (u.currentImage && u.latestImage) {
        content += `<br/><code>${u.currentImage}</code> → <code>${u.latestImage}</code>`
      }
      content += '</li>'
    }
    content += '</ul>'
  }

  if (failedContainers.length > 0) {
    content += '<p><strong>Failed:</strong></p><ul>'
    for (const u of failedContainers) {
      content += `<li>❌ <strong>${u.name}</strong>`
      if (u.error) content += `<br/>Error: ${u.error}`
      content += '</li>'
    }
    content += '</ul>'
  }

  if (freshContainers.length > 0) {
    content += `<p><em>${freshContainers.length} container(s) already up to date</em></p>`
  }

  return content
}

export async function POST(request: NextRequest) {
  const headersList = headers()
  const rawBody = await request.text()

  // Log the webhook
  const webhookLog = await prisma.webhookLog.create({
    data: {
      source: 'watchtower',
      eventType: 'update',
      payload: rawBody,
      ipAddress: headersList.get('x-forwarded-for') || 'unknown',
    },
  })

  try {
    const updates = parseWatchtowerPayload(rawBody)

    if (updates.length === 0) {
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { processed: true, error: 'No updates in payload' },
      })
      return NextResponse.json({ success: true, message: 'No updates to process' })
    }

    const updatedContainers = updates.filter(u => u.state === 'Updated')
    const failedContainers = updates.filter(u => u.state === 'Failed')

    // Only create an event if there were actual updates or failures
    if (updatedContainers.length === 0 && failedContainers.length === 0) {
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { processed: true },
      })
      return NextResponse.json({ success: true, message: 'All containers up to date' })
    }

    const hasFailures = failedContainers.length > 0
    const containerNames = updatedContainers.map(u => u.name)

    const title = hasFailures
      ? `Container Updates: ${updatedContainers.length} updated, ${failedContainers.length} failed`
      : `${updatedContainers.length} container${updatedContainers.length !== 1 ? 's' : ''} updated`

    const tags = [
      'watchtower',
      'docker',
      'automated',
      hasFailures ? 'failed' : 'success',
      ...containerNames.slice(0, 5), // Include first 5 container names as tags
    ]

    const event = await prisma.event.create({
      data: {
        title,
        date: new Date(),
        content: generateUpdateContent(updates),
        category: hasFailures ? 'fix' : 'service',
        icon: hasFailures ? 'AlertTriangle' : 'RefreshCw',
        tags: JSON.stringify(tags),
        source: 'watchtower',
        sourceRef: webhookLog.id,
        services: JSON.stringify(containerNames),
      },
    })

    // Update webhook log
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: { processed: true, eventId: event.id },
    })

    return NextResponse.json({
      success: true,
      eventId: event.id,
      message: `Created event for ${updatedContainers.length} container update(s)`
    })

  } catch (error: any) {
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: { error: error.message },
    })

    console.error('Watchtower webhook error:', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
