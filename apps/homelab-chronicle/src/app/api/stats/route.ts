import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Statistics API - Returns aggregate data for the dashboard

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'all' // 'week', 'month', 'year', 'all'

  // Calculate date range
  let startDate: Date | null = null
  const now = new Date()

  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      break
    case 'year':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      break
  }

  const dateFilter = startDate ? { date: { gte: startDate } } : {}

  // Get all events in the period
  const events = await prisma.event.findMany({
    where: dateFilter,
    select: {
      id: true,
      date: true,
      category: true,
      tags: true,
      source: true,
      services: true,
      infrastructureNode: true,
    },
  })

  // Calculate statistics
  const totalEvents = events.length

  // Events by category
  const byCategory: Record<string, number> = {}
  events.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + 1
  })

  // Events by source
  const bySource: Record<string, number> = {}
  events.forEach(e => {
    const source = e.source || 'manual'
    bySource[source] = (bySource[source] || 0) + 1
  })

  // Events by month (for heatmap/chart)
  const byMonth: Record<string, number> = {}
  events.forEach(e => {
    const d = new Date(e.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    byMonth[key] = (byMonth[key] || 0) + 1
  })

  // Events by day of week
  const byDayOfWeek: number[] = [0, 0, 0, 0, 0, 0, 0] // Sun-Sat
  events.forEach(e => {
    const d = new Date(e.date)
    byDayOfWeek[d.getDay()]++
  })

  // Most active tags
  const tagCounts: Record<string, number> = {}
  events.forEach(e => {
    try {
      const tags = JSON.parse(e.tags || '[]')
      tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    } catch {}
  })
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }))

  // Most affected services
  const serviceCounts: Record<string, number> = {}
  events.forEach(e => {
    try {
      const services = JSON.parse(e.services || '[]')
      services.forEach((service: string) => {
        serviceCounts[service] = (serviceCounts[service] || 0) + 1
      })
    } catch {}
  })
  const topServices = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([service, count]) => ({ service, count }))

  // Infrastructure node activity
  const nodeCounts: Record<string, number> = {}
  events.forEach(e => {
    if (e.infrastructureNode) {
      nodeCounts[e.infrastructureNode] = (nodeCounts[e.infrastructureNode] || 0) + 1
    }
  })

  // Heatmap data (day x hour) - requires more granular data
  const heatmapData: number[][] = Array(7).fill(null).map(() => Array(24).fill(0))
  events.forEach(e => {
    const d = new Date(e.date)
    heatmapData[d.getDay()][d.getHours()]++
  })

  // Recent activity streak
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  let checkDate = new Date(today)

  while (true) {
    const dayStart = new Date(checkDate)
    const dayEnd = new Date(checkDate)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const hasEvent = events.some(e => {
      const eventDate = new Date(e.date)
      return eventDate >= dayStart && eventDate < dayEnd
    })

    if (hasEvent) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  // Busiest day ever
  const dayEventCounts: Record<string, number> = {}
  events.forEach(e => {
    const d = new Date(e.date)
    const key = d.toISOString().split('T')[0]
    dayEventCounts[key] = (dayEventCounts[key] || 0) + 1
  })
  const busiestDay = Object.entries(dayEventCounts)
    .sort((a, b) => b[1] - a[1])[0]

  return NextResponse.json({
    period,
    totalEvents,
    byCategory,
    bySource,
    byMonth,
    byDayOfWeek,
    topTags,
    topServices,
    nodeCounts,
    heatmapData,
    streak,
    busiestDay: busiestDay ? { date: busiestDay[0], count: busiestDay[1] } : null,
    dateRange: {
      start: startDate?.toISOString() || null,
      end: now.toISOString(),
    },
  })
}
