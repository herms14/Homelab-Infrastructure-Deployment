import { prisma } from '@/lib/prisma'

// Initialize built-in templates on first run
export async function seedBuiltInTemplates() {
  const builtInTemplates = [
    {
      name: 'Container Deployment',
      description: 'New Docker container deployed',
      category: 'service',
      icon: 'Container',
      tags: ['docker', 'deployment'],
      content: `
        <h4>Container Details</h4>
        <ul>
          <li><strong>Image:</strong> [image:tag]</li>
          <li><strong>Port:</strong> [port]</li>
          <li><strong>Host:</strong> [host]</li>
        </ul>
        <h4>Configuration</h4>
        <pre><code>[docker-compose snippet]</code></pre>
        <h4>Notes</h4>
        <p>[Additional notes]</p>
      `,
      services: [],
    },
    {
      name: 'VM Creation',
      description: 'New virtual machine created',
      category: 'infrastructure',
      icon: 'Server',
      tags: ['proxmox', 'vm'],
      content: `
        <h4>VM Details</h4>
        <ul>
          <li><strong>VMID:</strong> [vmid]</li>
          <li><strong>Hostname:</strong> [hostname]</li>
          <li><strong>IP:</strong> [ip]</li>
          <li><strong>Node:</strong> [node]</li>
          <li><strong>Resources:</strong> [cores] cores, [memory]GB RAM, [disk]GB disk</li>
        </ul>
        <h4>Purpose</h4>
        <p>[description]</p>
      `,
      services: [],
    },
    {
      name: 'LXC Container',
      description: 'New LXC container created',
      category: 'infrastructure',
      icon: 'Box',
      tags: ['proxmox', 'lxc'],
      content: `
        <h4>LXC Details</h4>
        <ul>
          <li><strong>VMID:</strong> [vmid]</li>
          <li><strong>Hostname:</strong> [hostname]</li>
          <li><strong>IP:</strong> [ip]</li>
          <li><strong>Node:</strong> [node]</li>
          <li><strong>Template:</strong> [template]</li>
        </ul>
        <h4>Configuration</h4>
        <p>Features: [nesting, keyctl, etc.]</p>
      `,
      services: [],
    },
    {
      name: 'Network Change',
      description: 'Network configuration change',
      category: 'network',
      icon: 'Network',
      tags: ['network', 'configuration'],
      content: `
        <h4>Change Summary</h4>
        <p>[what changed]</p>
        <h4>Before</h4>
        <pre><code>[previous config]</code></pre>
        <h4>After</h4>
        <pre><code>[new config]</code></pre>
        <h4>Affected Services</h4>
        <ul>
          <li>[service1]</li>
          <li>[service2]</li>
        </ul>
      `,
      services: [],
    },
    {
      name: 'Bug Fix',
      description: 'Issue resolved',
      category: 'fix',
      icon: 'Bug',
      tags: ['fix', 'troubleshooting'],
      content: `
        <h4>Problem</h4>
        <p>[describe the issue]</p>
        <h4>Root Cause</h4>
        <p>[what caused it]</p>
        <h4>Solution</h4>
        <p>[how it was fixed]</p>
        <h4>Prevention</h4>
        <p>[how to prevent in future]</p>
      `,
      services: [],
    },
    {
      name: 'Backup/Restore',
      description: 'Backup or restore operation',
      category: 'storage',
      icon: 'Database',
      tags: ['backup', 'storage'],
      content: `
        <h4>Operation</h4>
        <p>[backup/restore] of [what]</p>
        <h4>Details</h4>
        <ul>
          <li><strong>Size:</strong> [size]</li>
          <li><strong>Duration:</strong> [duration]</li>
          <li><strong>Location:</strong> [path/storage]</li>
        </ul>
        <h4>Verification</h4>
        <p>[how verified]</p>
      `,
      services: [],
    },
    {
      name: 'Service Migration',
      description: 'Service migrated between hosts',
      category: 'milestone',
      icon: 'ArrowRightLeft',
      tags: ['migration', 'infrastructure'],
      content: `
        <h4>Migration Summary</h4>
        <p>[service] migrated from [source] to [destination]</p>
        <h4>Steps Taken</h4>
        <ol>
          <li>[step 1]</li>
          <li>[step 2]</li>
          <li>[step 3]</li>
        </ol>
        <h4>Downtime</h4>
        <p>[duration or "zero downtime"]</p>
        <h4>Verification</h4>
        <p>[how verified working]</p>
      `,
      services: [],
    },
    {
      name: 'Documentation Update',
      description: 'Documentation added or updated',
      category: 'documentation',
      icon: 'FileText',
      tags: ['docs', 'documentation'],
      content: `
        <h4>Changes</h4>
        <p>[what was documented]</p>
        <h4>Files Updated</h4>
        <ul>
          <li>[file1]</li>
          <li>[file2]</li>
        </ul>
        <h4>Links</h4>
        <p><a href="[url]">View documentation</a></p>
      `,
      services: [],
    },
  ]

  for (const template of builtInTemplates) {
    await prisma.eventTemplate.upsert({
      where: { name: template.name },
      update: {},
      create: {
        ...template,
        tags: JSON.stringify(template.tags),
        services: JSON.stringify(template.services),
        isBuiltIn: true,
      },
    })
  }
}
