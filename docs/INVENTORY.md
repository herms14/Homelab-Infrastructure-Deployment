# Deployed Infrastructure Inventory

> Part of the [Proxmox Infrastructure Documentation](../claude.md)

*Last updated: October 6, 2026 (verified live against the cluster with `pvesh`)*

## Summary

**Cluster**: MorpheusCluster (3 nodes + QDevice, quorate), Proxmox VE 9.2.21

| Category | Count | Notes |
|----------|-------|-------|
| Proxmox nodes | 3 | node01, node02, node03 + QDevice for quorum |
| Virtual machines | 5 | All running |
| VM templates | 3 | 1 Ubuntu cloud-init, 2 Windows Server (Packer) |
| LXC containers | 13 | 12 running, `homepage-lxc` stopped |
| Kubernetes | 0 | Decommissioned 2026-05-23 |
| Azure / hybrid lab | 0 | Decommissioned 2026-05-25 |

## Proxmox Nodes

| Node | IP | CPU | RAM | Role |
|------|----|-----|-----|------|
| node01 | 192.168.20.20 | 16 | 61 GB | Primary host: Ansible controller, core utilities VM, most LXCs |
| node02 | 192.168.20.21 | 16 | 28 GB | GitLab runner, Authentik, Chronicle, Ghostfolio |
| node03 | 192.168.20.22 | 32 | 31 GB | Desktop-class node: GitLab, Immich, PBS, Windows templates |

## Synology NAS

| Interface | IP | Purpose |
|-----------|----|---------|
| eth0 (1 GbE) | 192.168.20.31 | Management / legacy |
| eth1 (10 GbE NIC on 2.5G switch) | 192.168.20.32 | **Primary NFS interface, use for all mounts** |

See [STORAGE.md](./STORAGE.md) for exports and storage pools.

## Virtual Machines

| VMID | Hostname | Node | IP | RAM | Purpose |
|------|----------|------|----|-----|---------|
| 103 | ansible-controller01 | node01 | 192.168.20.30 | 8 GB | Ansible, Packer, patch-audit stages of the patch pipeline |
| 106 | gitlab-vm01 | node03 | 192.168.40.23 | 8 GB | GitLab CE (GitOps, issue backlog for patch pipeline) |
| 107 | docker-vm-core-utilities01 | node01 | 192.168.40.13 | 24 GB | Monitoring, n8n, Paperless-ngx, Karakeep, Sentinel bot, Glance helper APIs |
| 108 | immich-vm01 | node03 | 192.168.40.22 | 16 GB | Immich photo management |
| 121 | gitlab-runner-vm01 | node02 | 192.168.40.24 | 2 GB | GitLab CI/CD runner |

### Templates

| VMID | Name | Node | Built with |
|------|------|------|-----------|
| 1000 | tpl-ubuntuv24.04-v1 | node01 | Ubuntu 24.04 cloud image + cloud-init ([legacy/CREATE_TEMPLATE_GUIDE.md](./legacy/CREATE_TEMPLATE_GUIDE.md)) |
| 9022 | WS2022-Template | node03 | Packer ([../packer/windows-server-2022-proxmox](../packer/windows-server-2022-proxmox)) |
| 9025 | WS2025-Template | node03 | Packer ([../packer/windows-server-2025-proxmox](../packer/windows-server-2025-proxmox)) |

## LXC Containers

