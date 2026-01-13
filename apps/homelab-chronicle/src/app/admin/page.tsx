import Link from 'next/link'
import { Plus, List } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Force dynamic rendering - don't try to statically generate this page
export const dynamic = 'force-dynamic'

async function getStats() {
  const [totalEvents, byCategory] = await Promise.all([
    prisma.event.count(),
    prisma.event.groupBy({
      by: ['category'],
      _count: true,
    }),
  ])

  return { totalEvents, byCategory }
}

export default async function AdminPage() {
  const stats = await getStats()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">
            Manage your homelab timeline events
          </p>
        </div>
        <Link href="/admin/event/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Events</CardDescription>
            <CardTitle className="text-4xl">{stats.totalEvents}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Categories Used</CardDescription>
            <CardTitle className="text-4xl">{stats.byCategory.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Most Common</CardDescription>
            <CardTitle className="text-xl capitalize">
              {stats.byCategory.sort((a, b) => b._count - a._count)[0]?.category || 'None'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/event/new">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Create Event</CardTitle>
                  <CardDescription>Add a new timeline event</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <List className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">View Timeline</CardTitle>
                  <CardDescription>Browse all events</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Category breakdown */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Events by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.byCategory.map(({ category, _count }) => (
              <div key={category} className="flex items-center justify-between">
                <span className="capitalize">{category}</span>
                <span className="text-muted-foreground">{_count} events</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
