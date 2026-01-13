/**
 * CHANGELOG.md Importer
 *
 * Parses CHANGELOG.md and creates timeline events.
 * Run: npx ts-node scripts/import-changelog.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ChangelogEntry {
  date: string
  title: string
  category: string
  items: string[]
}

// Category mapping based on changelog sections
function categorizeEntry(sectionTitle: string, content: string): string {
  const lower = (sectionTitle + ' ' + content).toLowerCase()

  if (lower.includes('added') || lower.includes('new')) {
    if (lower.includes('service') || lower.includes('deploy')) return 'service'
    if (lower.includes('infrastructure') || lower.includes('node') || lower.includes('vm')) return 'infrastructure'
    if (lower.includes('network') || lower.includes('vlan')) return 'network'
    if (lower.includes('storage') || lower.includes('nas')) return 'storage'
    return 'milestone'
  }

  if (lower.includes('fixed') || lower.includes('fix')) return 'fix'
  if (lower.includes('documentation') || lower.includes('docs')) return 'documentation'
  if (lower.includes('changed') || lower.includes('updated')) return 'milestone'

  return 'milestone'
}

// Generate tags from content
function generateTags(content: string): string[] {
  const lower = content.toLowerCase()
  const tags: string[] = []

  const tagMappings: Record<string, string[]> = {
    proxmox: ['proxmox'],
    kubernetes: ['kubernetes', 'k8s', 'k3s'],
    docker: ['docker', 'container'],
    grafana: ['grafana'],
    prometheus: ['prometheus'],
    ansible: ['ansible'],
    terraform: ['terraform'],
    glance: ['glance'],
    traefik: ['traefik'],
    authentik: ['authentik'],
    jellyfin: ['jellyfin'],
    observability: ['observability', 'monitoring'],
  }

  for (const [tag, keywords] of Object.entries(tagMappings)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      tags.push(tag)
    }
  }

  return Array.from(new Set(tags))
}

function parseChangelog(content: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []

  // Match date headers like "## [2026-01-11]" or "## 2026-01-11" or "### January 11, 2026"
  const dateRegex = /^##\s*\[?(\d{4}-\d{2}-\d{2})\]?.*?(?=^##|\Z)/gms
  const altDateRegex = /^###?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/gmi

  let match

  // Try standard format first
  while ((match = dateRegex.exec(content)) !== null) {
    const date = match[1]
    const section = match[0]

    // Parse section content
    const lines = section.split('\n').slice(1) // Skip the header line
    const items: string[] = []
    let currentTitle = ''

    for (const line of lines) {
      const trimmed = line.trim()

      // Check for subsection headers like "### Added"
      if (trimmed.startsWith('###')) {
        currentTitle = trimmed.replace(/^###\s*/, '')
        continue
      }

      // Check for list items
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const item = trimmed.replace(/^[-*]\s*/, '')
        if (item) {
          items.push(item)
        }
      }
    }

    if (items.length > 0) {
      // Create a combined title from first few items
      const title = items[0].length > 80 ? items[0].substring(0, 77) + '...' : items[0]

      entries.push({
        date,
        title: currentTitle || title,
        category: categorizeEntry(currentTitle, items.join(' ')),
        items,
      })
    }
  }

  return entries
}

async function importChangelog(changelogPath: string = '../../../CHANGELOG.md') {
  console.log('Reading CHANGELOG.md...')

  try {
    const fullPath = join(__dirname, changelogPath)
    const content = readFileSync(fullPath, 'utf-8')

    const entries = parseChangelog(content)
    console.log(`Found ${entries.length} changelog entries`)

    let imported = 0
    let skipped = 0

    for (const entry of entries) {
      // Check if already imported
      const existing = await prisma.event.findFirst({
        where: {
          source: 'changelog',
          date: new Date(entry.date),
          title: entry.title,
        },
      })

      if (existing) {
        skipped++
        continue
      }

      // Create HTML content from items
      const itemsHtml = entry.items.map(item => `<li>${item}</li>`).join('\n')
      const contentHtml = `<ul>\n${itemsHtml}\n</ul>`

      const tags = generateTags(entry.items.join(' '))

      await prisma.event.create({
        data: {
          title: entry.title,
          date: new Date(entry.date),
          content: contentHtml,
          category: entry.category,
          tags: JSON.stringify(tags),
          source: 'changelog',
          sourceRef: `CHANGELOG.md:${entry.date}`,
        },
      })

      imported++
      console.log(`Imported: ${entry.date} - ${entry.title}`)
    }

    console.log(`\nImport complete: ${imported} new, ${skipped} skipped`)

  } catch (error) {
    console.error('Error importing changelog:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  const changelogPath = process.argv[2] || '../../../CHANGELOG.md'
  importChangelog(changelogPath)
}

export { importChangelog }
