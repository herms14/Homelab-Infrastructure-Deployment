'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  Calendar,
  GitCommit,
  Server,
  Tag,
  TrendingUp,
  Flame,
  Clock,
} from 'lucide-react'

interface Stats {
  period: string
  totalEvents: number
  byCategory: Record<string, number>
  bySource: Record<string, number>
  byMonth: Record<string, number>
  byDayOfWeek: number[]
  topTags: Array<{ tag: string; count: number }>
  topServices: Array<{ service: string; count: number }>
  nodeCounts: Record<string, number>
  heatmapData: number[][]
  streak: number
  busiestDay: { date: string; count: number } | null
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [period, setPeriod] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/stats?period=${period}`)
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load stats:', err)
        setLoading(false)
      })
  }, [period])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!stats) {
    return <div className="text-center py-12">Failed to load statistics</div>
  }

  const maxHeatmap = Math.max(...stats.heatmapData.flat(), 1)

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Statistics</h1>
          <p className="text-muted-foreground">Insights into your homelab journey</p>
        </div>
        <div className="flex gap-2">
          {['week', 'month', 'year', 'all'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {p === 'all' ? 'All Time' : `Last ${p}`}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">documented changes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.streak}</div>
            <p className="text-xs text-muted-foreground">consecutive days with events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Busiest Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.busiestDay?.count || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.busiestDay ? new Date(stats.busiestDay.date).toLocaleDateString() : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0] && (
              <>
                <div className="text-xl font-bold capitalize">
                  {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0][0]}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0][1]} events
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Events by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => {
                  const percentage = (count / stats.totalEvents) * 100
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="capitalize text-sm">{category}</span>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full ${CATEGORY_COLORS[category] || 'bg-gray-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        {/* Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCommit className="h-5 w-5" />
              Events by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.bySource)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => {
                  const percentage = (count / stats.totalEvents) * 100
                  return (
                    <div key={source}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="capitalize text-sm">{source}</span>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Heatmap (Day × Hour)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="flex flex-col gap-1">
              {/* Hour labels */}
              <div className="flex ml-12">
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="w-6 text-[10px] text-muted-foreground text-center">
                    {i % 6 === 0 ? `${i}h` : ''}
                  </div>
                ))}
              </div>
              {/* Heatmap grid */}
              {stats.heatmapData.map((dayData, dayIndex) => (
                <div key={dayIndex} className="flex items-center">
                  <span className="w-12 text-xs text-muted-foreground">{DAY_NAMES[dayIndex]}</span>
                  <div className="flex gap-[2px]">
                    {dayData.map((value, hourIndex) => {
                      const intensity = value / maxHeatmap
                      return (
                        <div
                          key={hourIndex}
                          className="w-5 h-5 rounded-sm transition-colors"
                          style={{
                            backgroundColor: value === 0
                              ? 'hsl(var(--muted))'
                              : `rgba(34, 197, 94, ${0.2 + intensity * 0.8})`,
                          }}
                          title={`${DAY_NAMES[dayIndex]} ${hourIndex}:00 - ${value} events`}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags and Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Top Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.topTags.map(({ tag, count }) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-default"
                  style={{
                    fontSize: `${Math.min(0.75 + count * 0.05, 1.25)}rem`,
                  }}
                >
                  {tag} ({count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Most Active Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topServices.map(({ service, count }) => (
                <div key={service} className="flex items-center justify-between">
                  <span className="font-mono text-sm">{service}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Infrastructure Nodes */}
      {Object.keys(stats.nodeCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Events by Infrastructure Node
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(stats.nodeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([node, count]) => (
                  <div
                    key={node}
                    className="p-4 rounded-lg bg-muted/50 text-center"
                  >
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground font-mono">{node}</div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
