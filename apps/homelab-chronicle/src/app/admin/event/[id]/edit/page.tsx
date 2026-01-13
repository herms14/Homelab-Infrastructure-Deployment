import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { EventForm } from '@/components/admin/EventForm'

async function getEvent(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { images: true },
  })

  return event
}

export default async function EditEventPage({
  params,
}: {
  params: { id: string }
}) {
  const event = await getEvent(params.id)

  if (!event) {
    notFound()
  }

  // Transform event for the form
  const eventData = {
    id: event.id,
    title: event.title,
    date: event.date.toISOString(),
    content: event.content,
    category: event.category,
    tags: event.tags || '[]',
    services: event.services || '[]',
    infrastructureNode: event.infrastructureNode,
    source: event.source,
    sourceRef: event.sourceRef,
    images: event.images.map(img => ({
      id: img.id,
      path: img.path,
      altText: img.altText,
      imageType: img.imageType,
    })),
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={`/event/${event.id}`}
        className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Event
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Event</h1>
        <p className="text-muted-foreground mt-1">
          Update the details for &quot;{event.title}&quot;
        </p>
      </div>

      <EventForm event={eventData} mode="edit" />
    </div>
  )
}