| CTID | Hostname | Node | IP | RAM | Purpose |
|------|----------|------|----|-----|---------|
| 100 | pbs-server | node03 | 192.168.20.50 | 4 GB | Proxmox Backup Server (`:8007`) |
| 200 | docker-lxc-glance | node01 | 192.168.40.12 | 4 GB | Glance (`:8080`), proxmox-nodes-api (`:5061`), pihole-stats-api (`:5055`) |
| 201 | docker-lxc-bots | node01 | 192.168.40.17 | 2 GB | Discord bots LXC (legacy bots, re-IPed from .14 on 2026-10-05). The Sentinel bot itself runs on docker-vm-core-utilities01 |
| 202 | pihole | node01 | 192.168.90.53 | 1 GB | Pi-hole v6 + Unbound, internal DNS |
| 203 | traefik-lxc | node01 | 192.168.40.20 | 2 GB | Traefik v3 reverse proxy |
| 204 | authentik-lxc | node02 | 192.168.40.21 | 4 GB | Authentik SSO |
| 205 | docker-lxc-media | node01 | 192.168.40.11 | 8 GB | Jellyfin + Arr stack |
| 206 | homeassistant-lxc | node01 | 192.168.40.25 | 4 GB | Home Assistant |
| 207 | chronicle-lxc | node02 | 192.168.40.15 | 2 GB | Homelab Chronicle (changelog web app) |
| 208 | ghostfolio-lxc | node02 | 192.168.40.26 | 4 GB | Ghostfolio |
| 209 | homepage-lxc | node01 | 192.168.40.27 | 1 GB | Homepage dashboard (**stopped**) |
| 210 | helios-lxc | node01 | 192.168.40.14 | 2 GB | [Helios API](https://github.com/herms14/helios-homelab-api) (`:8000`, `:8001`, `:8002`) |
| 211 | codex-agent-lxc | node01 | 192.168.40.16 | 2 GB | Codex autonomous patch-management agent (`sre-agent.service`) |

> **Terraform coverage**: none of the LXCs above, including the new `helios-lxc` (CT210) and `codex-agent-lxc` (CT211), are defined in `terraform/proxmox/lxc.tf`. They were created manually in Proxmox and are restored from PBS backups during a rebuild.

## Backups

| Job | Schedule | Target | Guests |
|-----|----------|--------|--------|
| Daily | 19:00 | `pbs-daily` (PBS datastore) | All VMs and LXCs except PBS itself |
| Weekly | Fri 02:00 | `pbs-main` (PBS datastore) | Same list |
| NFS | Sun 03:00 | `ProxmoxData` (Synology NFS) | Selected guests |

PBS (CT100) is set to `onboot: 1` with `startup: order=1` so it comes up before guest backups run. See [PBS_DEPLOYMENT.md](./PBS_DEPLOYMENT.md) and [PBS_DISASTER_RECOVERY.md](./PBS_DISASTER_RECOVERY.md).

## Deployment Details

| Setting | Value |
|---------|-------|
| Deployment Method | Cloud-init template (VMs), Proxmox CT templates (LXCs) |
| Storage | VMDisks (NFS on Synology `192.168.20.32`) |
| Network | vmbr0, VLAN-aware (VLAN 20 native, VLAN 40/90 tagged) |
| DNS | 192.168.90.53 (Pi-hole) |
| SSH User | hermes-admin (guests), root (nodes) |
| SSH Auth | Key-based only |
| Management | Ansible from ansible-controller01 |

## IP Reservations

### VLAN 20

| Range | Purpose |
|-------|---------|
| 33-49 | Future infrastructure hosts (former Kubernetes range, now free) |
| 100-199 | LXC containers |
| 200-254 | Future VMs |

### VLAN 40

| Range | Purpose |
|-------|---------|
| 18-19 | Additional Docker hosts |
| 28-39 | Monitoring & additional services |
| 40-254 | Future services |

## Retired

| Component | Status |
|-----------|--------|
| Kubernetes cluster (3 controllers + 6 workers, 192.168.20.32-45) | Decommissioned 2026-05-23 |
| linux-syslog-server01 (192.168.40.5) | No longer running |
| Azure hybrid lab (Arc, Sentinel, Windows DCs, VWAN) | Decommissioned 2026-05-25, see [../Azure-Hybrid-Lab/README.md](../Azure-Hybrid-Lab/README.md) |
| KratosPC Hyper-V host | Retired |
| OPNsense | Not in use, network is Omada SDN |

## Related Documentation

- [Proxmox](./PROXMOX.md) - Node configuration
- [Networking](./NETWORKING.md) - IP allocation details
- [Services](./SERVICES.md) - Service details
- [Terraform](./TERRAFORM.md) - Deployment configuration
- [CI/CD](./CICD.md) - GitLab automation pipeline
