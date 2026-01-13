import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

// Ansible Callback Webhook Handler
// Used by the Chronicle callback plugin to log playbook runs
// Install: Copy chronicle_callback.py to callback_plugins/ directory

interface AnsiblePayload {
  playbook: string
  playbook_path?: string
  started: string
  ended?: string
  duration?: number
  status: 'started' | 'completed' | 'failed'
  host_count?: number
  task_count?: number
  changed_count?: number
  failed_count?: number
  skipped_count?: number
  hosts?: Record<string, {
    ok: number
    changed: number
    failed: number
    skipped: number
    unreachable: boolean
  }>
  failed_tasks?: Array<{
    host: string
    task: string
    msg: string
  }>
  tags?: string[]
  extra_vars?: Record<string, any>
  user?: string
  controller?: string
}

function getCategory(payload: AnsiblePayload): string {
  const playbook = payload.playbook.toLowerCase()

  if (playbook.includes('deploy')) return 'service'
  if (playbook.includes('backup')) return 'storage'
  if (playbook.includes('network') || playbook.includes('dns')) return 'network'
  if (playbook.includes('monitor')) return 'infrastructure'
  if (playbook.includes('fix') || playbook.includes('rollback')) return 'fix'
  if (playbook.includes('doc')) return 'documentation'

  return payload.status === 'failed' ? 'fix' : 'infrastructure'
}

function generateContent(payload: AnsiblePayload): string {
  const statusEmoji = payload.status === 'completed' ? '✅' : payload.status === 'failed' ? '❌' : '🔄'

  let content = `
    <p>${statusEmoji} <strong>Status:</strong> ${payload.status.toUpperCase()}</p>
    <p><strong>Playbook:</strong> <code>${payload.playbook}</code></p>
  `

  if (payload.playbook_path) {
    content += `<p><strong>Path:</strong> <code>${payload.playbook_path}</code></p>`
  }

  if (payload.user) {
    content += `<p><strong>User:</strong> ${payload.user}</p>`
  }

  if (payload.controller) {
    content += `<p><strong>Controller:</strong> ${payload.controller}</p>`
  }

  if (payload.duration) {
    const minutes = Math.floor(payload.duration / 60)
    const seconds = Math.round(payload.duration % 60)
    content += `<p><strong>Duration:</strong> ${minutes > 0 ? `${minutes}m ` : ''}${seconds}s</p>`
  }

  // Host summary
  if (payload.hosts) {
    content += '<h4>Host Results</h4><table><tr><th>Host</th><th>OK</th><th>Changed</th><th>Failed</th><th>Skipped</th></tr>'
    for (const [host, stats] of Object.entries(payload.hosts)) {
      const statusClass = stats.failed > 0 ? 'color: red' : stats.unreachable ? 'color: orange' : ''
      content += `<tr style="${statusClass}">
        <td>${host}</td>
        <td>${stats.ok}</td>
        <td>${stats.changed}</td>
        <td>${stats.failed}</td>
        <td>${stats.skipped}</td>
      </tr>`
    }
    content += '</table>'
  }

  // Task summary
  if (payload.task_count) {
    content += `
      <h4>Task Summary</h4>
      <ul>
        <li>Total: ${payload.task_count}</li>
        ${payload.changed_count ? `<li>Changed: ${payload.changed_count}</li>` : ''}
        ${payload.failed_count ? `<li>Failed: ${payload.failed_count}</li>` : ''}
        ${payload.skipped_count ? `<li>Skipped: ${payload.skipped_count}</li>` : ''}
      </ul>
    `
  }

  // Failed tasks details
  if (payload.failed_tasks && payload.failed_tasks.length > 0) {
    content += '<h4>Failed Tasks</h4><ul>'
    for (const task of payload.failed_tasks) {
      content += `<li><strong>${task.host}</strong> - ${task.task}<br/><code>${task.msg}</code></li>`
    }
    content += '</ul>'
  }

  return content.trim()
}

export async function POST(request: NextRequest) {
  const headersList = headers()
  const rawBody = await request.text()

  // Log the webhook
  const webhookLog = await prisma.webhookLog.create({
    data: {
      source: 'ansible',
      eventType: 'playbook',
      payload: rawBody,
      ipAddress: headersList.get('x-forwarded-for') || 'unknown',
    },
  })

  try {
    const payload: AnsiblePayload = JSON.parse(rawBody)

    // Generate title based on status
    let title: string
    switch (payload.status) {
      case 'started':
        title = `Playbook Started: ${payload.playbook}`
        break
      case 'completed':
        const changedCount = payload.changed_count || 0
        title = changedCount > 0
          ? `Playbook Completed: ${payload.playbook} (${changedCount} changed)`
          : `Playbook Completed: ${payload.playbook}`
        break
      case 'failed':
        title = `Playbook Failed: ${payload.playbook}`
        break
      default:
        title = `Ansible: ${payload.playbook}`
    }

    const tags = [
      'ansible',
      'automation',
      payload.status,
      ...(payload.tags || []),
    ]

    // Extract affected hosts/services
    const hosts = payload.hosts ? Object.keys(payload.hosts) : []

    const event = await prisma.event.create({
      data: {
        title,
        date: new Date(payload.started),
        content: generateContent(payload),
        category: getCategory(payload),
        icon: payload.status === 'failed' ? 'XCircle' : payload.status === 'completed' ? 'CheckCircle' : 'Play',
        tags: JSON.stringify(tags),
        source: 'ansible',
        sourceRef: webhookLog.id,
        infrastructureNode: payload.controller || hosts[0] || null,
        services: JSON.stringify(hosts),
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
      message: `Logged playbook: ${payload.playbook}`
    })

  } catch (error: any) {
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: { error: error.message },
    })

    console.error('Ansible webhook error:', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
