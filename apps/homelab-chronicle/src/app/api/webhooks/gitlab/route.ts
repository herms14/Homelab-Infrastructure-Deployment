import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

// GitLab Webhook Handler
// Supports: Push events, Merge Request events, Pipeline events
// Configure in GitLab: Settings > Webhooks > Add webhook
// URL: https://chronicle.hrmsmrflrii.xyz/api/webhooks/gitlab
// Secret Token: Set GITLAB_WEBHOOK_SECRET in environment

const GITLAB_WEBHOOK_SECRET = process.env.GITLAB_WEBHOOK_SECRET || ''

function verifyGitLabSignature(payload: string, signature: string | null): boolean {
  if (!GITLAB_WEBHOOK_SECRET) return true // Skip verification if no secret configured
  if (!signature) return false

  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', GITLAB_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  return signature === expectedSignature
}

function getCategoryFromEvent(eventType: string, data: any): string {
  if (eventType === 'pipeline') {
    return data.object_attributes?.status === 'failed' ? 'fix' : 'service'
  }
  if (eventType === 'merge_request') {
    return 'milestone'
  }
  // Default for push events
  const commitMessage = data.commits?.[0]?.message?.toLowerCase() || ''
  if (commitMessage.includes('fix')) return 'fix'
  if (commitMessage.includes('doc')) return 'documentation'
  if (commitMessage.includes('feat')) return 'service'
  return 'infrastructure'
}

function generateContent(eventType: string, data: any): string {
  switch (eventType) {
    case 'push': {
      const commits = data.commits || []
      const commitList = commits.map((c: any) =>
        `<li><code>${c.id.slice(0, 7)}</code> - ${c.message.split('\n')[0]} (${c.author.name})</li>`
      ).join('\n')

      return `
        <p><strong>Branch:</strong> ${data.ref?.replace('refs/heads/', '')}</p>
        <p><strong>Repository:</strong> ${data.project?.name}</p>
        <p><strong>Commits:</strong></p>
        <ul>${commitList}</ul>
        <p><a href="${data.project?.web_url}/-/commits/${data.ref?.replace('refs/heads/', '')}" target="_blank">View on GitLab</a></p>
      `.trim()
    }

    case 'merge_request': {
      const mr = data.object_attributes
      return `
        <p><strong>MR #${mr.iid}:</strong> ${mr.title}</p>
        <p><strong>Status:</strong> ${mr.state}</p>
        <p><strong>Source:</strong> ${mr.source_branch} → ${mr.target_branch}</p>
        <p><strong>Author:</strong> ${data.user?.name}</p>
        ${mr.description ? `<p>${mr.description}</p>` : ''}
        <p><a href="${mr.url}" target="_blank">View Merge Request</a></p>
      `.trim()
    }

    case 'pipeline': {
      const pipeline = data.object_attributes
      const jobs = data.builds || []
      const jobList = jobs.map((j: any) =>
        `<li>${j.name}: <strong>${j.status}</strong></li>`
      ).join('\n')

      return `
        <p><strong>Pipeline #${pipeline.id}</strong></p>
        <p><strong>Status:</strong> ${pipeline.status}</p>
        <p><strong>Branch:</strong> ${pipeline.ref}</p>
        <p><strong>Duration:</strong> ${pipeline.duration}s</p>
        <p><strong>Jobs:</strong></p>
        <ul>${jobList}</ul>
      `.trim()
    }

    default:
      return `<p>GitLab event received: ${eventType}</p><pre>${JSON.stringify(data, null, 2)}</pre>`
  }
}

export async function POST(request: NextRequest) {
  const headersList = headers()
  const gitlabEvent = headersList.get('X-Gitlab-Event')
  const gitlabToken = headersList.get('X-Gitlab-Token')

  const rawBody = await request.text()

  // Log the webhook
  const webhookLog = await prisma.webhookLog.create({
    data: {
      source: 'gitlab',
      eventType: gitlabEvent || 'unknown',
      payload: rawBody,
      ipAddress: headersList.get('x-forwarded-for') || 'unknown',
    },
  })

  try {
    // Verify signature
    if (!verifyGitLabSignature(rawBody, gitlabToken)) {
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { error: 'Invalid signature' },
      })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const data = JSON.parse(rawBody)

    // Determine event type
    let eventType = 'unknown'
    let title = ''
    let tags: string[] = ['gitlab', 'automated']

    if (gitlabEvent === 'Push Hook') {
      eventType = 'push'
      const branch = data.ref?.replace('refs/heads/', '')
      const commitCount = data.total_commits_count || data.commits?.length || 0
      title = `${commitCount} commit${commitCount !== 1 ? 's' : ''} pushed to ${branch}`
      tags.push('git', branch)
    } else if (gitlabEvent === 'Merge Request Hook') {
      eventType = 'merge_request'
      const mr = data.object_attributes
      title = `MR ${mr.action}: ${mr.title}`
      tags.push('merge-request', mr.state)
    } else if (gitlabEvent === 'Pipeline Hook') {
      eventType = 'pipeline'
      const pipeline = data.object_attributes
      title = `Pipeline ${pipeline.status}: ${data.project?.name}`
      tags.push('ci-cd', pipeline.status)
    } else {
      title = `GitLab: ${gitlabEvent}`
    }

    // Create the event
    const event = await prisma.event.create({
      data: {
        title,
        date: new Date(),
        content: generateContent(eventType, data),
        category: getCategoryFromEvent(eventType, data),
        icon: eventType === 'pipeline' ? 'GitBranch' : 'GitCommit',
        tags: JSON.stringify(tags),
        source: 'gitlab',
        sourceRef: data.checkout_sha || data.object_attributes?.id?.toString() || webhookLog.id,
        services: JSON.stringify([data.project?.name || 'unknown']),
      },
    })

    // Update webhook log
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: { processed: true, eventId: event.id },
    })

    return NextResponse.json({
      success: true,
      eventId: event.id,
      message: `Created event: ${title}`
    })

  } catch (error: any) {
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: { error: error.message },
    })

    console.error('GitLab webhook error:', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
