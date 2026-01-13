import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Advanced Search API with full-text search and filters

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const query = searchParams.get('q') || ''
  const category = searchParams.get('category')
  const source = searchParams.get('source')
  const tags = searchParams.getAll('tag')
  const services = searchParams.getAll('service')
  const node = searchParams.get('node')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Build filter
  const where: any = {}

  // Text search (title and content)
  if (query) {
    where.OR = [
      { title: { contains: query } },
      { content: { contains: query } },
    ]
  }

  // Category filter
  if (category && category !== 'all') {
    where.category = category
  }

  // Source filter
  if (source && source !== 'all') {
    where.source = source
  }

  // Infrastructure node filter
  if (node) {
    where.infrastructureNode = node
  }

  // Date range filter
  if (startDate) {
    where.date = { ...where.date, gte: new Date(startDate) }
  }
  if (endDate) {
    where.date = { ...where.date, lte: new Date(endDate) }
  }

  // Get events
  let events = await prisma.event.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      images: { take: 1 },
    },
  })

  // Filter by tags (post-query since tags are JSON)
  if (tags.length > 0) {
    events = events.filter(e => {
      const eventTags = JSON.parse(e.tags || '[]')
      return tags.some(tag => eventTags.includes(tag))
    })
  }

  // Filter by services (post-query since services are JSON)
  if (services.length > 0) {
    events = events.filter(e => {
      const eventServices = JSON.parse(e.services || '[]')
      return services.some(service => eventServices.includes(service))
    })
  }

  // Get total count before pagination
  const totalCount = events.length

  // Apply pagination
  const paginatedEvents = events.slice(offset, offset + limit)

  // Get facets for filters
  const allEvents = await prisma.event.findMany({
    select: {
      category: true,
      source: true,
      tags: true,
      services: true,
      infrastructureNode: true,
    },
  })

  // Calculate facets
  const facets = {
    categories: {} as Record<string, number>,
    sources: {} as Record<string, number>,
    tags: {} as Record<string, number>,
    services: {} as Record<string, number>,
    nodes: {} as Record<string, number>,
  }

  allEvents.forEach(e => {
    facets.categories[e.category] = (facets.categories[e.category] || 0) + 1
    if (e.source) {
      facets.sources[e.source] = (facets.sources[e.source] || 0) + 1
    }
    if (e.infrastructureNode) {
      facets.nodes[e.infrastructureNode] = (facets.nodes[e.infrastructureNode] || 0) + 1
    }

    try {
      const eventTags = JSON.parse(e.tags || '[]')
      eventTags.forEach((tag: string) => {
        facets.tags[tag] = (facets.tags[tag] || 0) + 1
      })
    } catch {}

    try {
      const eventServices = JSON.parse(e.services || '[]')
      eventServices.forEach((service: string) => {
        facets.services[service] = (facets.services[service] || 0) + 1
      })
    } catch {}
  })

  return NextResponse.json({
    query,
    filters: { category, source, tags, services, node, startDate, endDate },
    totalCount,
    limit,
    offset,
    events: paginatedEvents.map(e => ({
      ...e,
      tags: JSON.parse(e.tags || '[]'),
      services: JSON.parse(e.services || '[]'),
    })),
    facets: {
      categories: Object.entries(facets.categories).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      sources: Object.entries(facets.sources).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      tags: Object.entries(facets.tags).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 50),
      services: Object.entries(facets.services).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      nodes: Object.entries(facets.nodes).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    },
  })
}
