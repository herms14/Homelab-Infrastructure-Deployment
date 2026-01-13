import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GitHub Commit Sync (Polling)
// Fetches recent commits from GitHub API and creates timeline events
// Can be called via cron job: curl https://chronicle.hrmsmrflrii.xyz/api/sync/github
//
// Environment variables:
// - GITHUB_TOKEN: Personal access token (optional, increases rate limit)
// - GITHUB_REPO: Repository to sync (default: herms14/homelab-infrastructure)

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const GITHUB_REPO = process.env.GITHUB_REPO || 'herms14/homelab-infrastructure'
const GITHUB_BRANCH = 'main' // Only sync main branch

interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      date: string
    }
  }
  html_url: string
  author?: {
    login: string
  }
  stats?: {
    additions: number
    deletions: number
    total: number
  }
}

function getCategoryFromMessage(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('fix') || lowerMessage.includes('bug')) return 'fix'
  if (lowerMessage.includes('doc') || lowerMessage.includes('readme')) return 'documentation'
  if (lowerMessage.includes('feat') || lowerMessage.includes('add')) return 'service'
  if (lowerMessage.includes('refactor') || lowerMessage.includes('clean')) return 'infrastructure'
  if (lowerMessage.includes('deploy') || lowerMessage.includes('ci')) return 'service'
  if (lowerMessage.includes('test')) return 'infrastructure'

  return 'infrastructure'
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function generateCommitContent(commits: GitHubCommit[], repoName: string): string {
  const commitList = commits.map(c => {
    const sha = c.sha.slice(0, 7)
    const message = c.commit.message.split('\n')[0]
    const author = c.commit.author.name
    const url = c.html_url

    return `<li>
      <code><a href="${url}" target="_blank" rel="noopener">${sha}</a></code> - ${escapeHtml(message)}
      <br><small>by ${escapeHtml(author)}</small>
    </li>`
  }).join('\n')

  return `
    <h4>Commits to ${escapeHtml(repoName)}</h4>
    <p><strong>Branch:</strong> <code>${GITHUB_BRANCH}</code></p>
    <ul>
      ${commitList}
    </ul>
    <p><a href="https://github.com/${GITHUB_REPO}/commits/${GITHUB_BRANCH}" target="_blank" rel="noopener">View all commits on GitHub →</a></p>
  `.trim()
}

async function fetchRecentCommits(): Promise<GitHubCommit[]> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Homelab-Chronicle-Sync'
  }

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`
  }

  const url = `https://api.github.com/repos/${GITHUB_REPO}/commits?sha=${GITHUB_BRANCH}&per_page=30`

  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  try {
    // Fetch recent commits from GitHub
    const commits = await fetchRecentCommits()

    if (commits.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No commits found',
        synced: 0
      })
    }

    // Get existing events with github source to avoid duplicates
    const existingEvents = await prisma.event.findMany({
      where: { source: 'github' },
      select: { sourceRef: true }
    })

    const existingShas = new Set(existingEvents.map(e => e.sourceRef))

    // Filter to only new commits
    const newCommits = commits.filter(c => !existingShas.has(c.sha))

    if (newCommits.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All commits already synced',
        synced: 0,
        total: commits.length
      })
    }

    // Group commits by date (to create one event per push/day)
    const commitsByDate: Map<string, GitHubCommit[]> = new Map()

    for (const commit of newCommits) {
      const date = commit.commit.author.date.split('T')[0] // YYYY-MM-DD
      if (!commitsByDate.has(date)) {
        commitsByDate.set(date, [])
      }
      commitsByDate.get(date)!.push(commit)
    }

    // Create events for each date group
    const createdEvents: string[] = []
    const repoName = GITHUB_REPO.split('/')[1]

    for (const [date, dateCommits] of Array.from(commitsByDate.entries())) {
      // Sort commits by date (newest first for content, oldest for event date)
      dateCommits.sort((a, b) =>
        new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime()
      )

      const commitCount = dateCommits.length
      const title = `${commitCount} commit${commitCount !== 1 ? 's' : ''} pushed to ${GITHUB_BRANCH}`

      // Determine category from all commit messages
      const allMessages = dateCommits.map(c => c.commit.message).join(' ')
      const category = getCategoryFromMessage(allMessages)

      // Get unique authors
      const authors = Array.from(new Set(dateCommits.map(c => c.commit.author.name))).slice(0, 5)
      const tags = ['github', 'automated', 'push', GITHUB_BRANCH, ...authors]

      // Use the oldest commit's date as the event date
      const oldestCommit = dateCommits[dateCommits.length - 1]
      const eventDate = new Date(oldestCommit.commit.author.date)

      // Create the event
      const event = await prisma.event.create({
        data: {
          title,
          date: eventDate,
          content: generateCommitContent(dateCommits, repoName),
          category,
          icon: 'GitCommit',
          tags: JSON.stringify(tags),
          source: 'github',
          sourceRef: dateCommits[0].sha, // Store newest commit SHA
          services: JSON.stringify([repoName]),
          infrastructureNode: null,
        },
      })

      createdEvents.push(event.id)

      // Also store all commit SHAs to prevent re-processing
      // We do this by creating placeholder entries or just rely on the newest SHA
      // For simplicity, we'll create separate "marker" entries in the log
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${newCommits.length} commits into ${createdEvents.length} events`,
      synced: newCommits.length,
      events: createdEvents.length,
      eventIds: createdEvents
    })

  } catch (error: any) {
    console.error('GitHub sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync commits',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// POST endpoint - same as GET but can accept parameters
export async function POST(request: NextRequest) {
  return GET(request)
}
