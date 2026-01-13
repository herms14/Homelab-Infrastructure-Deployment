'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import {
  Server,
  Box,
  Trophy,
  Wrench,
  FileText,
  Network,
  HardDrive,
  Search,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const categories = [
  { id: 'all', label: 'All', icon: null, color: '#6b7280' },
  { id: 'infrastructure', label: 'Infrastructure', icon: Server, color: '#3b82f6' },
  { id: 'service', label: 'Service', icon: Box, color: '#22c55e' },
  { id: 'milestone', label: 'Milestone', icon: Trophy, color: '#8b5cf6' },
  { id: 'fix', label: 'Fix', icon: Wrench, color: '#f59e0b' },
  { id: 'documentation', label: 'Docs', icon: FileText, color: '#6b7280' },
  { id: 'network', label: 'Network', icon: Network, color: '#06b6d4' },
  { id: 'storage', label: 'Storage', icon: HardDrive, color: '#f97316' },
]

interface TimelineFilterProps {
  currentCategory?: string
  currentSearch?: string
}

export function TimelineFilter({ currentCategory, currentSearch }: TimelineFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(currentSearch || '')

  const updateFilters = (category?: string, search?: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (category && category !== 'all') {
      params.set('category', category)
    } else {
      params.delete('category')
    }

    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }

    router.push(`/?${params.toString()}`)
  }

  const handleCategoryClick = (categoryId: string) => {
    updateFilters(categoryId, searchValue)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters(currentCategory, searchValue)
  }

  const clearSearch = () => {
    setSearchValue('')
    updateFilters(currentCategory, '')
  }

  return (
    <div className="mb-8 space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search events..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchValue && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map(({ id, label, icon: Icon, color }) => {
          const isActive = currentCategory === id || (!currentCategory && id === 'all')

          return (
            <Button
              key={id}
              variant="outline"
              size="sm"
              onClick={() => handleCategoryClick(id)}
              className={cn(
                'transition-all',
                isActive && 'ring-2 ring-offset-2'
              )}
              style={{
                borderColor: isActive ? color : undefined,
                backgroundColor: isActive ? `${color}10` : undefined,
                color: isActive ? color : undefined,
              }}
            >
              {Icon && <Icon className="h-3 w-3 mr-1.5" />}
              {label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
