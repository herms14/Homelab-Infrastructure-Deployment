import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EventForm } from '@/components/admin/EventForm'

export default async function NewEventPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/admin"
        className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Admin
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Event</h1>
        <p className="text-muted-foreground mt-1">
          Add a new milestone to your homelab timeline
        </p>
      </div>

      <EventForm mode="create" />
    </div>
  )
}
