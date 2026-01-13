import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const eventId = formData.get('eventId') as string
    const altText = formData.get('altText') as string
    const imageType = formData.get('imageType') as string || 'general'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG' }, { status: 400 })
    }

    // Limit file size to 10MB
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size: 10MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create unique filename
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50)
    const filename = `${timestamp}-${sanitizedName}`

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Save file
    const filepath = join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    // Save to database if eventId provided (for editing existing events)
    if (eventId && eventId !== 'pending') {
      const image = await prisma.image.create({
        data: {
          filename,
          path: `/uploads/${filename}`,
          altText: altText || null,
          imageType,
          eventId,
        },
      })

      return NextResponse.json(image, { status: 201 })
    }

    // For new events, just return the file info without creating a database record
    // The image record will be created when the event is created
    return NextResponse.json({
      filename,
      path: `/uploads/${filename}`,
      altText: altText || null,
      imageType,
      // No id - this indicates the image is pending association
    }, { status: 201 })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}

// GET endpoint to retrieve images for an event
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('eventId')

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  }

  const images = await prisma.image.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(images)
}

// DELETE endpoint to remove an image
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageId = searchParams.get('id')

  if (!imageId) {
    return NextResponse.json({ error: 'Image ID required' }, { status: 400 })
  }

  try {
    const image = await prisma.image.delete({
      where: { id: imageId },
    })

    // Optionally delete the file from disk
    // const filepath = join(process.cwd(), 'public', image.path)
    // await unlink(filepath).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
  }
}
