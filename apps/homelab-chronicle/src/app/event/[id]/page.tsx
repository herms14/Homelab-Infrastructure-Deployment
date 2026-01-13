import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Server,
  Box,
  Trophy,
  Wrench,
  FileText,
  Network,
  HardDrive,
  Calendar,
  ArrowLeft,
  Edit,
  ExternalLink,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { categoryColors, formatDate } from '@/lib/utils'

const iconMap: Record<string, any> = {
  infrastructure: Server,
  service: Box,
  milestone: Trophy,
  fix: Wrench,
  documentation: FileText,
  network: Network,
  storage: HardDrive,
}

async function getEvent(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { images: true },
  })

  return event
}

async function getRelatedEvents(currentId: string, category: string) {
  const events = await prisma.event.findMany({
    where: {
      category,
      id: { not: currentId },
    },
    orderBy: { date: 'desc' },
    take: 3,
  })

  return events
}

export default async function EventPage({
  params,
}: {
  params: { id: string }
}) {
  const event = await getEvent(params.id)

  if (!event) {
    notFound()
  }

  const relatedEvents = await getRelatedEvents(event.id, event.category)
  const Icon = iconMap[event.category] || Box
  const color = categoryColors[event.category] || '#6b7280'
  const tags = JSON.parse(event.tags || '[]') as string[]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Timeline
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="h-8 w-8" style={{ color }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{event.title}</h1>
              <div className="flex items-center gap-3 mt-2 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(event.date)}</span>
                </div>
                <Badge
                  variant="secondary"
                  className="capitalize"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color,
                  }}
                >
                  {event.category}
                </Badge>
              </div>
            </div>
          </div>

          <Link href={`/admin/event/${event.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {tags.map(tag => (
              <span
                key={tag}
                className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <Card className="p-6 mb-8">
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: event.content }}
        />
      </Card>

      {/* Images */}
      {event.images.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Images</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {event.images.map(image => (
              <a
                key={image.id}
                href={image.path}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-video rounded-lg overflow-hidden border"
              >
                <Image
                  src={image.path}
                  alt={image.altText || event.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ExternalLink className="h-6 w-6 text-white" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Source info */}
      {event.source && event.source !== 'manual' && (
        <div className="mb-8 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <span className="font-medium">Source:</span> {event.source}
          {event.sourceRef && (
            <>
              {' '}&middot;{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{event.sourceRef}</code>
            </>
          )}
        </div>
      )}

      {/* Related events */}
      {relatedEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Related Events</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {relatedEvents.map(relatedEvent => {
              const RelatedIcon = iconMap[relatedEvent.category] || Box
              const relatedColor = categoryColors[relatedEvent.category] || '#6b7280'

              return (
                <Link key={relatedEvent.id} href={`/event/${relatedEvent.id}`}>
                  <Card className="p-4 hover:shadow-lg transition-all hover:border-primary/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="p-1.5 rounded"
                        style={{ backgroundColor: `${relatedColor}20` }}
                      >
                        <RelatedIcon className="h-3 w-3" style={{ color: relatedColor }} />
                      </div>
                      <span className="text-sm font-medium line-clamp-1">
                        {relatedEvent.title}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(relatedEvent.date)}
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
