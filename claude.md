# Homelab Infrastructure

IaC and documentation to rebuild a 3-node Proxmox VE cluster running self-hosted services, managed with Terraform and Ansible. See `README.md` for the full rebuild order.

## Infrastructure Summary

*Verified live 2026-10-06.*

```
PROXMOX CLUSTER (MorpheusCluster): Proxmox VE 9.2.21, 3 nodes + QDevice
├─ node01 (192.168.20.20) - Primary: ansible-controller, core utilities VM, most LXCs
├─ node02 (192.168.20.21) - gitlab-runner, Authentik, Chronicle, Ghostfolio
└─ node03 (192.168.20.22) - Desktop-class: GitLab, Immich, PBS, Windows templates

NETWORK: TP-Link Omada SDN (ER605 + OC300), DNS on Pi-hole
├─ VLAN 10 - Internal LAN
├─ VLAN 20 - Homelab/Proxmox infrastructure, Synology NFS (192.168.20.32)
├─ VLAN 30 - IoT
├─ VLAN 40 - Production Docker services
├─ VLAN 50 - Guest WiFi
├─ VLAN 60 - Sonos
└─ VLAN 90 - Management (Pi-hole 192.168.90.53)

VMs (5): ansible-controller01, docker-vm-core-utilities01, gitlab-vm01,
         gitlab-runner-vm01, immich-vm01
LXCs (13):
├─ CT100 pbs-server        - Proxmox Backup Server
├─ CT200 docker-lxc-glance - Glance dashboard + widget APIs
├─ CT201 docker-lxc-bots   - Discord bots LXC
├─ CT202 pihole            - DNS + ad-blocking
├─ CT203 traefik-lxc       - Reverse proxy (Traefik v3)
├─ CT204 authentik-lxc     - SSO for every service
├─ CT205 docker-lxc-media  - Jellyfin + Arr stack
├─ CT206-209               - homeassistant, chronicle, ghostfolio, homepage (stopped)
├─ CT210 helios-lxc        - Helios API (control plane)
└─ CT211 codex-agent-lxc   - Codex autonomous patch-management agent
```

**Retired** (kept in repo for reference only, do not redeploy): Kubernetes (decommissioned 2026-05-23), Azure hybrid lab incl. Arc/Sentinel/Windows DCs (decommissioned 2026-05-25, see `Azure-Hybrid-Lab/README.md`), KratosPC Hyper-V host, OPNsense.

## Key Technologies

- **Proxmox VE** + **PBS**: virtualization and backups
- **Terraform** + **Ansible** + **Packer**: infrastructure as code, configuration management, templates
- **Docker Compose**: service deployment (no Kubernetes)
- **Traefik** + **Authentik**: reverse proxy + SSO for every service
- **GitLab CI/CD**: GitOps deployment pipeline (push to main, SSH deploy) and the patch-management issue backlog
- **Sentinel Discord bot**: infra commands, media requests, gated container update checks
- **Helios API** (https://github.com/herms14/helios-homelab-api): REST/CLI control plane over Proxmox, Synology, Omada
- **Codex patch pipeline**: audit, GitLab backlog, approval-gated patching, verification
- **Prometheus + Grafana + Jaeger + Uptime Kuma**: observability
- **Glance** (https://github.com/herms14/glance-dashboard): main dashboard

## Terraform Coverage

- `terraform/proxmox/main.tf` defines the VMs. It still contains retired groups (`k8s-controller`, `k8s-worker`, `linux-syslog-server`); prune them before applying.
- No LXCs are defined in Terraform (`lxc.tf` is empty). All 13 LXCs, including CT210 and CT211, were created manually and are restored from PBS.

## SSH Access

Standard ed25519 key auth to all nodes/VMs/LXCs; no plaintext keys or passwords live in this repo (see `.gitignore`).

## Adding a New Service

1. Terraform VM/LXC (or manual LXC) → 2. Ansible playbook → 3. Traefik route → 4. Pi-hole DNS → 5. Authentik (optional SSO) → 6. Update docs (`docs/SERVICES.md`, `docs/INVENTORY.md`, `CHANGELOG.md`)

## Repository Notes for AI Assistants

- `docs/` holds modular technical documentation, one file per topic; `docs/INVENTORY.md` is the current VM/LXC list
- `docs/legacy/`, `Azure-Hybrid-Lab/`, `terraform/azure/`, `terraform/hybrid-lab/`, `ansible-playbooks/`, `ansible/roles/k8s/` and `ansible/roles/opnsense/` are archived; do not treat them as current
- `.claude/` holds working context for AI-assisted sessions on this repo (task tracking, conventions, session history), start with `.claude/active-tasks.md`
- Real credentials and tokens are intentionally excluded from this repo, see `CREDENTIALS.md` (gitignored) for the private equivalent. Never commit secrets: this repo is public
- This repo mirrors a private Obsidian knowledge base that tracks day-to-day infrastructure changes in more detail than is appropriate to publish here