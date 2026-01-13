'use client'

import { motion } from 'framer-motion'
import { TimelineEvent } from './TimelineEvent'
import type { Event, Image } from '@prisma/client'

type EventWithImages = Event & { images: Image[] }

interface TimelineProps {
  groupedEvents: Record<string, EventWithImages[]>
}

export function Timeline({ groupedEvents }: TimelineProps) {
  const sortedMonths = Object.keys(groupedEvents).sort((a, b) => b.localeCompare(a))

  return (
    <div className="relative">
      {/* Year navigation sidebar */}
      <div className="hidden lg:block fixed left-4 top-1/2 -translate-y-1/2 z-40">
        <div className="flex flex-col gap-2 p-2 bg-card rounded-lg border shadow-lg">
          {Array.from(new Set(sortedMonths.map(m => m.split('-')[0]))).map(year => (
            <a
              key={year}
              href={`#year-${year}`}
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {year}
            </a>
          ))}
        </div>
      </div>

      {/* Timeline content */}
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="timeline-line" />

        {sortedMonths.map((yearMonth, monthIndex) => {
          const [year, month] = yearMonth.split('-')
          const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' })
          const events = groupedEvents[yearMonth]

          // Check if this is the first month of a new year
          const isNewYear = monthIndex === 0 || !sortedMonths[monthIndex - 1]?.startsWith(year)

          return (
            <div key={yearMonth} className="mb-8">
              {/* Year marker */}
              {isNewYear && (
                <motion.div
                  id={`year-${year}`}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="mb-6"
                >
                  <div className="flex items-center gap-4 -ml-8">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {year.slice(2)}
                    </div>
                    <h2 className="text-2xl font-bold">{year}</h2>
                  </div>
                </motion.div>
              )}

              {/* Month header */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 mb-4"
              >
                <div className="timeline-dot bg-muted-foreground" />
                <h3 className="text-lg font-semibold text-muted-foreground">
                  {monthName}
                </h3>
                <span className="text-sm text-muted-foreground/60">
                  {events.length} event{events.length !== 1 ? 's' : ''}
                </span>
              </motion.div>

              {/* Events for this month */}
              <div className="space-y-4">
                {events.map((event, eventIndex) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: eventIndex * 0.1 }}
                  >
                    <TimelineEvent event={event} />
                  </motion.div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
