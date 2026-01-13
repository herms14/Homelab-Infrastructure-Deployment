/**
 * Git Commit Importer
 *
 * Parses git log output and creates timeline events for significant commits.
 * Run: npx ts-node scripts/import-git.ts
 */

import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface GitCommit {
  sha: string
  date: string
  message: string
  author: string
}

// Category mapping based on conventional commits
function categorizeCommit(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.startsWith('feat:') || lowerMessage.startsWith('feat(')) {
    if (lowerMessage.includes('docker') || lowerMessage.includes('deploy') || lowerMessage.includes('service')) {
      return 'service'
    }
    if (lowerMessage.includes('k8s') || lowerMessage.includes('kubernetes') || lowerMessage.includes('proxmox')) {
      return 'infrastructure'
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('vlan') || lowerMessage.includes('traefik')) {
      return 'network'
    }
    if (lowerMessage.includes('storage') || lowerMessage.includes('nas') || lowerMessage.includes('nfs')) {
      return 'storage'
    }
    return 'milestone'
  }

  if (lowerMessage.startsWith('fix:') || lowerMessage.startsWith('fix(')) {
    return 'fix'
  }

  if (lowerMessage.startsWith('docs:') || lowerMessage.startsWith('docs(')) {
    return 'documentation'
  }

  if (lowerMessage.includes('infrastructure') || lowerMessage.includes('terraform')) {
    return 'infrastructure'
  }

  return 'milestone'
}

// Filter for significant commits
function isSignificantCommit(message: string): boolean {
  const lowerMessage = message.toLowerCase()

  // Include conventional commits
  if (lowerMessage.startsWith('feat:') || lowerMessage.startsWith('feat(')) return true
  if (lowerMessage.startsWith('fix:') && !lowerMessage.includes('typo')) return true

  // Include infrastructure keywords
  const keywords = [
    'deploy', 'kubernetes', 'k8s', 'proxmox', 'docker',
    'service', 'vm', 'lxc', 'container', 'node',
    'storage', 'network', 'vlan', 'traefik',
    'ansible', 'terraform', 'packer'
  ]

  return keywords.some(keyword => lowerMessage.includes(keyword))
}

// Clean commit message for title
function createTitle(message: string): string {
  // Remove conventional commit prefix
  let title = message
    .replace(/^(feat|fix|docs|chore|refactor|test|style|perf)\([^)]*\):\s*/i, '')
    .replace(/^(feat|fix|docs|chore|refactor|test|style|perf):\s*/i, '')

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1)

  // Truncate if too long
  if (title.length > 100) {
    title = title.substring(0, 97) + '...'
  }

  return title
}

// Generate tags from commit message
function generateTags(message: string): string[] {
  const lowerMessage = message.toLowerCase()
  const tags: string[] = []

  const tagMappings: Record<string, string[]> = {
    proxmox: ['proxmox', 'pve', 'virtualization'],
    kubernetes: ['kubernetes', 'k8s', 'k3s'],
    docker: ['docker', 'container', 'compose'],
    terraform: ['terraform', 'iac'],
    ansible: ['ansible', 'playbook', 'automation'],
    grafana: ['grafana', 'monitoring', 'dashboard'],
    traefik: ['traefik', 'proxy', 'routing'],
    network: ['network', 'vlan', 'dns'],
    storage: ['storage', 'nas', 'nfs', 'synology'],
    glance: ['glance', 'dashboard'],
  }

  for (const [tag, keywords] of Object.entries(tagMappings)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      tags.push(tag)
    }
  }

  return Array.from(new Set(tags)) // Remove duplicates
}

async function importGitCommits(repoPath: string = '../../..', limit: number = 100) {
  console.log('Parsing git log...')

  try {
    // Get git log in a parseable format
    const gitLog = execSync(
      `git log --date=iso --format="%H|%ad|%an|%s" -n ${limit}`,
      { cwd: repoPath, encoding: 'utf-8' }
    )

    const lines = gitLog.trim().split('\n')
    const commits: GitCommit[] = lines.map(line => {
      const [sha, date, author, ...messageParts] = line.split('|')
      return {
        sha,
        date,
        author,
        message: messageParts.join('|'), // In case message contains |
      }
    })

    console.log(`Found ${commits.length} commits`)

    // Filter significant commits
    const significantCommits = commits.filter(c => isSignificantCommit(c.message))
    console.log(`${significantCommits.length} significant commits to import`)

    let imported = 0
    let skipped = 0

    for (const commit of significantCommits) {
      // Check if already imported
      const existing = await prisma.event.findFirst({
        where: {
          source: 'git',
          sourceRef: commit.sha,
        },
      })

      if (existing) {
        skipped++
        continue
      }

      const category = categorizeCommit(commit.message)
      const title = createTitle(commit.message)
      const tags = generateTags(commit.message)

      await prisma.event.create({
        data: {
          title,
          date: new Date(commit.date),
          content: `<p>Git commit: <code>${commit.sha.substring(0, 7)}</code></p><p>${commit.message}</p>`,
          category,
          tags: JSON.stringify(tags),
          source: 'git',
          sourceRef: commit.sha,
        },
      })

      imported++
      console.log(`Imported: ${title}`)
    }

    console.log(`\nImport complete: ${imported} new, ${skipped} skipped`)

  } catch (error) {
    console.error('Error importing git commits:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  const repoPath = process.argv[2] || '../../..'
  const limit = parseInt(process.argv[3] || '100', 10)

  importGitCommits(repoPath, limit)
}

export { importGitCommits }
