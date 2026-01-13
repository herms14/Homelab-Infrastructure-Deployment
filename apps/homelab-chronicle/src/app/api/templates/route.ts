import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// Event Templates API

// GET - List all templates
export async function GET(request: NextRequest) {
  const templates = await prisma.eventTemplate.findMany({
    orderBy: [
      { isBuiltIn: 'desc' },
      { name: 'asc' },
    ],
  })

  return NextResponse.json(templates.map(t => ({
    ...t,
    tags: JSON.parse(t.tags || '[]'),
    services: JSON.parse(t.services || '[]'),
  })))
}

// POST - Create new template
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, description, category, icon, tags, content, services } = body

    if (!name || !category || !content) {
      return NextResponse.json({ error: 'Name, category, and content are required' }, { status: 400 })
    }

    const template = await prisma.eventTemplate.create({
      data: {
        name,
        description,
        category,
        icon,
        tags: JSON.stringify(tags || []),
        content,
        services: JSON.stringify(services || []),
        isBuiltIn: false,
      },
    })

    return NextResponse.json(template, { status: 201 })

  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Template with this name already exists' }, { status: 409 })
    }
    console.error('Template creation error:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}

// PUT - Update existing template
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, name, description, category, icon, tags, content, services } = body

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    // Check if template exists and is not built-in
    const existing = await prisma.eventTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const template = await prisma.eventTemplate.update({
      where: { id },
      data: {
        name,
        description,
        category,
        icon,
        tags: JSON.stringify(tags || []),
        content,
        services: JSON.stringify(services || []),
      },
    })

    return NextResponse.json({
      ...template,
      tags: JSON.parse(template.tags || '[]'),
      services: JSON.parse(template.services || '[]'),
    })

  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Template with this name already exists' }, { status: 409 })
    }
    console.error('Template update error:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

// DELETE - Remove template
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
  }

  // Check if template exists and is not built-in
  const existing = await prisma.eventTemplate.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  if (existing.isBuiltIn) {
    return NextResponse.json({ error: 'Cannot delete built-in templates' }, { status: 403 })
  }

  await prisma.eventTemplate.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
