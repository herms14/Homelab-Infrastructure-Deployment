'use client'

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
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { categoryColors, formatDateShort, stripHtml, truncate } from '@/lib/utils'
import type { Event, Image as ImageModel } from '@prisma/client'

type EventWithImages = Event & { images: ImageModel[] }

const iconMap: Record<string, any> = {
  infrastructure: Server,
  service: Box,
  milestone: Trophy,
  fix: Wrench,
  documentation: FileText,
  network: Network,
  storage: HardDrive,
}

interface TimelineEventProps {
  event: EventWithImages
}

export function TimelineEvent({ event }: TimelineEventProps) {
  const Icon = iconMap[event.category] || Box
  const color = categoryColors[event.category] || '#6b7280'
  const tags = JSON.parse(event.tags || '[]') as string[]
  const excerpt = truncate(stripHtml(event.content), 150)
  const thumbnail = event.images[0]

  return (
    <Link href={`/event/${event.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50 cursor-pointer overflow-hidden">
        <div className="flex">
          {/* Thumbnail (if exists) */}
          {thumbnail && (
            <div className="relative w-32 h-32 flex-shrink-0">
              <Image
                src={thumbnail.path}
                alt={thumbnail.altText || event.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Category icon */}
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>

                  <div>
                    <h4 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                      {event.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDateShort(event.date)}</span>
                    </div>
                  </div>
                </div>

                {/* Category badge */}
                <Badge
                  variant="secondary"
                  className="capitalize"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color,
                    borderColor: `${color}40`,
                  }}
                >
                  {event.category}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Excerpt */}
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {excerpt}
              </p>

              {/* Tags and read more */}
              <div className="flex items-center justify-between">
                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                  {tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{tags.length - 3} more
                    </span>
                  )}
                </div>

                {/* Read more indicator */}
                <div className="flex items-center text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  Read more
                  <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      </Card>
    </Link>
  )
}
