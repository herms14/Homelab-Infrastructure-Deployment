'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Server,
  Box,
  Container,
  Network,
  Database,
  ChevronRight,
  ChevronDown,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

interface InfraNode {
  id: string
  name: string
  type: string
  ip: string | null
  description: string | null
  parentId: string | null
  services: string[]
  metadata: Record<string, any>
  events: Array<{
    id: string
    title: string
    date: string
    category: string
  }>
  eventCount: number
  children?: InfraNode[]
}

interface InfraData {
  nodes: InfraNode[]
  hierarchy: InfraNode[]
  stats: {
    total: number
    byType: Record<string, number>
  }
}

const TYPE_ICONS: Record<string, any> = {
  proxmox: Server,
  vm: Box,
  lxc: Container,
  container: Container,
  service: Database,
}

const TYPE_COLORS: Record<string, string> = {
  proxmox: 'text-blue-500 bg-blue-500/10',
  vm: 'text-green-500 bg-green-500/10',
  lxc: 'text-purple-500 bg-purple-500/10',
  container: 'text-orange-500 bg-orange-500/10',
  service: 'text-cyan-500 bg-cyan-500/10',
}

function NodeCard({ node, expanded, onToggle }: {
  node: InfraNode
  expanded: boolean
  onToggle: () => void
}) {
  const Icon = TYPE_ICONS[node.type] || Server
  const colorClass = TYPE_COLORS[node.type] || 'text-gray-500 bg-gray-500/10'
  const hasChildren = node.children && node.children.length > 0

  return (
    <div className="space-y-2">
      <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={onToggle}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Expand button */}
            <div className="mt-1">
              {hasChildren ? (
                expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )
              ) : (
                <div className="w-4" />
              )}
            </div>

            {/* Icon */}
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{node.name}</h3>
                <Badge variant="outline" className="text-xs">
                  {node.type}
                </Badge>
                {node.eventCount > 0 && (
                  <Badge className="text-xs">
                    {node.eventCount} events
                  </Badge>
                )}
              </div>
              {node.description && (
                <p className="text-sm text-muted-foreground mt-1">{node.description}</p>
              )}
              {node.ip && (
                <p className="text-xs font-mono text-muted-foreground mt-1">{node.ip}</p>
              )}
              {node.services.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {node.services.slice(0, 5).map(service => (
                    <Badge key={service} variant="secondary" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                  {node.services.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{node.services.length - 5} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recent Events */}
          {expanded && node.events.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Recent Events</h4>
              <div className="space-y-2">
                {node.events.slice(0, 5).map(event => (
                  <Link
                    key={event.id}
                    href={`/event/${event.id}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <span className="text-sm">{event.title}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(event.date).toLocaleDateString()}
                      </span>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="ml-8 space-y-2 border-l-2 border-muted pl-4">
          {node.children!.map(child => (
            <NodeCardWrapper key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  )
}

function NodeCardWrapper({ node }: { node: InfraNode }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <NodeCard
      node={node}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    />
  )
}

export default function InfrastructurePage() {
  const [data, setData] = useState<InfraData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'hierarchy' | 'flat'>('hierarchy')

  useEffect(() => {
    fetch('/api/infrastructure?withEvents=true')
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load infrastructure:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-center py-12">Failed to load infrastructure</div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Network className="h-8 w-8" />
            Infrastructure
          </h1>
          <p className="text-muted-foreground">
            {data.stats.total} nodes across your homelab
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('hierarchy')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'hierarchy'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Hierarchy
          </button>
          <button
            onClick={() => setViewMode('flat')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'flat'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Flat List
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(data.stats.byType).map(([type, count]) => {
          const Icon = TYPE_ICONS[type] || Server
          const colorClass = TYPE_COLORS[type] || 'text-gray-500 bg-gray-500/10'
          return (
            <Card key={type}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground capitalize">{type}</div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Nodes */}
      <div className="space-y-4">
        {viewMode === 'hierarchy' ? (
          data.hierarchy.map(node => (
            <NodeCardWrapper key={node.id} node={node} />
          ))
        ) : (
          data.nodes.map(node => (
            <NodeCardWrapper key={node.id} node={{ ...node, children: [] }} />
          ))
        )}
      </div>

      {data.nodes.length === 0 && (
        <div className="text-center py-12">
          <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No infrastructure nodes configured</p>
          <p className="text-sm text-muted-foreground mt-2">
            Infrastructure nodes will be populated from your events
          </p>
        </div>
      )}
    </div>
  )
}
