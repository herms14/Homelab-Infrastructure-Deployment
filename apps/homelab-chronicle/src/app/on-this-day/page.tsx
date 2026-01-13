'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, ChevronLeft, ChevronRight, History } from 'lucide-react'
import Link from 'next/link'

interface OnThisDayData {
  date: { month: number; day: number }
  formattedDate: string
  totalEvents: number
  yearCount: number
  byYear: Record<string, Array<{
    id: string
    title: string
    date: string
    category: string
    images: Array<{ path: string }>
  }>>
}

const CATEGORY_COLORS: Record<string, string> = {
  infrastructure: 'bg-blue-500',
  service: 'bg-green-500',
  milestone: 'bg-purple-500',
  fix: 'bg-red-500',
  documentation: 'bg-yellow-500',
  network: 'bg-cyan-500',
  storage: 'bg-orange-500',
}

export default function OnThisDayPage() {
  const [data, setData] = useState<OnThisDayData | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const dateStr = selectedDate.toISOString().split('T')[0]
    fetch(`/api/on-this-day?date=${dateStr}`)
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load data:', err)
        setLoading(false)
      })
  }, [selectedDate])

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const sortedYears = data ? Object.keys(data.byYear).sort((a, b) => parseInt(b) - parseInt(a)) : []

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <History className="h-8 w-8" />
          On This Day
        </h1>
        <p className="text-muted-foreground mt-2">
          See what happened on this date in your homelab history
        </p>
      </div>

      {/* Date Selector */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={goToPreviousDay}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="text-center">
          <div className="text-4xl font-bold">{data?.formattedDate}</div>
          <button
            onClick={goToToday}
            className="text-sm text-primary hover:underline mt-1"
          >
            Go to today
          </button>
        </div>

        <button
          onClick={goToNextDay}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Summary */}
      {data && data.totalEvents > 0 && (
        <div className="text-center">
          <Badge variant="secondary" className="text-lg px-4 py-1">
            {data.totalEvents} event{data.totalEvents !== 1 ? 's' : ''} across {data.yearCount} year{data.yearCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      {/* Events by Year */}
      {data && sortedYears.length > 0 ? (
        <div className="space-y-8">
          {sortedYears.map(year => (
            <div key={year}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                  {year}
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="space-y-4 ml-8">
                {data.byYear[year].map(event => (
                  <Link key={event.id} href={`/event/${event.id}`}>
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                      <CardContent className="p-4 flex gap-4">
                        {event.images?.[0] && (
                          <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={event.images[0].path}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{event.title}</h3>
                            <Badge
                              className={`${CATEGORY_COLORS[event.category] || 'bg-gray-500'} text-white text-xs`}
                            >
                              {event.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {year === new Date().getFullYear().toString()
                              ? 'This year'
                              : `${new Date().getFullYear() - parseInt(year)} year${new Date().getFullYear() - parseInt(year) !== 1 ? 's' : ''} ago`}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No events on this date</p>
          <p className="text-sm text-muted-foreground mt-2">
            Try navigating to a different day
          </p>
        </div>
      )}
    </div>
  )
}
