import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { images: true },
  })

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  return NextResponse.json(event)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      title,
      date,
      content,
      category,
      icon,
      tags,
      source,
      sourceRef,
      services,
      infrastructureNode,
      images: uploadedImages
    } = body

    const event = await prisma.event.update({
      where: { id: params.id },
      data: {
        title,
        date: new Date(date),
        content,
        category,
        icon,
        tags: JSON.stringify(tags || []),
        source,
        sourceRef,
        services: JSON.stringify(services || []),
        infrastructureNode: infrastructureNode || null,
      },
    })

    // Handle images - create new records for images without IDs
    if (uploadedImages && uploadedImages.length > 0) {
      for (const img of uploadedImages) {
        if (!img.id && img.path) {
          // Create new image record for newly uploaded images
          await prisma.image.create({
            data: {
              filename: img.filename || img.path.split('/').pop() || 'image',
              path: img.path,
              altText: img.altText || null,
              imageType: img.imageType || 'general',
              eventId: params.id,
            },
          })
        }
      }
    }

    // Fetch updated event with images
    const updatedEvent = await prisma.event.findUnique({
      where: { id: params.id },
      include: { images: true },
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Delete associated images first (cascade should handle this, but be explicit)
    await prisma.image.deleteMany({
      where: { eventId: params.id },
    })

    await prisma.event.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
