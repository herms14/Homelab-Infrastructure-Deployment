import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const limit = searchParams.get('limit')

  const where: any = {}

  if (category && category !== 'all') {
    where.category = category
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ]
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: { date: 'desc' },
    take: limit ? parseInt(limit) : undefined,
    include: {
      images: true,
    },
  })

  return NextResponse.json(events)
}

export async function POST(request: NextRequest) {
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
      images: uploadedImages // Array of uploaded image info {path, filename, altText, imageType}
    } = body

    const event = await prisma.event.create({
      data: {
        title,
        date: new Date(date),
        content,
        category,
        icon,
        tags: JSON.stringify(tags || []),
        source: source || 'manual',
        sourceRef,
        services: JSON.stringify(services || []),
        infrastructureNode: infrastructureNode || null,
      },
    })

    // Create image records for uploaded files
    if (uploadedImages && uploadedImages.length > 0) {
      for (const img of uploadedImages) {
        // Skip if this image already has an ID (was already in the database)
        if (img.id) {
          // Update existing image to link to this event
          await prisma.image.update({
            where: { id: img.id },
            data: { eventId: event.id },
          })
        } else if (img.path) {
          // Create new image record
          await prisma.image.create({
            data: {
              filename: img.filename || img.path.split('/').pop() || 'image',
              path: img.path,
              altText: img.altText || null,
              imageType: img.imageType || 'general',
              eventId: event.id,
            },
          })
        }
      }
    }

    // Fetch the event with images included
    const eventWithImages = await prisma.event.findUnique({
      where: { id: event.id },
      include: { images: true },
    })

    return NextResponse.json(eventWithImages, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
