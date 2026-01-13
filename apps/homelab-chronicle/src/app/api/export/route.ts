import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// Export API - Export events to various formats

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json' // 'json', 'markdown', 'csv'
  const category = searchParams.get('category')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const includeImages = searchParams.get('includeImages') === 'true'

  // Build filter
  const where: any = {}
  if (category && category !== 'all') {
    where.category = category
  }
  if (startDate) {
    where.date = { ...where.date, gte: new Date(startDate) }
  }
  if (endDate) {
    where.date = { ...where.date, lte: new Date(endDate) }
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      images: includeImages,
      attachments: true,
    },
  })

  switch (format) {
    case 'markdown':
      return exportMarkdown(events)
    case 'csv':
      return exportCSV(events)
    case 'json':
    default:
      return exportJSON(events)
  }
}

function exportJSON(events: any[]) {
  const data = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    count: events.length,
    events: events.map(e => ({
      ...e,
      tags: JSON.parse(e.tags || '[]'),
      services: JSON.parse(e.services || '[]'),
      codeSnippets: JSON.parse(e.codeSnippets || '[]'),
    })),
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="chronicle-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}

function exportMarkdown(events: any[]) {
  let markdown = `# Homelab Chronicle Export\n\n`
  markdown += `*Exported: ${new Date().toLocaleString()}*\n\n`
  markdown += `---\n\n`

  // Group by year/month
  const grouped: Record<string, any[]> = {}
  events.forEach(e => {
    const d = new Date(e.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(e)
  })

  const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  for (const yearMonth of sortedKeys) {
    const [year, month] = yearMonth.split('-')
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' })

    markdown += `## ${monthName} ${year}\n\n`

    for (const event of grouped[yearMonth]) {
      const date = new Date(event.date).toLocaleDateString()
      const tags = JSON.parse(event.tags || '[]')

      markdown += `### ${event.title}\n\n`
      markdown += `**Date:** ${date} | **Category:** ${event.category}\n\n`

      if (tags.length > 0) {
        markdown += `**Tags:** ${tags.map((t: string) => `\`${t}\``).join(', ')}\n\n`
      }

      // Convert HTML to markdown (basic conversion)
      let content = event.content
        .replace(/<h1>/g, '# ').replace(/<\/h1>/g, '\n')
        .replace(/<h2>/g, '## ').replace(/<\/h2>/g, '\n')
        .replace(/<h3>/g, '### ').replace(/<\/h3>/g, '\n')
        .replace(/<h4>/g, '#### ').replace(/<\/h4>/g, '\n')
        .replace(/<p>/g, '').replace(/<\/p>/g, '\n\n')
        .replace(/<strong>/g, '**').replace(/<\/strong>/g, '**')
        .replace(/<em>/g, '*').replace(/<\/em>/g, '*')
        .replace(/<code>/g, '`').replace(/<\/code>/g, '`')
        .replace(/<pre>/g, '```\n').replace(/<\/pre>/g, '\n```')
        .replace(/<ul>/g, '').replace(/<\/ul>/g, '\n')
        .replace(/<ol>/g, '').replace(/<\/ol>/g, '\n')
        .replace(/<li>/g, '- ').replace(/<\/li>/g, '\n')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g, '[$2]($1)')
        .replace(/<[^>]+>/g, '') // Remove remaining tags

      markdown += content.trim() + '\n\n'
      markdown += `---\n\n`
    }
  }

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown',
      'Content-Disposition': `attachment; filename="chronicle-export-${new Date().toISOString().split('T')[0]}.md"`,
    },
  })
}

function exportCSV(events: any[]) {
  const headers = ['ID', 'Title', 'Date', 'Category', 'Tags', 'Source', 'Infrastructure Node', 'Services']

  const rows = events.map(e => [
    e.id,
    `"${e.title.replace(/"/g, '""')}"`,
    new Date(e.date).toISOString(),
    e.category,
    `"${JSON.parse(e.tags || '[]').join(', ')}"`,
    e.source || 'manual',
    e.infrastructureNode || '',
    `"${JSON.parse(e.services || '[]').join(', ')}"`,
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="chronicle-export-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
