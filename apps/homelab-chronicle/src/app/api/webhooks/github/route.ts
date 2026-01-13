import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import crypto from 'crypto'

// GitHub Webhook Handler
// Supports: Push events (commits to main/master branch only)
// Configure in GitHub: Settings > Webhooks > Add webhook
// URL: https://chronicle.hrmsmrflrii.xyz/api/webhooks/github
// Content type: application/json
// Secret: Set GITHUB_WEBHOOK_SECRET in environment

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || ''

function verifyGitHubSignature(payload: string, signature: string | null): boolean {
  if (!GITHUB_WEBHOOK_SECRET) return true // Skip verification if no secret configured
  if (!signature) return false

  // GitHub sends signature as "sha256=<hex>"
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

function getCategoryFromCommits(commits: any[]): string {
  // Analyze all commit messages to determine category
  const messages = commits.map(c => c.message?.toLowerCase() || '').join(' ')

  if (messages.includes('fix') || messages.includes('bug')) return 'fix'
  if (messages.includes('doc') || messages.includes('readme')) return 'documentation'
  if (messages.includes('feat') || messages.includes('add')) return 'service'
  if (messages.includes('refactor') || messages.includes('clean')) return 'infrastructure'
  if (messages.includes('test')) return 'infrastructure'
  if (messages.includes('deploy') || messages.includes('ci')) return 'service'

  return 'infrastructure'
}

function generateCommitContent(data: any): string {
  const commits = data.commits || []
  const branch = data.ref?.replace('refs/heads/', '') || 'unknown'
  const repoName = data.repository?.name || 'unknown'
  const repoUrl = data.repository?.html_url || '#'
  const pusher = data.pusher?.name || data.sender?.login || 'unknown'
  const compareUrl = data.compare || '#'

  if (commits.length === 0) {
    return `<p>Push to <code>${branch}</code> branch (no commits)</p>`
  }

  const commitList = commits.map((c: any) => {
    const sha = c.id?.slice(0, 7) || '???????'
    const message = c.message?.split('\n')[0] || 'No message'
    const author = c.author?.name || c.author?.username || 'Unknown'
    const url = c.url || '#'
    const filesChanged = (c.added?.length || 0) + (c.modified?.length || 0) + (c.removed?.length || 0)

    return `<li>
      <code><a href="${url}" target="_blank" rel="noopener">${sha}</a></code> - ${escapeHtml(message)}
      <br><small>by ${escapeHtml(author)}${filesChanged > 0 ? ` • ${filesChanged} file${filesChanged !== 1 ? 's' : ''} changed` : ''}</small>
    </li>`
  }).join('\n')

  return `
    <h4>Commits to ${escapeHtml(repoName)}</h4>
    <p><strong>Branch:</strong> <code>${escapeHtml(branch)}</code> | <strong>Pusher:</strong> ${escapeHtml(pusher)}</p>
    <ul>
      ${commitList}
    </ul>
    <p><a href="${compareUrl}" target="_blank" rel="noopener">View comparison on GitHub →</a></p>
  `.trim()
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getUniqueAuthors(commits: any[]): string[] {
  const authors = new Set<string>()
  commits.forEach(c => {
    if (c.author?.name) authors.add(c.author.name)
    else if (c.author?.username) authors.add(c.author.username)
  })
  return Array.from(authors).slice(0, 5) // Limit to 5 authors for tags
}

export async function POST(request: NextRequest) {
  const headersList = headers()
  const githubEvent = headersList.get('X-GitHub-Event')
  const githubDelivery = headersList.get('X-GitHub-Delivery')
  const githubSignature = headersList.get('X-Hub-Signature-256')

  const rawBody = await request.text()

  // Log the webhook immediately
  const webhookLog = await prisma.webhookLog.create({
    data: {
      source: 'github',
      eventType: githubEvent || 'unknown',
      payload: rawBody,
      ipAddress: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown',
    },
  })

  try {
    // Handle ping event (sent when webhook is first configured)
    if (githubEvent === 'ping') {
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { processed: true, eventId: 'ping' },
      })
      return NextResponse.json({
        success: true,
        message: 'Pong! GitHub webhook configured successfully.',
      })
    }

    // Only process push events
    if (githubEvent !== 'push') {
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { processed: true, eventId: 'skipped' },
      })
      return NextResponse.json({
        success: true,
        message: `Event type '${githubEvent}' ignored. Only push events are processed.`,
      })
    }

    // Verify signature
    if (!verifyGitHubSignature(rawBody, githubSignature)) {
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { error: 'Invalid signature' },
      })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const data = JSON.parse(rawBody)

    // Filter: only process main or master branch
    const ref = data.ref || ''
    const branch = ref.replace('refs/heads/', '')

    if (branch !== 'main' && branch !== 'master') {
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { processed: true, eventId: 'skipped-branch' },
      })
      return NextResponse.json({
        success: true,
        message: `Branch '${branch}' ignored. Only main/master branches are tracked.`,
      })
    }

    // Extract commit data
    const commits = data.commits || []
    const commitCount = commits.length
    const repoName = data.repository?.name || 'unknown-repo'

    // Skip if no commits (e.g., branch creation without commits)
    if (commitCount === 0) {
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { processed: true, eventId: 'skipped-no-commits' },
      })
      return NextResponse.json({
        success: true,
        message: 'No commits in push event. Skipping.',
      })
    }

    // Build event metadata
    const title = `${commitCount} commit${commitCount !== 1 ? 's' : ''} pushed to ${branch}`
    const category = getCategoryFromCommits(commits)
    const authors = getUniqueAuthors(commits)
    const tags = ['github', 'automated', 'push', branch, ...authors]
    const latestSha = data.head_commit?.id || commits[0]?.id || githubDelivery || 'unknown'

    // Create the timeline event
    const event = await prisma.event.create({
      data: {
        title,
        date: new Date(data.head_commit?.timestamp || Date.now()),
        content: generateCommitContent(data),
        category,
        icon: 'GitCommit',
        tags: JSON.stringify(tags),
        source: 'github',
        sourceRef: latestSha,
        services: JSON.stringify([repoName]),
        infrastructureNode: null,
      },
    })

    // Update webhook log with success
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: { processed: true, eventId: event.id },
    })

    return NextResponse.json({
      success: true,
      eventId: event.id,
      message: `Created event: ${title}`,
      commits: commitCount,
      category,
    })

  } catch (error: any) {
    // Log error
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: { error: error.message || 'Unknown error' },
    })

    console.error('GitHub webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint for testing/health check
export async function GET() {
  return NextResponse.json({
    service: 'GitHub Webhook Handler',
    status: 'active',
    supportedEvents: ['push'],
    filteredBranches: ['main', 'master'],
    instructions: 'Configure webhook in GitHub repository settings with Content-Type: application/json',
  })
}
