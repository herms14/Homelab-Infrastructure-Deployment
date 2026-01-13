import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// File Attachments API

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/public/uploads/attachments'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// GET - List attachments for an event
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('eventId')

  if (!eventId) {
    return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
  }

  const attachments = await prisma.attachment.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(attachments)
}

// POST - Upload attachment
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const eventId = formData.get('eventId') as string
    const description = formData.get('description') as string | null

    if (!file || !eventId) {
      return NextResponse.json({ error: 'File and eventId are required' }, { status: 400 })
    }

    // Verify event exists
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
    }

    // Create upload directory if needed
    const uploadDir = path.join(UPLOAD_DIR, eventId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const ext = path.extname(file.name)
    const basename = path.basename(file.name, ext)
    const timestamp = Date.now()
    const filename = `${basename}-${timestamp}${ext}`
    const filepath = path.join(uploadDir, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    // Create database record
    const attachment = await prisma.attachment.create({
      data: {
        filename: file.name,
        path: `/uploads/attachments/${eventId}/${filename}`,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        description,
        eventId,
      },
    })

    return NextResponse.json(attachment, { status: 201 })

  } catch (error: any) {
    console.error('Attachment upload error:', error)
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 })
  }
}

// DELETE - Remove attachment
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const attachmentId = searchParams.get('id')

  if (!attachmentId) {
    return NextResponse.json({ error: 'Attachment id is required' }, { status: 400 })
  }

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  })

  if (!attachment) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
  }

  // Delete file from disk
  try {
    const fullPath = path.join(process.cwd(), 'public', attachment.path)
    if (existsSync(fullPath)) {
      await unlink(fullPath)
    }
  } catch (error) {
    console.error('Failed to delete attachment file:', error)
  }

  // Delete database record
  await prisma.attachment.delete({
    where: { id: attachmentId },
  })

  return NextResponse.json({ success: true })
}
