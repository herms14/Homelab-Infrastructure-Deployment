import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// On This Day API - Get events from this date in previous years

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')

  const targetDate = dateParam ? new Date(dateParam) : new Date()
  const month = targetDate.getMonth() + 1
  const day = targetDate.getDate()

  // Get all events
  const allEvents = await prisma.event.findMany({
    orderBy: { date: 'desc' },
    include: {
      images: {
        take: 1,
      },
    },
  })

  // Filter events that match the month and day
  const onThisDay = allEvents.filter(event => {
    const eventDate = new Date(event.date)
    return eventDate.getMonth() + 1 === month && eventDate.getDate() === day
  })

  // Group by year
  const byYear: Record<string, typeof onThisDay> = {}
  onThisDay.forEach(event => {
    const year = new Date(event.date).getFullYear().toString()
    if (!byYear[year]) byYear[year] = []
    byYear[year].push(event)
  })

  return NextResponse.json({
    date: { month, day },
    formattedDate: targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    totalEvents: onThisDay.length,
    yearCount: Object.keys(byYear).length,
    byYear,
    events: onThisDay,
  })
}
