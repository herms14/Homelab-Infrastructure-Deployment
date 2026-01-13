import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

// Prometheus Alertmanager Webhook Handler
// Configure in Alertmanager config:
// receivers:
//   - name: 'chronicle'
//     webhook_configs:
//       - url: 'https://chronicle.hrmsmrflrii.xyz/api/webhooks/prometheus'

interface Alert {
  status: 'firing' | 'resolved'
  labels: Record<string, string>
  annotations: Record<string, string>
  startsAt: string
  endsAt: string
  generatorURL?: string
  fingerprint?: string
}

interface AlertmanagerPayload {
  version: string
  groupKey: string
  status: 'firing' | 'resolved'
  receiver: string
  alerts: Alert[]
  commonLabels: Record<string, string>
  commonAnnotations: Record<string, string>
  externalURL: string
}

function getSeverityIcon(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'AlertOctagon'
    case 'warning': return 'AlertTriangle'
    case 'info': return 'Info'
    default: return 'Bell'
  }
}

function getCategory(alert: Alert): string {
  const alertname = alert.labels.alertname?.toLowerCase() || ''

  if (alertname.includes('container') || alertname.includes('docker')) return 'service'
  if (alertname.includes('disk') || alertname.includes('storage')) return 'storage'
  if (alertname.includes('network') || alertname.includes('interface')) return 'network'
  if (alertname.includes('memory') || alertname.includes('cpu')) return 'infrastructure'
  if (alertname.includes('backup')) return 'storage'

  return alert.status === 'resolved' ? 'fix' : 'infrastructure'
}

function generateAlertContent(alert: Alert, status: string): string {
  const labels = Object.entries(alert.labels)
    .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
    .join('\n')

  const annotations = Object.entries(alert.annotations)
    .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
    .join('\n')

  const statusEmoji = status === 'firing' ? '🔴' : '🟢'
  const duration = alert.endsAt && alert.endsAt !== '0001-01-01T00:00:00Z'
    ? `<p><strong>Duration:</strong> ${new Date(alert.endsAt).getTime() - new Date(alert.startsAt).getTime()}ms</p>`
    : ''

  return `
    <p>${statusEmoji} <strong>Status:</strong> ${status.toUpperCase()}</p>
    <p><strong>Started:</strong> ${new Date(alert.startsAt).toLocaleString()}</p>
    ${duration}
    <h4>Labels</h4>
    <ul>${labels}</ul>
    ${annotations ? `<h4>Annotations</h4><ul>${annotations}</ul>` : ''}
    ${alert.generatorURL ? `<p><a href="${alert.generatorURL}" target="_blank">View in Prometheus</a></p>` : ''}
  `.trim()
}

export async function POST(request: NextRequest) {
  const headersList = headers()
  const rawBody = await request.text()

  // Log the webhook
  const webhookLog = await prisma.webhookLog.create({
    data: {
      source: 'prometheus',
      eventType: 'alert',
      payload: rawBody,
      ipAddress: headersList.get('x-forwarded-for') || 'unknown',
    },
  })

  try {
    const data: AlertmanagerPayload = JSON.parse(rawBody)
    const createdEvents: string[] = []

    // Process each alert
    for (const alert of data.alerts) {
      const alertname = alert.labels.alertname || 'Unknown Alert'
      const severity = alert.labels.severity || 'warning'
      const instance = alert.labels.instance || alert.labels.job || 'unknown'

      const title = alert.status === 'firing'
        ? `Alert: ${alertname} on ${instance}`
        : `Resolved: ${alertname} on ${instance}`

      const tags = [
        'prometheus',
        'alert',
        alert.status,
        severity,
        alert.labels.job || '',
      ].filter(Boolean)

      // Determine infrastructure node
      let infraNode = instance.split(':')[0]
      if (alert.labels.container) infraNode = alert.labels.container
      if (alert.labels.node) infraNode = alert.labels.node

      const event = await prisma.event.create({
        data: {
          title,
          date: new Date(alert.startsAt),
          content: generateAlertContent(alert, alert.status),
          category: getCategory(alert),
          icon: getSeverityIcon(severity),
          tags: JSON.stringify(tags),
          source: 'prometheus',
          sourceRef: alert.fingerprint || webhookLog.id,
          infrastructureNode: infraNode,
          services: JSON.stringify([alert.labels.job || 'prometheus'].filter(Boolean)),
        },
      })

      createdEvents.push(event.id)
    }

    // Update webhook log
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: {
        processed: true,
        eventId: createdEvents.join(','),
      },
    })

    return NextResponse.json({
      success: true,
      eventIds: createdEvents,
      message: `Created ${createdEvents.length} alert event(s)`
    })

  } catch (error: any) {
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: { error: error.message },
    })

    console.error('Prometheus webhook error:', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
