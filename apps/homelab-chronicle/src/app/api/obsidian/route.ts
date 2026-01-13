import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

// Obsidian Sync API
// Syncs events to/from Obsidian vault via Local REST API plugin

const OBSIDIAN_API_URL = process.env.OBSIDIAN_API_URL || 'http://100.90.207.58:27123'
const OBSIDIAN_API_KEY = process.env.OBSIDIAN_API_KEY || ''
const OBSIDIAN_VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH || '07 HomeLab Things/Chronicle'

// GET - Get sync status
export async function GET(request: NextRequest) {
  const syncStates = await prisma.obsidianSyncState.findMany({
    orderBy: { lastSyncedAt: 'desc' },
  })

  const events = await prisma.event.findMany({
    select: { id: true, title: true, updatedAt: true },
  })

  // Check sync status for each event
  const syncStatus = events.map(event => {
    const state = syncStates.find(s => s.eventId === event.id)
    return {
      eventId: event.id,
      title: event.title,
      lastEventUpdate: event.updatedAt,
      lastSynced: state?.lastSyncedAt || null,
      obsidianPath: state?.obsidianPath || null,
      needsSync: state ? new Date(event.updatedAt) > new Date(state.lastSyncedAt) : true,
    }
  })

  return NextResponse.json({
    totalEvents: events.length,
    synced: syncStates.length,
    needsSync: syncStatus.filter(s => s.needsSync).length,
    status: syncStatus,
  })
}

// POST - Sync events to Obsidian
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { eventIds, direction = 'to_obsidian' } = body

  if (!OBSIDIAN_API_KEY) {
    return NextResponse.json({ error: 'Obsidian API key not configured' }, { status: 500 })
  }

  const results = {
    synced: 0,
    failed: 0,
    errors: [] as string[],
  }

  // Get events to sync
  const where = eventIds ? { id: { in: eventIds } } : {}
  const events = await prisma.event.findMany({
    where,
    include: {
      images: true,
    },
  })

  for (const event of events) {
    try {
      if (direction === 'to_obsidian') {
        await syncEventToObsidian(event)
        results.synced++
      } else if (direction === 'from_obsidian') {
        // TODO: Implement sync from Obsidian
        results.errors.push(`Sync from Obsidian not yet implemented`)
      }
    } catch (error: any) {
      results.failed++
      results.errors.push(`${event.title}: ${error.message}`)
    }
  }

  return NextResponse.json({
    success: true,
    results,
  })
}

async function syncEventToObsidian(event: any) {
  // Convert event to markdown
  const markdown = eventToMarkdown(event)
  const checksum = crypto.createHash('md5').update(markdown).digest('hex')

  // Generate path
  const date = new Date(event.date)
  const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  const filename = sanitizeFilename(event.title)
  const obsidianPath = `${OBSIDIAN_VAULT_PATH}/${yearMonth}/${filename}.md`

  // Send to Obsidian via REST API
  const response = await fetch(`${OBSIDIAN_API_URL}/vault/${encodeURIComponent(obsidianPath)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${OBSIDIAN_API_KEY}`,
      'Content-Type': 'text/markdown',
    },
    body: markdown,
  })

  if (!response.ok) {
    throw new Error(`Obsidian API error: ${response.status}`)
  }

  // Update sync state
  await prisma.obsidianSyncState.upsert({
    where: { eventId: event.id },
    update: {
      obsidianPath,
      lastSyncedAt: new Date(),
      syncDirection: 'to_obsidian',
      checksum,
    },
    create: {
      eventId: event.id,
      obsidianPath,
      lastSyncedAt: new Date(),
      syncDirection: 'to_obsidian',
      checksum,
    },
  })
}

function eventToMarkdown(event: any): string {
  const tags = JSON.parse(event.tags || '[]')
  const services = JSON.parse(event.services || '[]')

  let md = `---
title: "${event.title.replace(/"/g, '\\"')}"
date: ${new Date(event.date).toISOString().split('T')[0]}
category: ${event.category}
source: ${event.source || 'manual'}
chronicle_id: ${event.id}
tags:
${tags.map((t: string) => `  - ${t}`).join('\n')}
---

# ${event.title}

**Date:** ${new Date(event.date).toLocaleDateString()}
**Category:** ${event.category}
${event.infrastructureNode ? `**Infrastructure:** ${event.infrastructureNode}` : ''}
${services.length > 0 ? `**Services:** ${services.join(', ')}` : ''}

---

`

  // Convert HTML content to markdown
  let content = event.content
    .replace(/<h1>/g, '# ').replace(/<\/h1>/g, '\n\n')
    .replace(/<h2>/g, '## ').replace(/<\/h2>/g, '\n\n')
    .replace(/<h3>/g, '### ').replace(/<\/h3>/g, '\n\n')
    .replace(/<h4>/g, '#### ').replace(/<\/h4>/g, '\n\n')
    .replace(/<p>/g, '').replace(/<\/p>/g, '\n\n')
    .replace(/<strong>/g, '**').replace(/<\/strong>/g, '**')
    .replace(/<em>/g, '*').replace(/<\/em>/g, '*')
    .replace(/<code>/g, '`').replace(/<\/code>/g, '`')
    .replace(/<pre>/g, '```\n').replace(/<\/pre>/g, '\n```\n')
    .replace(/<ul>/g, '').replace(/<\/ul>/g, '\n')
    .replace(/<ol>/g, '').replace(/<\/ol>/g, '\n')
    .replace(/<li>/g, '- ').replace(/<\/li>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g, '[$2]($1)')
    .replace(/<[^>]+>/g, '')

  md += content.trim()

  // Add images if any
  if (event.images && event.images.length > 0) {
    md += '\n\n## Images\n\n'
    for (const img of event.images) {
      md += `![${img.altText || img.filename}](${img.path})\n`
    }
  }

  md += `\n\n---\n*Synced from Homelab Chronicle*\n`

  return md
}

function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100)
}
