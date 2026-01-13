import { prisma } from '@/lib/prisma'

// Seed default infrastructure nodes from CLAUDE.md
export async function seedInfrastructureNodes() {
  const defaultNodes = [
    // Proxmox Cluster
    { name: 'node01', type: 'proxmox', ip: '192.168.20.20', description: 'Primary VM Host', parentId: null },
    { name: 'node02', type: 'proxmox', ip: '192.168.20.21', description: 'Service Host', parentId: null },
    { name: 'node03', type: 'proxmox', ip: '192.168.20.22', description: 'Additional Node', parentId: null },

    // Core VMs
    { name: 'ansible', type: 'vm', ip: '192.168.20.30', description: 'Ansible Controller', parentId: null },

    // Docker LXCs
    { name: 'docker-media', type: 'lxc', ip: '192.168.40.11', description: 'Media Stack (Jellyfin, *arr)', parentId: null },
    { name: 'docker-glance', type: 'lxc', ip: '192.168.40.12', description: 'Glance Dashboard', parentId: null },
    { name: 'docker-utils', type: 'lxc', ip: '192.168.40.13', description: 'Grafana, Prometheus, Bots', parentId: null },
    { name: 'traefik', type: 'lxc', ip: '192.168.40.20', description: 'Reverse Proxy', parentId: null },
    { name: 'authentik', type: 'lxc', ip: '192.168.40.21', description: 'SSO/Identity', parentId: null },
    { name: 'chronicle', type: 'lxc', ip: '192.168.40.15', description: 'Timeline App', parentId: null },

    // Services
    { name: 'synology-nas', type: 'service', ip: '192.168.20.31', description: 'Synology NAS', parentId: null },
    { name: 'pi-hole', type: 'service', ip: '192.168.90.53', description: 'DNS Server', parentId: null },
  ]

  for (const node of defaultNodes) {
    await prisma.infrastructureNode.upsert({
      where: { name: node.name },
      update: node,
      create: {
        ...node,
        services: '[]',
        metadata: '{}',
      },
    })
  }
}
