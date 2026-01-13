/**
 * Database Seeder
 *
 * Seeds the database with initial historical events from the homelab journey.
 * Run: npx ts-node scripts/seed.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SeedEvent {
  title: string
  date: string
  content: string
  category: string
  tags: string[]
  source?: string
  sourceRef?: string
}

const seedEvents: SeedEvent[] = [
  // 2024
  {
    title: 'Initial Homelab Documentation Created',
    date: '2024-12-01',
    content: `<p>Started documenting the homelab infrastructure. Created the first version of the technical documentation covering:</p>
<ul>
<li>Network architecture and VLAN configuration</li>
<li>Proxmox cluster setup plans</li>
<li>Service deployment strategy</li>
</ul>
<p>This marked the beginning of the infrastructure-as-code journey.</p>`,
    category: 'documentation',
    tags: ['documentation', 'planning'],
    source: 'manual',
  },

  // December 2024 - Initial Setup
  {
    title: 'Proxmox VE 9.1 Installed on Node01',
    date: '2024-12-14',
    content: `<p>First Proxmox node deployed! Node01 (192.168.20.20) is now running Proxmox VE 9.1.2.</p>
<h3>Hardware Specs</h3>
<ul>
<li>Dell OptiPlex Micro</li>
<li>Intel i7 (10th Gen)</li>
<li>32GB RAM</li>
<li>500GB NVMe SSD</li>
</ul>
<h3>Initial Configuration</h3>
<ul>
<li>VLAN trunking enabled on management interface</li>
<li>Network bridges configured for VLAN 20 and VLAN 40</li>
<li>SSH access configured with ed25519 keys</li>
</ul>`,
    category: 'infrastructure',
    tags: ['proxmox', 'node01', 'virtualization'],
    source: 'manual',
  },
  {
    title: 'VLAN Network Architecture Implemented',
    date: '2024-12-14',
    content: `<p>Implemented enterprise-grade network segmentation using VLANs:</p>
<h3>VLAN Configuration</h3>
<ul>
<li><strong>VLAN 20</strong> (192.168.20.0/24): Infrastructure - Proxmox nodes, Kubernetes, Ansible</li>
<li><strong>VLAN 40</strong> (192.168.40.0/24): Services - Docker hosts, Applications</li>
<li><strong>VLAN 90</strong> (192.168.90.0/24): Management - Pi-hole DNS, Network management</li>
</ul>
<p>TP-Link Omada network equipment configured with trunk ports to Proxmox nodes.</p>`,
    category: 'network',
    tags: ['network', 'vlan', 'omada'],
    source: 'manual',
  },
  {
    title: 'Cloud-Init Template Fixed',
    date: '2024-12-15',
    content: `<p>Resolved cloud-init boot issues that were preventing VMs from starting properly.</p>
<h3>Issue</h3>
<p>VMs were hanging on boot waiting for cloud-init datasource.</p>
<h3>Solution</h3>
<ul>
<li>Added NoCloud datasource configuration</li>
<li>Created proper cloud-init ISO template</li>
<li>Updated Terraform modules to use correct cloud-init settings</li>
</ul>`,
    category: 'fix',
    tags: ['cloud-init', 'terraform', 'proxmox'],
    source: 'manual',
  },
  {
    title: 'First VMs Deployed via Terraform',
    date: '2024-12-15',
    content: `<p>Successfully deployed first VMs using Terraform infrastructure-as-code!</p>
<h3>Deployed VMs</h3>
<ul>
<li>Ansible Controller (192.168.20.30)</li>
<li>Docker Media Host (192.168.40.11)</li>
</ul>
<h3>Terraform Stack</h3>
<ul>
<li>Proxmox provider with API token authentication</li>
<li>Modular VM configuration</li>
<li>Cloud-init for initial provisioning</li>
</ul>`,
    category: 'infrastructure',
    tags: ['terraform', 'iac', 'automation'],
    source: 'manual',
  },
  {
    title: 'Kubernetes Infrastructure Foundation',
    date: '2024-12-16',
    content: `<p>Laid the groundwork for K3s Kubernetes cluster deployment.</p>
<h3>Cluster Design</h3>
<ul>
<li>3 control plane nodes for HA</li>
<li>6 worker nodes (3 general + 3 storage)</li>
<li>MetalLB for load balancing</li>
<li>Longhorn for distributed storage</li>
</ul>
<h3>VMs Provisioned</h3>
<ul>
<li>k8s-ctrl-01/02/03 (192.168.20.{60-62})</li>
<li>k8s-worker-01/02/03 (192.168.20.{63-65})</li>
<li>k8s-storage-01/02/03 (192.168.20.{66-68})</li>
</ul>`,
    category: 'infrastructure',
    tags: ['kubernetes', 'k3s', 'cluster'],
    source: 'manual',
  },
  {
    title: 'Observability Stack Deployed',
    date: '2024-12-19',
    content: `<p>Comprehensive monitoring and observability stack now live!</p>
<h3>Components</h3>
<ul>
<li><strong>Prometheus</strong> - Metrics collection</li>
<li><strong>Grafana</strong> - Visualization dashboards</li>
<li><strong>Loki</strong> - Log aggregation</li>
<li><strong>Promtail</strong> - Log shipping</li>
</ul>
<h3>Dashboards Created</h3>
<ul>
<li>Container Status History</li>
<li>Node Exporter Full</li>
<li>Docker Host Monitoring</li>
</ul>
<p>Accessible at: https://grafana.hrmsmrflrii.xyz</p>`,
    category: 'service',
    tags: ['grafana', 'prometheus', 'monitoring', 'observability'],
    source: 'manual',
  },
  {
    title: 'Glance Dashboard Deployed',
    date: '2024-12-20',
    content: `<p>Beautiful unified dashboard for the homelab is now live!</p>
<h3>Features</h3>
<ul>
<li>Service status monitoring</li>
<li>System resource widgets</li>
<li>Custom theming with catppuccin colors</li>
<li>Embedded Grafana dashboards</li>
</ul>
<p>Accessible at: https://glance.hrmsmrflrii.xyz</p>`,
    category: 'service',
    tags: ['glance', 'dashboard', 'monitoring'],
    source: 'manual',
  },

  // Christmas 2024 Service Expansion
  {
    title: 'Life Progress API Deployed',
    date: '2024-12-22',
    content: `<p>Custom Life Progress tracking API deployed to visualize life milestones.</p>
<h3>Features</h3>
<ul>
<li>Birthday-based progress calculations</li>
<li>Custom milestone tracking</li>
<li>Integration with Glance dashboard</li>
</ul>`,
    category: 'service',
    tags: ['api', 'custom-app', 'glance'],
    source: 'manual',
  },
  {
    title: 'Glance Custom Theming Applied',
    date: '2024-12-24',
    content: `<p>Applied custom Catppuccin Mocha theming to Glance dashboard.</p>
<ul>
<li>Dark mode optimized</li>
<li>Category-specific color coding</li>
<li>Custom widget styling</li>
</ul>`,
    category: 'service',
    tags: ['glance', 'theming', 'ui'],
    source: 'manual',
  },
  {
    title: 'Christmas Day Service Expansion',
    date: '2024-12-25',
    content: `<p>Major service deployment on Christmas Day!</p>
<h3>New Services</h3>
<ul>
<li><strong>Lagident</strong> - Badge/achievement system</li>
<li><strong>Karakeep</strong> - Bookmark manager</li>
<li><strong>Wizarr</strong> - Plex/Jellyfin invitation system</li>
<li><strong>Tracearr</strong> - Media request tracking</li>
</ul>
<p>All services configured with Traefik routing and Authentik SSO.</p>`,
    category: 'milestone',
    tags: ['services', 'deployment', 'christmas'],
    source: 'manual',
  },
  {
    title: 'Discord Bots Deployed',
    date: '2024-12-26',
    content: `<p>Custom Discord bots for homelab notifications and management.</p>
<h3>Bots</h3>
<ul>
<li><strong>Sentinel Bot</strong> - Infrastructure alerts and monitoring</li>
<li><strong>Service Status Bot</strong> - Real-time service health notifications</li>
</ul>
<p>Integrated with Grafana alerting and Prometheus metrics.</p>`,
    category: 'service',
    tags: ['discord', 'bots', 'automation', 'notifications'],
    source: 'manual',
  },
  {
    title: 'Omada Dashboard Integration',
    date: '2024-12-26',
    content: `<p>Created custom Grafana dashboard for TP-Link Omada network monitoring.</p>
<h3>Metrics Tracked</h3>
<ul>
<li>Connected clients per AP</li>
<li>Network throughput</li>
<li>Client distribution across VLANs</li>
<li>Switch port utilization</li>
</ul>`,
    category: 'service',
    tags: ['grafana', 'omada', 'network', 'monitoring'],
    source: 'manual',
  },
  {
    title: 'Homelab Blog Launched',
    date: '2024-12-27',
    content: `<p>Personal blog for documenting the homelab journey went live!</p>
<h3>Details</h3>
<ul>
<li>Built with Hugo static site generator</li>
<li>PaperMod theme</li>
<li>Hosted on GitHub Pages</li>
<li>Auto-deploy via GitHub Actions</li>
</ul>
<p>URL: https://herms14.github.io/Clustered-Thoughts/</p>`,
    category: 'milestone',
    tags: ['blog', 'documentation', 'hugo'],
    source: 'manual',
  },
  {
    title: 'Packer Templates Created',
    date: '2024-12-30',
    content: `<p>Infrastructure automation extended with Packer templates for VM images.</p>
<h3>Templates</h3>
<ul>
<li>Ubuntu 22.04 Cloud Image</li>
<li>Ubuntu 24.04 Cloud Image</li>
<li>Windows Server 2022 (Azure)</li>
</ul>
<p>Automated image builds with cloud-init pre-configuration.</p>`,
    category: 'infrastructure',
    tags: ['packer', 'automation', 'templates'],
    source: 'manual',
  },

  // 2025
  {
    title: 'Node02 Added to Cluster',
    date: '2025-01-02',
    content: `<p>Second Proxmox node joined the cluster!</p>
<h3>Node02 Specs</h3>
<ul>
<li>Dell OptiPlex Micro</li>
<li>Intel i7 (10th Gen)</li>
<li>32GB RAM</li>
<li>1TB NVMe SSD</li>
</ul>
<h3>Services Migrated</h3>
<ul>
<li>Traefik reverse proxy</li>
<li>Authentik SSO</li>
<li>GitLab</li>
<li>Immich</li>
</ul>`,
    category: 'infrastructure',
    tags: ['proxmox', 'cluster', 'node02'],
    source: 'manual',
  },
  {
    title: 'Sentinel Bot Consolidated',
    date: '2025-01-02',
    content: `<p>Unified all Discord bot functionality into a single Sentinel Bot.</p>
<h3>Features</h3>
<ul>
<li>Service health monitoring</li>
<li>Grafana alert forwarding</li>
<li>Infrastructure status commands</li>
<li>Daily summary reports</li>
</ul>`,
    category: 'service',
    tags: ['discord', 'sentinel-bot', 'automation'],
    source: 'manual',
  },
  {
    title: 'Azure Hybrid Lab Setup',
    date: '2025-01-03',
    content: `<p>Established hybrid cloud connection with Azure.</p>
<h3>Components</h3>
<ul>
<li>Site-to-Site VPN (OPNsense &lt;-&gt; Azure)</li>
<li>ubuntu-deploy-vm for Terraform/Ansible</li>
<li>Microsoft Sentinel SIEM integration</li>
</ul>
<h3>Active Directory</h3>
<ul>
<li>Domain: hrmsmrflrii.xyz</li>
<li>2 Domain Controllers</li>
<li>2 Read-Only DCs</li>
</ul>`,
    category: 'infrastructure',
    tags: ['azure', 'hybrid', 'active-directory', 'vpn'],
    source: 'manual',
  },
  {
    title: 'Home Assistant Integration',
    date: '2025-01-07',
    content: `<p>Home Assistant deployed for smart home automation.</p>
<h3>Integrations</h3>
<ul>
<li>Proxmox monitoring</li>
<li>Docker container status</li>
<li>Network device tracking</li>
<li>Energy monitoring</li>
</ul>`,
    category: 'service',
    tags: ['home-assistant', 'automation', 'iot'],
    source: 'manual',
  },
  {
    title: 'VM to LXC Migration',
    date: '2025-01-07',
    content: `<p>Migrated several services from VMs to LXC containers for better resource efficiency.</p>
<h3>Converted Services</h3>
<ul>
<li>Glance Dashboard</li>
<li>Pi-hole DNS</li>
<li>Various utility containers</li>
</ul>
<h3>Benefits</h3>
<ul>
<li>Reduced memory overhead</li>
<li>Faster startup times</li>
<li>Lower storage footprint</li>
</ul>`,
    category: 'infrastructure',
    tags: ['lxc', 'containers', 'optimization'],
    source: 'manual',
  },
  {
    title: 'Technical Manual V2 Published',
    date: '2025-01-08',
    content: `<p>Comprehensive Technical Manual V2 completed with detailed documentation.</p>
<h3>Sections Added</h3>
<ul>
<li>Storage architecture (NFS, Longhorn)</li>
<li>Kubernetes deployment guide</li>
<li>Observability stack configuration</li>
<li>Service onboarding procedures</li>
</ul>`,
    category: 'documentation',
    tags: ['documentation', 'technical-manual'],
    source: 'manual',
  },

  // January 2026 (Current)
  {
    title: 'Node03 Added - 3-Node HA Cluster',
    date: '2026-01-11',
    content: `<p>Third Proxmox node added, achieving full HA cluster!</p>
<h3>Node03 Specs</h3>
<ul>
<li>AMD Ryzen 9 5900XT (12-core)</li>
<li>64GB DDR4 RAM</li>
<li>2TB NVMe SSD</li>
<li>Desktop PC form factor</li>
</ul>
<h3>Cluster Status</h3>
<ul>
<li>3 nodes + Qdevice for quorum</li>
<li>HA enabled for critical services</li>
<li>Live migration capability</li>
</ul>`,
    category: 'milestone',
    tags: ['proxmox', 'cluster', 'node03', 'ha'],
    source: 'manual',
  },
  {
    title: 'Power Management Optimizations',
    date: '2026-01-11',
    content: `<p>Implemented power-saving configurations for Node03 (desktop PC).</p>
<h3>Configurations Applied</h3>
<ul>
<li>AMD P-State driver enabled</li>
<li>CPU governor set to powersave</li>
<li>Deep C-States enabled</li>
<li>PCIe ASPM power management</li>
<li>SATA link power management</li>
</ul>
<h3>Expected Savings</h3>
<p>30-50% reduction in idle power consumption.</p>`,
    category: 'infrastructure',
    tags: ['power-management', 'optimization', 'node03'],
    source: 'manual',
  },
  {
    title: 'Synology NAS RAID Monitoring',
    date: '2026-01-11',
    content: `<p>Added comprehensive Synology NAS monitoring to Grafana.</p>
<h3>Metrics Tracked</h3>
<ul>
<li>RAID health status</li>
<li>Drive temperatures</li>
<li>Volume utilization</li>
<li>Read/write IOPS</li>
</ul>`,
    category: 'service',
    tags: ['synology', 'nas', 'monitoring', 'grafana'],
    source: 'manual',
  },
]

async function seed() {
  console.log('Seeding database with historical events...')

  try {
    // First, create default categories
    const categories = [
      { name: 'infrastructure', color: '#3b82f6', icon: 'Server' },
      { name: 'service', color: '#22c55e', icon: 'Box' },
      { name: 'milestone', color: '#8b5cf6', icon: 'Trophy' },
      { name: 'fix', color: '#f59e0b', icon: 'Wrench' },
      { name: 'documentation', color: '#6b7280', icon: 'FileText' },
      { name: 'network', color: '#06b6d4', icon: 'Network' },
      { name: 'storage', color: '#f97316', icon: 'HardDrive' },
    ]

    console.log('Creating categories...')
    for (const cat of categories) {
      await prisma.category.upsert({
        where: { name: cat.name },
        update: cat,
        create: cat,
      })
    }

    console.log('Creating events...')
    let created = 0
    let skipped = 0

    for (const event of seedEvents) {
      // Check if event already exists
      const existing = await prisma.event.findFirst({
        where: {
          title: event.title,
          date: new Date(event.date),
        },
      })

      if (existing) {
        skipped++
        continue
      }

      await prisma.event.create({
        data: {
          title: event.title,
          date: new Date(event.date),
          content: event.content,
          category: event.category,
          tags: JSON.stringify(event.tags),
          source: event.source || 'manual',
          sourceRef: event.sourceRef,
        },
      })

      created++
      console.log(`Created: ${event.title}`)
    }

    console.log(`\nSeeding complete: ${created} created, ${skipped} skipped`)

  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  seed()
}

export { seed }
