'use client'

import { useRouter } from 'next/navigation'

interface TagWithTag {
  tag: string
  count: number
}

interface TagWithName {
  name: string
  count: number
}

type Tag = TagWithTag | TagWithName

interface TagCloudProps {
  tags: Tag[]
  maxTags?: number
  onTagClick?: (tag: string) => void
}

// Helper to get the tag name regardless of the format
function getTagName(tag: Tag): string {
  return 'tag' in tag ? tag.tag : tag.name
}

export function TagCloud({ tags, maxTags = 50, onTagClick }: TagCloudProps) {
  const router = useRouter()

  if (tags.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No tags found
      </div>
    )
  }

  const displayTags = tags.slice(0, maxTags)
  const maxCount = Math.max(...displayTags.map(t => t.count))
  const minCount = Math.min(...displayTags.map(t => t.count))

  // Calculate font size based on count (0.75rem to 1.75rem)
  const getFontSize = (count: number) => {
    if (maxCount === minCount) return 1
    const normalized = (count - minCount) / (maxCount - minCount)
    return 0.75 + normalized * 1
  }

  // Get color based on count
  const getColor = (count: number) => {
    if (maxCount === minCount) return 'hsl(var(--primary))'
    const normalized = (count - minCount) / (maxCount - minCount)
    // Gradient from muted to primary
    const hue = 220 + normalized * 30 // Blue to purple
    const saturation = 40 + normalized * 40
    const lightness = 50 + normalized * 10
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  const handleClick = (tag: string) => {
    if (onTagClick) {
      onTagClick(tag)
    } else {
      router.push(`/?search=${encodeURIComponent(tag)}`)
    }
  }

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {displayTags.map((tagItem) => {
        const tagName = getTagName(tagItem)
        return (
          <button
            key={tagName}
            onClick={() => handleClick(tagName)}
            className="hover:opacity-80 transition-opacity cursor-pointer"
            style={{
              fontSize: `${getFontSize(tagItem.count)}rem`,
              color: getColor(tagItem.count),
            }}
            title={`${tagName}: ${tagItem.count} events`}
          >
            {tagName}
          </button>
        )
      })}
    </div>
  )
}
