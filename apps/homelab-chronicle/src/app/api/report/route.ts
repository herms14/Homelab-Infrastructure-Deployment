import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format, subDays, subMonths, subYears, startOfMonth, endOfMonth } from 'date-fns'

// Force dynamic rendering since this uses searchParams
export const dynamic = 'force-dynamic'

/**
 * GET /api/report - Generate reports in various formats
 *
 * Query params:
 * - format: 'html' | 'markdown' | 'json' (default: 'html')
 * - period: 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom'
 * - startDate: ISO date (required if period=custom)
 * - endDate: ISO date (required if period=custom)
 * - category: filter by category
 * - includeStats: 'true' to include statistics section
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const reportFormat = searchParams.get('format') || 'html'
    const period = searchParams.get('period') || 'month'
    const category = searchParams.get('category')
    const includeStats = searchParams.get('includeStats') === 'true'

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    let endDate: Date = now

    switch (period) {
      case 'week':
        startDate = subDays(now, 7)
        break
      case 'month':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
      case 'quarter':
        startDate = subMonths(now, 3)
        break
      case 'year':
        startDate = subYears(now, 1)
        break
      case 'custom':
        const customStart = searchParams.get('startDate')
        const customEnd = searchParams.get('endDate')
        if (!customStart || !customEnd) {
          return NextResponse.json(
            { error: 'startDate and endDate required for custom period' },
            { status: 400 }
          )
        }
        startDate = new Date(customStart)
        endDate = new Date(customEnd)
        break
      default:
        startDate = new Date('2020-01-01')
    }

    // Build query
    const where: any = {
      date: {
        gte: startDate,
        lte: endDate
      }
    }

    if (category) {
      where.category = category
    }

    // Fetch events
    const events = await prisma.event.findMany({
      where,
      include: {
        images: true,
        attachments: true,
      },
      orderBy: { date: 'desc' }
    })

    // Calculate stats if requested
    let stats: any = null
    if (includeStats) {
      const byCategory = await prisma.event.groupBy({
        by: ['category'],
        where,
        _count: true
      })

      const bySource = await prisma.event.groupBy({
        by: ['source'],
        where,
        _count: true
      })

      stats = {
        totalEvents: events.length,
        dateRange: {
          start: format(startDate, 'MMMM d, yyyy'),
          end: format(endDate, 'MMMM d, yyyy')
        },
        byCategory: byCategory.reduce((acc, { category, _count }) => {
          if (category) acc[category] = _count
          return acc
        }, {} as Record<string, number>),
        bySource: bySource.reduce((acc, { source, _count }) => {
          if (source) acc[source] = _count
          return acc
        }, {} as Record<string, number>)
      }
    }

    // Generate report based on format
    const periodLabel = period === 'custom'
      ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
      : period.charAt(0).toUpperCase() + period.slice(1)

    if (reportFormat === 'json') {
      return NextResponse.json({
        title: `Homelab Chronicle Report - ${periodLabel}`,
        generatedAt: new Date().toISOString(),
        period: {
          label: periodLabel,
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        stats,
        events: events.map(event => ({
          id: event.id,
          title: event.title,
          date: event.date,
          category: event.category,
          tags: JSON.parse(event.tags || '[]'),
          services: JSON.parse(event.services || '[]'),
          infrastructureNode: event.infrastructureNode,
          source: event.source,
          contentPreview: stripHtml(event.content).substring(0, 200),
          imageCount: event.images.length,
          attachmentCount: event.attachments.length,
        }))
      })
    }

    if (reportFormat === 'markdown') {
      const markdown = generateMarkdownReport(events, stats, periodLabel, startDate, endDate)

      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="chronicle-report-${format(now, 'yyyy-MM-dd')}.md"`
        }
      })
    }

    // Default: HTML report
    const html = generateHtmlReport(events, stats, periodLabel, startDate, endDate)

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="chronicle-report-${format(now, 'yyyy-MM-dd')}.html"`
      }
    })

  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function generateMarkdownReport(
  events: any[],
  stats: any,
  periodLabel: string,
  startDate: Date,
  endDate: Date
): string {
  let md = `# Homelab Chronicle Report\n\n`
  md += `**Period:** ${periodLabel}\n`
  md += `**Generated:** ${format(new Date(), 'MMMM d, yyyy h:mm a')}\n\n`

  if (stats) {
    md += `## Summary Statistics\n\n`
    md += `- **Total Events:** ${stats.totalEvents}\n`
    md += `- **Date Range:** ${stats.dateRange.start} - ${stats.dateRange.end}\n\n`

    if (Object.keys(stats.byCategory).length > 0) {
      md += `### Events by Category\n\n`
      md += `| Category | Count |\n|----------|-------|\n`
      for (const [cat, count] of Object.entries(stats.byCategory)) {
        md += `| ${cat} | ${count} |\n`
      }
      md += `\n`
    }

    if (Object.keys(stats.bySource).length > 0) {
      md += `### Events by Source\n\n`
      md += `| Source | Count |\n|--------|-------|\n`
      for (const [src, count] of Object.entries(stats.bySource)) {
        md += `| ${src || 'manual'} | ${count} |\n`
      }
      md += `\n`
    }
  }

  md += `## Timeline\n\n`

  // Group events by month
  const eventsByMonth: Record<string, any[]> = {}
  events.forEach(event => {
    const monthKey = format(new Date(event.date), 'MMMM yyyy')
    if (!eventsByMonth[monthKey]) {
      eventsByMonth[monthKey] = []
    }
    eventsByMonth[monthKey].push(event)
  })

  for (const [month, monthEvents] of Object.entries(eventsByMonth)) {
    md += `### ${month}\n\n`

    for (const event of monthEvents) {
      const tags = JSON.parse(event.tags || '[]')
      const dateStr = format(new Date(event.date), 'MMM d')

      md += `#### ${event.title}\n\n`
      md += `- **Date:** ${dateStr}\n`
      md += `- **Category:** ${event.category}\n`

      if (event.infrastructureNode) {
        md += `- **Node:** ${event.infrastructureNode}\n`
      }

      if (tags.length > 0) {
        md += `- **Tags:** ${tags.join(', ')}\n`
      }

      md += `\n${stripHtml(event.content)}\n\n`
      md += `---\n\n`
    }
  }

  return md
}

function generateHtmlReport(
  events: any[],
  stats: any,
  periodLabel: string,
  startDate: Date,
  endDate: Date
): string {
  const categoryColors: Record<string, string> = {
    infrastructure: '#3B82F6',
    service: '#22C55E',
    milestone: '#A855F7',
    fix: '#EF4444',
    documentation: '#EAB308',
    network: '#06B6D4',
    storage: '#F97316',
  }

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Homelab Chronicle Report - ${periodLabel}</title>
  <style>
    :root {
      --bg-primary: #0a0a0a;
      --bg-secondary: #171717;
      --bg-tertiary: #262626;
      --text-primary: #fafafa;
      --text-secondary: #a1a1aa;
      --border-color: #27272a;
      --accent: #6366f1;
    }

    @media print {
      :root {
        --bg-primary: #ffffff;
        --bg-secondary: #f4f4f5;
        --bg-tertiary: #e4e4e7;
        --text-primary: #09090b;
        --text-secondary: #52525b;
        --border-color: #d4d4d8;
      }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      padding: 2rem;
      max-width: 900px;
      margin: 0 auto;
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      color: var(--accent);
    }

    .meta {
      color: var(--text-secondary);
      margin-bottom: 2rem;
    }

    .stats {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .stats h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    .stat-item {
      background: var(--bg-tertiary);
      padding: 1rem;
      border-radius: 6px;
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--accent);
    }

    .stat-label {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .month-section {
      margin-bottom: 2rem;
    }

    .month-header {
      font-size: 1.25rem;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.5rem;
      margin-bottom: 1rem;
    }

    .event-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .event-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .event-date {
      color: var(--text-secondary);
      font-size: 0.875rem;
      min-width: 60px;
    }

    .event-title {
      font-weight: 600;
      flex: 1;
    }

    .category-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      color: white;
      text-transform: capitalize;
    }

    .event-meta {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .event-content {
      color: var(--text-secondary);
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-top: 0.5rem;
    }

    .tag {
      background: var(--bg-tertiary);
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    @media print {
      body { padding: 1rem; }
      .event-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Homelab Chronicle Report</h1>
  <p class="meta">
    <strong>Period:</strong> ${periodLabel}<br>
    <strong>Generated:</strong> ${format(new Date(), 'MMMM d, yyyy h:mm a')}
  </p>
`

  if (stats) {
    html += `
  <div class="stats">
    <h2>Summary Statistics</h2>
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value">${stats.totalEvents}</div>
        <div class="stat-label">Total Events</div>
      </div>
`
    for (const [cat, count] of Object.entries(stats.byCategory)) {
      const color = categoryColors[cat] || '#6B7280'
      html += `
      <div class="stat-item">
        <div class="stat-value" style="color: ${color}">${count}</div>
        <div class="stat-label" style="text-transform: capitalize">${cat}</div>
      </div>
`
    }
    html += `
    </div>
  </div>
`
  }

  // Group events by month
  const eventsByMonth: Record<string, any[]> = {}
  events.forEach(event => {
    const monthKey = format(new Date(event.date), 'MMMM yyyy')
    if (!eventsByMonth[monthKey]) {
      eventsByMonth[monthKey] = []
    }
    eventsByMonth[monthKey].push(event)
  })

  for (const [month, monthEvents] of Object.entries(eventsByMonth)) {
    html += `
  <div class="month-section">
    <h2 class="month-header">${month}</h2>
`
    for (const event of monthEvents) {
      const tags = JSON.parse(event.tags || '[]')
      const dateStr = format(new Date(event.date), 'MMM d')
      const color = categoryColors[event.category] || '#6B7280'
      const content = stripHtml(event.content).substring(0, 300)

      html += `
    <div class="event-card">
      <div class="event-header">
        <span class="event-date">${dateStr}</span>
        <span class="event-title">${escapeHtml(event.title)}</span>
        <span class="category-badge" style="background: ${color}">${event.category}</span>
      </div>
`
      if (event.infrastructureNode) {
        html += `      <div class="event-meta">Node: ${escapeHtml(event.infrastructureNode)}</div>\n`
      }

      html += `      <div class="event-content">${escapeHtml(content)}${content.length >= 300 ? '...' : ''}</div>\n`

      if (tags.length > 0) {
        html += `      <div class="tags">\n`
        tags.forEach((tag: string) => {
          html += `        <span class="tag">${escapeHtml(tag)}</span>\n`
        })
        html += `      </div>\n`
      }

      html += `    </div>\n`
    }
    html += `  </div>\n`
  }

  html += `
</body>
</html>
`
  return html
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
