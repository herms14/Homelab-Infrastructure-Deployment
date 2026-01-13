'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Server,
  Wrench,
  Star,
  Bug,
  FileQuestion,
  Network,
  HardDrive,
  X,
} from 'lucide-react'
import Link from 'next/link'

interface EventTemplate {
  id: string
  name: string
  description: string | null
  category: string
  icon: string | null
  tags: string[]
  content: string
  services: string[]
  isBuiltIn: boolean
  createdAt: string
  updatedAt: string
}

const CATEGORIES = [
  { value: 'infrastructure', label: 'Infrastructure', icon: Server, color: 'bg-blue-500' },
  { value: 'service', label: 'Service', icon: Wrench, color: 'bg-green-500' },
  { value: 'milestone', label: 'Milestone', icon: Star, color: 'bg-purple-500' },
  { value: 'fix', label: 'Fix', icon: Bug, color: 'bg-red-500' },
  { value: 'documentation', label: 'Documentation', icon: FileQuestion, color: 'bg-yellow-500' },
  { value: 'network', label: 'Network', icon: Network, color: 'bg-cyan-500' },
  { value: 'storage', label: 'Storage', icon: HardDrive, color: 'bg-orange-500' },
]

const CATEGORY_COLORS: Record<string, string> = {
  infrastructure: 'bg-blue-500',
  service: 'bg-green-500',
  milestone: 'bg-purple-500',
  fix: 'bg-red-500',
  documentation: 'bg-yellow-500',
  network: 'bg-cyan-500',
  storage: 'bg-orange-500',
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<EventTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EventTemplate | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'infrastructure',
    icon: '',
    tags: '',
    content: '',
    services: '',
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates')
      const data = await response.json()
      setTemplates(data)
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (template?: EventTemplate) => {
    if (template) {
      setEditingTemplate(template)
      setFormData({
        name: template.name,
        description: template.description || '',
        category: template.category,
        icon: template.icon || '',
        tags: template.tags.join(', '),
        content: template.content,
        services: template.services.join(', '),
      })
    } else {
      setEditingTemplate(null)
      setFormData({
        name: '',
        description: '',
        category: 'infrastructure',
        icon: '',
        tags: '',
        content: '',
        services: '',
      })
    }
    setShowDialog(true)
  }

  const handleCloseDialog = () => {
    setShowDialog(false)
    setEditingTemplate(null)
    setFormData({
      name: '',
      description: '',
      category: 'infrastructure',
      icon: '',
      tags: '',
      content: '',
      services: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      icon: formData.icon || null,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      content: formData.content,
      services: formData.services.split(',').map(s => s.trim()).filter(Boolean),
    }

    try {
      if (editingTemplate) {
        await fetch('/api/templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTemplate.id, ...payload }),
        })
      } else {
        await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      handleCloseDialog()
      fetchTemplates()
    } catch (error) {
      console.error('Failed to save template:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/templates?id=${id}`, { method: 'DELETE' })
      setDeleteConfirm(null)
      fetchTemplates()
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const handleUseTemplate = (template: EventTemplate) => {
    // Navigate to new event page with template data as query params
    const params = new URLSearchParams({
      template: template.id,
    })
    router.push(`/admin/event/new?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const builtInTemplates = templates.filter(t => t.isBuiltIn)
  const customTemplates = templates.filter(t => !t.isBuiltIn)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Event Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage templates for quick event creation
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Built-in Templates */}
      {builtInTemplates.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Built-in Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {builtInTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={() => handleUseTemplate(template)}
                onEdit={() => handleOpenDialog(template)}
                onDelete={() => setDeleteConfirm(template.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Templates */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Custom Templates</h2>
        {customTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={() => handleUseTemplate(template)}
                onEdit={() => handleOpenDialog(template)}
                onDelete={() => setDeleteConfirm(template.id)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No custom templates yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create your first template
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Update your event template'
                : 'Create a reusable template for common events'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Docker Service Deployment"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of when to use this template"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tags">Default Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., docker, deployment, automation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="services">Default Services (comma-separated)</Label>
                <Input
                  id="services"
                  value={formData.services}
                  onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                  placeholder="e.g., traefik, grafana"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content Template</Label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="<p>Enter the default content for this template...</p>&#10;&#10;You can use placeholders like {{SERVICE_NAME}}, {{VERSION}}, {{NODE}}"
                className="w-full h-40 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
              <p className="text-xs text-muted-foreground">
                Supports HTML. Use placeholders like {"{{SERVICE_NAME}}"} for dynamic content.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingTemplate ? 'Save Changes' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TemplateCard({
  template,
  onUse,
  onEdit,
  onDelete,
}: {
  template: EventTemplate
  onUse: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const CategoryIcon = CATEGORIES.find(c => c.value === template.category)?.icon || Server

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${CATEGORY_COLORS[template.category] || 'bg-gray-500'}`}>
              <CategoryIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <Badge variant="outline" className="text-xs mt-1">
                {template.category}
              </Badge>
            </div>
          </div>
          {template.isBuiltIn && (
            <Badge variant="secondary" className="text-xs">
              Built-in
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {template.description}
          </p>
        )}

        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{template.tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1" onClick={onUse}>
            <Copy className="h-3 w-3 mr-1" />
            Use
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          {!template.isBuiltIn && (
            <Button size="sm" variant="outline" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
