'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TagCloud } from '@/components/ui/tag-cloud'
import {
  Search as SearchIcon,
  Filter,
  X,
  Calendar,
  ChevronDown,
} from 'lucide-react'
import Link from 'next/link'

interface SearchResult {
  id: string
  title: string
  date: string
  category: string
  tags: string[]
  services: string[]
  content: string
  infrastructureNode: string | null
  images: Array<{ path: string }>
}

interface Facet {
  name: string
  count: number
}

interface SearchResponse {
  query: string
  totalCount: number
  events: SearchResult[]
  facets: {
    categories: Facet[]
    sources: Facet[]
    tags: Facet[]
    services: Facet[]
    nodes: Facet[]
  }
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

const QUICK_FILTERS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This year', days: 365 },
]

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  })

  const performSearch = useCallback(async () => {
    setLoading(true)

    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedSource) params.set('source', selectedSource)
    if (selectedNode) params.set('node', selectedNode)
    selectedTags.forEach(tag => params.append('tag', tag))
    if (dateRange.start) params.set('startDate', dateRange.start)
    if (dateRange.end) params.set('endDate', dateRange.end)

    try {
      const response = await fetch(`/api/search?${params.toString()}`)
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }, [query, selectedCategory, selectedSource, selectedNode, selectedTags, dateRange])

  useEffect(() => {
    performSearch()
  }, [performSearch])

  const handleQuickFilter = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    })
  }

  const clearFilters = () => {
    setSelectedCategory(null)
    setSelectedSource(null)
    setSelectedNode(null)
    setSelectedTags([])
    setDateRange({ start: '', end: '' })
  }

  const hasActiveFilters = selectedCategory || selectedSource || selectedNode ||
    selectedTags.length > 0 || dateRange.start || dateRange.end

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <SearchIcon className="h-8 w-8" />
          Search
        </h1>
        <p className="text-muted-foreground mt-1">
          Search through your homelab timeline
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events..."
            className="pl-10 h-12 text-lg"
            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            showFilters || hasActiveFilters
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          <Filter className="h-5 w-5" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">
              Active
            </Badge>
          )}
        </button>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map(({ label, days }) => (
          <button
            key={days}
            onClick={() => handleQuickFilter(days)}
            className="px-3 py-1 text-sm rounded-full bg-muted hover:bg-muted/80 transition-colors"
          >
            {label}
          </button>
        ))}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-1 text-sm rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && results?.facets && (
        <Card>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Category Filter */}
            <div>
              <h4 className="font-medium mb-2">Category</h4>
              <div className="flex flex-wrap gap-1">
                {results.facets.categories.map(({ name, count }) => (
                  <button
                    key={name}
                    onClick={() => setSelectedCategory(selectedCategory === name ? null : name)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      selectedCategory === name
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {name} ({count})
                  </button>
                ))}
              </div>
            </div>

            {/* Source Filter */}
            <div>
              <h4 className="font-medium mb-2">Source</h4>
              <div className="flex flex-wrap gap-1">
                {results.facets.sources.map(({ name, count }) => (
                  <button
                    key={name}
                    onClick={() => setSelectedSource(selectedSource === name ? null : name)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      selectedSource === name
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {name} ({count})
                  </button>
                ))}
              </div>
            </div>

            {/* Node Filter */}
            <div>
              <h4 className="font-medium mb-2">Infrastructure</h4>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {results.facets.nodes.map(({ name, count }) => (
                  <button
                    key={name}
                    onClick={() => setSelectedNode(selectedNode === name ? null : name)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors font-mono ${
                      selectedNode === name
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {name} ({count})
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <h4 className="font-medium mb-2">Date Range</h4>
              <div className="space-y-2">
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  placeholder="Start date"
                  className="h-8 text-sm"
                />
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  placeholder="End date"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : results && results.events.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                {results.totalCount} result{results.totalCount !== 1 ? 's' : ''} found
              </p>
              {results.events.map((event) => (
                <Link key={event.id} href={`/event/${event.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {event.images?.[0] && (
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={event.images[0].path}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{event.title}</h3>
                            <Badge
                              className={`${CATEGORY_COLORS[event.category] || 'bg-gray-500'} text-white text-xs`}
                            >
                              {event.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(event.date).toLocaleDateString()}
                            {event.infrastructureNode && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{event.infrastructureNode}</span>
                              </>
                            )}
                          </div>
                          {event.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {event.tags.slice(0, 5).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </>
          ) : (
            <div className="text-center py-12">
              <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No events found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>

        {/* Sidebar - Tag Cloud */}
        <div className="space-y-6">
          {results?.facets.tags && results.facets.tags.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-4">Popular Tags</h4>
                <TagCloud
                  tags={results.facets.tags}
                  maxTags={30}
                  onTagClick={(tag) => {
                    if (!selectedTags.includes(tag)) {
                      setSelectedTags([...selectedTags, tag])
                    }
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Active Tag Filters</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="default"
                      className="cursor-pointer"
                      onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                    >
                      {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// Wrap in Suspense for useSearchParams
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
