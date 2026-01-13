import { Timeline } from '@/components/timeline/Timeline'
import { TimelineFilter } from '@/components/timeline/TimelineFilter'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getEvents(category?: string, search?: string) {
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
    include: {
      images: true,
    },
  })

  return events
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { category?: string; search?: string }
}) {
  const events = await getEvents(searchParams.category, searchParams.search)

  // Group events by year and month
  const groupedEvents = events.reduce((acc, event) => {
    const date = new Date(event.date)
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!acc[yearMonth]) {
      acc[yearMonth] = []
    }
    acc[yearMonth].push(event)

    return acc
  }, {} as Record<string, typeof events>)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mb-4">
          Homelab Chronicle
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          A journey through the evolution of my homelab infrastructure.
          From a simple NAS to a full enterprise-grade cluster.
        </p>
      </div>

      {/* Filter Section */}
      <TimelineFilter
        currentCategory={searchParams.category}
        currentSearch={searchParams.search}
      />

      {/* Timeline */}
      <Timeline groupedEvents={groupedEvents} />

      {/* Empty State */}
      {events.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            No events found. Start documenting your homelab journey!
          </p>
        </div>
      )}
    </div>
  )
}
