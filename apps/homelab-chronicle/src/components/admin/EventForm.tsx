'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Server,
  Box,
  Trophy,
  Wrench,
  FileText,
  Network,
  HardDrive,
  X,
  Upload,
  Loader2,
  ImageIcon,
  Camera,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TipTapEditor } from '@/components/editor/TipTapEditor'
import { categoryColors } from '@/lib/utils'

const categories = [
  { value: 'infrastructure', label: 'Infrastructure', icon: Server },
  { value: 'service', label: 'Service', icon: Box },
  { value: 'milestone', label: 'Milestone', icon: Trophy },
  { value: 'fix', label: 'Fix', icon: Wrench },
  { value: 'documentation', label: 'Documentation', icon: FileText },
  { value: 'network', label: 'Network', icon: Network },
  { value: 'storage', label: 'Storage', icon: HardDrive },
]

const imageTypes = [
  { value: 'general', label: 'General' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'diagram', label: 'Diagram' },
]

interface EventFormProps {
  event?: {
    id: string
    title: string
    date: string | Date
    content: string
    category: string
    tags: string
    services?: string
    infrastructureNode?: string | null
    source?: string | null
    sourceRef?: string | null
    images?: Array<{ id: string; path: string; altText?: string | null; imageType?: string }>
  }
  mode: 'create' | 'edit'
}

export function EventForm({ event, mode }: EventFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Form state
  const [title, setTitle] = useState(event?.title || '')
  const [date, setDate] = useState(
    event?.date
      ? new Date(event.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [content, setContent] = useState(event?.content || '')
  const [category, setCategory] = useState(event?.category || 'service')
  const [tagsInput, setTagsInput] = useState(
    event?.tags ? JSON.parse(event.tags).join(', ') : ''
  )
  const [servicesInput, setServicesInput] = useState(
    event?.services ? JSON.parse(event.services).join(', ') : ''
  )
  const [infrastructureNode, setInfrastructureNode] = useState(event?.infrastructureNode || '')
  const [source, setSource] = useState(event?.source || 'manual')
  const [sourceRef, setSourceRef] = useState(event?.sourceRef || '')
  const [images, setImages] = useState<
    Array<{ id?: string; path: string; altText?: string; imageType?: string }>
  >(event?.images?.map(img => ({ ...img, altText: img.altText || undefined, imageType: img.imageType || 'general' })) || [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const tags = tagsInput
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean)

    const services = servicesInput
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)

    const eventData = {
      title,
      date,
      content,
      category,
      tags,
      services,
      infrastructureNode: infrastructureNode || null,
      source,
      sourceRef: sourceRef || null,
      images, // Send full image array with path, filename, altText, imageType
    }

    try {
      const url =
        mode === 'create' ? '/api/events' : `/api/events/${event?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        throw new Error('Failed to save event')
      }

      const savedEvent = await response.json()

      router.push(`/event/${savedEvent.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error saving event:', error)
      alert('Failed to save event. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true)

    for (const file of Array.from(files)) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
      if (!allowedTypes.includes(file.type)) {
        alert(`Invalid file type: ${file.name}. Allowed: JPEG, PNG, GIF, WebP, SVG`)
        continue
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File too large: ${file.name}. Maximum size: 10MB`)
        continue
      }

      const formData = new FormData()
      formData.append('file', file)

      if (mode === 'edit' && event?.id) {
        formData.append('eventId', event.id)
      }

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to upload image')
        }

        const uploadedImage = await response.json()
        setImages(prev => [...prev, { ...uploadedImage, imageType: 'general' }])
      } catch (error) {
        console.error('Error uploading file:', error)
        alert(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    await uploadFiles(files)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await uploadFiles(files)
    }
  }

  const updateImageType = (index: number, imageType: string) => {
    setImages(prev => prev.map((img, i) =>
      i === index ? { ...img, imageType } : img
    ))
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleDelete = async () => {
    if (!event?.id) return

    if (!confirm('Are you sure you want to delete this event?')) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }

      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What happened?"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => {
                    const Icon = cat.icon
                    const color = categoryColors[cat.value] || '#6b7280'
                    return (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <Icon
                            className="h-4 w-4"
                            style={{ color }}
                          />
                          <span>{cat.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="proxmox, kubernetes, docker (comma separated)"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="services">Services</Label>
              <Input
                id="services"
                value={servicesInput}
                onChange={e => setServicesInput(e.target.value)}
                placeholder="Traefik, Prometheus, Grafana (comma separated)"
              />
              <p className="text-xs text-muted-foreground">Services affected by this event</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="infrastructureNode">Infrastructure Node</Label>
              <Input
                id="infrastructureNode"
                value={infrastructureNode}
                onChange={e => setInfrastructureNode(e.target.value)}
                placeholder="node01, docker-media, traefik-lxc"
              />
              <p className="text-xs text-muted-foreground">Host or node this event relates to</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          <TipTapEditor
            content={content}
            onChange={setContent}
            placeholder="Describe the event in detail..."
          />
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Images
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag and Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              multiple
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              {uploading ? (
                <>
                  <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </>
              ) : (
                <>
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag and drop images here, or
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Browse Files
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPEG, PNG, GIF, WebP, SVG up to 10MB
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Uploaded Images Grid */}
          {images.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{images.length} image{images.length !== 1 ? 's' : ''} uploaded</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <div
                    key={image.id || index}
                    className="relative group rounded-lg overflow-hidden border bg-muted"
                  >
                    <div className="aspect-video">
                      <img
                        src={image.path}
                        alt={image.altText || 'Event image'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Image Controls */}
                    <div className="p-2 bg-background border-t">
                      <div className="flex items-center justify-between gap-2">
                        <Select
                          value={image.imageType || 'general'}
                          onValueChange={(value) => updateImageType(index, value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {imageTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeImage(index)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Hover overlay for full view */}
                    <a
                      href={image.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-auto"
                      style={{ bottom: '52px' }}
                    >
                      <span className="text-white text-sm font-medium">View Full Size</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Source */}
      <Card>
        <CardHeader>
          <CardTitle>Source Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="git">Git Commit</SelectItem>
                  <SelectItem value="changelog">Changelog</SelectItem>
                  <SelectItem value="import">Import</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceRef">Source Reference</Label>
              <Input
                id="sourceRef"
                value={sourceRef}
                onChange={e => setSourceRef(e.target.value)}
                placeholder="Git SHA, CHANGELOG line, etc."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          {mode === 'edit' && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              Delete Event
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {mode === 'create' ? 'Create Event' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  )
}
