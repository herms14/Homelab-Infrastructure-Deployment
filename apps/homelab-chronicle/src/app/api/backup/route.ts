import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// Backup API - Create and restore database backups

const BACKUP_DIR = process.env.BACKUP_DIR || '/data/backups'

// GET - List all backups
export async function GET(request: NextRequest) {
  const backups = await prisma.backup.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(backups.map(b => ({
    ...b,
    metadata: JSON.parse(b.metadata || '{}'),
  })))
}

// POST - Create a new backup
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { type = 'manual' } = body

    // Create backup directory if needed
    if (!existsSync(BACKUP_DIR)) {
      await mkdir(BACKUP_DIR, { recursive: true })
    }

    // Get all data
    const [events, images, attachments, templates, categories, webhookLogs, infraNodes] = await Promise.all([
      prisma.event.findMany({
        include: {
          images: true,
          attachments: true,
          versions: true,
          linkedTo: true,
          linkedFrom: true,
        },
      }),
      prisma.image.findMany(),
      prisma.attachment.findMany(),
      prisma.eventTemplate.findMany(),
      prisma.category.findMany(),
      prisma.webhookLog.findMany({ take: 1000 }), // Last 1000 webhook logs
      prisma.infrastructureNode.findMany(),
    ])

    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      type,
      counts: {
        events: events.length,
        images: images.length,
        attachments: attachments.length,
        templates: templates.length,
        categories: categories.length,
        webhookLogs: webhookLogs.length,
        infrastructureNodes: infraNodes.length,
      },
      data: {
        events,
        images,
        attachments,
        templates,
        categories,
        webhookLogs,
        infrastructureNodes: infraNodes,
      },
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `chronicle-backup-${type}-${timestamp}.json`
    const filepath = path.join(BACKUP_DIR, filename)

    // Write backup file
    const content = JSON.stringify(backupData, null, 2)
    await writeFile(filepath, content)

    // Record backup in database
    const backup = await prisma.backup.create({
      data: {
        filename,
        path: filepath,
        size: Buffer.byteLength(content),
        type,
        status: 'completed',
        metadata: JSON.stringify(backupData.counts),
      },
    })

    return NextResponse.json({
      success: true,
      backup: {
        ...backup,
        metadata: backupData.counts,
      },
    })

  } catch (error: any) {
    console.error('Backup error:', error)

    // Record failed backup
    await prisma.backup.create({
      data: {
        filename: `failed-${Date.now()}`,
        path: '',
        size: 0,
        type: 'manual',
        status: 'failed',
        error: error.message,
      },
    })

    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 })
  }
}

// PUT - Restore from backup
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { backupId, options = {} } = body

    const {
      restoreEvents = true,
      restoreTemplates = true,
      restoreCategories = true,
      restoreInfrastructure = true,
      clearExisting = false,
    } = options

    // Get backup record
    const backup = await prisma.backup.findUnique({
      where: { id: backupId },
    })

    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    // Read backup file
    const content = await readFile(backup.path, 'utf-8')
    const backupData = JSON.parse(content)

    const results = {
      eventsRestored: 0,
      templatesRestored: 0,
      categoriesRestored: 0,
      infrastructureRestored: 0,
      errors: [] as string[],
    }

    // Clear existing data if requested
    if (clearExisting) {
      if (restoreEvents) {
        await prisma.event.deleteMany()
      }
      if (restoreTemplates) {
        await prisma.eventTemplate.deleteMany({ where: { isBuiltIn: false } })
      }
      if (restoreCategories) {
        await prisma.category.deleteMany()
      }
      if (restoreInfrastructure) {
        await prisma.infrastructureNode.deleteMany()
      }
    }

    // Restore events
    if (restoreEvents && backupData.data.events) {
      for (const event of backupData.data.events) {
        try {
          const { images, attachments, versions, linkedTo, linkedFrom, ...eventData } = event
          await prisma.event.upsert({
            where: { id: event.id },
            update: eventData,
            create: eventData,
          })
          results.eventsRestored++
        } catch (error: any) {
          results.errors.push(`Event ${event.id}: ${error.message}`)
        }
      }
    }

    // Restore templates
    if (restoreTemplates && backupData.data.templates) {
      for (const template of backupData.data.templates) {
        try {
          await prisma.eventTemplate.upsert({
            where: { name: template.name },
            update: template,
            create: template,
          })
          results.templatesRestored++
        } catch (error: any) {
          results.errors.push(`Template ${template.name}: ${error.message}`)
        }
      }
    }

    // Restore categories
    if (restoreCategories && backupData.data.categories) {
      for (const category of backupData.data.categories) {
        try {
          await prisma.category.upsert({
            where: { name: category.name },
            update: category,
            create: category,
          })
          results.categoriesRestored++
        } catch (error: any) {
          results.errors.push(`Category ${category.name}: ${error.message}`)
        }
      }
    }

    // Restore infrastructure nodes
    if (restoreInfrastructure && backupData.data.infrastructureNodes) {
      for (const node of backupData.data.infrastructureNodes) {
        try {
          await prisma.infrastructureNode.upsert({
            where: { name: node.name },
            update: node,
            create: node,
          })
          results.infrastructureRestored++
        } catch (error: any) {
          results.errors.push(`Node ${node.name}: ${error.message}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
    })

  } catch (error: any) {
    console.error('Restore error:', error)
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 500 })
  }
}
