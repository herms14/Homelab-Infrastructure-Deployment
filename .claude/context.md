# Infrastructure Context

> Detailed infrastructure reference. Read when needed for specific lookups.

## Proxmox Cluster

| Node | Local IP | Tailscale IP | Purpose |
|------|----------|--------------|---------|
| node01 | 192.168.20.20 | 100.89.33.5 | Primary (K8s, LXCs, Core) |
| node02 | 192.168.20.21 | 100.96.195.27 | Services (Traefik, Authentik, GitLab) |
| node03 | 192.168.20.22 | 100.88.228.34 | Hybrid Lab (Windows VMs) |

**Wake-on-LAN MACs**: node01: `38:05:25:32:82:76`, node02: `84:47:09:4d:7a:ca`
**Node Exporter**: All nodes on port 9100

## Proxmox Backup Server (PBS)

| Setting | Value |
|---------|-------|
| VMID | 100 (LXC on node03) |
| IP | 192.168.20.50 |
| Web UI | https://192.168.20.50:8007 |
| Login | root (Linux PAM realm) |
| API Token | backup@pbs!pve |

**Datastores**: `main` (4TB HDD weekly), `daily` (1TB NVMe daily)

## Networks

| VLAN | Network | Purpose |
|------|---------|---------|
| 20 | 192.168.20.0/24 | Infrastructure |
| 40 | 192.168.40.0/24 | Services |
| 80 | 192.168.80.0/24 | Hybrid Lab (AD) |
| 90 | 192.168.90.0/24 | Management |

**DNS**: 192.168.90.53 (Pi-hole v6 + Unbound)

## Azure Environment

**Subscription**: FireGiants-Prod (`2212d587-1bad-4013-b605-b421b1f83c30`)
**Region**: Southeast Asia

| Resource | IP/Name | Purpose |
|----------|---------|---------|
| ubuntu-deploy-vm | 10.90.10.5 | Deployment VM (Terraform, Ansible) |
| law-homelab-sentinel | - | Log Analytics + Sentinel |
| linux-syslog-server01 | 192.168.40.5 (Arc) | Syslog aggregator |

**VPN**: Site-to-Site (OPNsense <-> Azure VPN Gateway)

## Deployed Hosts

| Host | IP | Type | Services |
|------|-----|------|----------|
| pbs-server | 192.168.20.50 | LXC 100 | Proxmox Backup Server |
| docker-lxc-glance | 192.168.40.12 | LXC 200 | Glance, APIs |
| pihole | 192.168.90.53 | LXC 202 | Pi-hole v6 + Unbound |
| docker-vm-core-utilities | 192.168.40.13 | VM 107 | Grafana, Prometheus, Sentinel Bot |
| docker-media | 192.168.40.11 | VM | Jellyfin, *arr stack |
| traefik | 192.168.40.20 | VM | Reverse proxy |
| authentik | 192.168.40.21 | VM | SSO |

## Synology NAS (192.168.20.31)

| Service | Port | Purpose |
|---------|------|---------|
| DSM | 5001 | Management |
| Plex | 32400 | Media streaming |
| NFS | 2049 | Proxmox storage |
| SNMP | 161 | Monitoring |

**Media Paths**: `/volume2/Proxmox-Media/{Movies,Series,Music}`

## Service URLs

| Category | Service | URL |
|----------|---------|-----|
| Core | Proxmox | https://proxmox.hrmsmrflrii.xyz |
| Core | Traefik | https://traefik.hrmsmrflrii.xyz |
| Core | Authentik | https://auth.hrmsmrflrii.xyz |
| Media | Jellyfin | https://jellyfin.hrmsmrflrii.xyz |
| Media | Plex | http://192.168.20.31:32400/web |
| Monitoring | Grafana | https://grafana.hrmsmrflrii.xyz |
| Monitoring | Prometheus | https://prometheus.hrmsmrflrii.xyz |
| Dashboard | Glance | https://glance.hrmsmrflrii.xyz |
| Productivity | GitLab | https://gitlab.hrmsmrflrii.xyz |
| Productivity | Immich | https://photos.hrmsmrflrii.xyz |

## Discord Bot: Sentinel

**Host**: docker-vm-core-utilities01 (192.168.40.13)
**Config**: `/opt/sentinel-bot/`
**Webhook Port**: 5050

| Cog | Channel | Purpose |
|-----|---------|---------|
| Homelab | #homelab-infrastructure | Proxmox status, VM/LXC management |
| Updates | #container-updates | Watchtower webhooks |
| Media | #media-downloads | Download tracking |
| GitLab | #project-management | Issue management |
| Tasks | #claude-tasks | Claude task queue |

**Commands**: `/help`, `/insight`, `/homelab status`, `/vm <id> restart`, `/lxc <id> restart`, `/check`, `/downloads`

## Key File Locations

**LXC 200 (192.168.40.12)**:
- Glance: `/opt/glance/config/glance.yml`
- Media Stats API: `/opt/media-stats-api/`
- Reddit Manager: `/opt/reddit-manager/`

**VM 107 (192.168.40.13)**:
- Sentinel Bot: `/opt/sentinel-bot/`
- Monitoring Stack: `/opt/monitoring/`
- Prometheus: `/opt/monitoring/prometheus/prometheus.yml`
- Grafana Dashboards: `/opt/monitoring/grafana/dashboards/`

**Traefik (192.168.40.20)**:
- Config: `/opt/traefik/config/`
- Dynamic: `/opt/traefik/config/dynamic/services.yml`

## IaC Tools

| Tool | Location | Purpose |
|------|----------|---------|
| Terraform | Local repo | VM/LXC provisioning |
| Ansible | 192.168.20.30 (`~/ansible/`) | Config management |
| Packer | 192.168.20.30 (`~/packer/`) | Template creation |
