# Proxmox Homelab Infrastructure

[![Proxmox](https://img.shields.io/badge/Proxmox-VE%209.2.21-orange)](https://www.proxmox.com/)
[![Terraform](https://img.shields.io/badge/Terraform-1.5+-purple)](https://www.terraform.io/)
[![Ansible](https://img.shields.io/badge/Ansible-2.15+-red)](https://www.ansible.com/)

Documentation and code to **redeploy the entire homelab from scratch**: a 3-node Proxmox VE cluster running media, identity/SSO, monitoring, automation and personal apps, all reverse-proxied through Traefik and gated behind Authentik. Infrastructure is built with Terraform and configured with Ansible, backed up to Proxmox Backup Server, and patched by an approval-gated AI agent pipeline.

## Infrastructure at a Glance

*Verified against the live cluster on 2026-10-06.*

| Component | Details |
|-----------|---------|
| **Proxmox Cluster** | MorpheusCluster, 3 nodes + QDevice, Proxmox VE 9.2.21 (kernel 7.0.14-20-pve) |
| **Network** | TP-Link Omada SDN (ER605 gateway, OC300 controller, SG3210/SG2210P switches), 8 VLANs |
| **Storage** | Synology NAS over NFS (`192.168.20.32`), local LVM on each node |
| **Backups** | Proxmox Backup Server LXC (CT100) on node03, daily + weekly jobs |
| **Virtual Machines** | 5 (+ 3 templates) |
| **LXC Containers** | 13 (12 running) |
| **Services** | 40+ containerized applications |
| **SSL/HTTPS** | Let's Encrypt wildcard via Cloudflare DNS-01 |
| **Domain** | `https://<service>.hrmsmrflrii.xyz` |

### Proxmox Nodes

| Node | IP | CPU / RAM | Main workloads |
|------|----|-----------|----------------|
| node01 | 192.168.20.20 | 16 CPU / 61 GB | Ansible controller, core utilities VM, Traefik, Pi-hole, media, Glance, Helios, codex-agent |
| node02 | 192.168.20.21 | 16 CPU / 28 GB | GitLab runner, Authentik, Chronicle, Ghostfolio |
| node03 | 192.168.20.22 | 32 CPU / 31 GB | GitLab, Immich, PBS, Windows Server templates |

### Virtual Machines

| VMID | Name | Node | IP | RAM | Role |
|------|------|------|----|-----|------|
| 103 | ansible-controller01 | node01 | 192.168.20.30 | 8 GB | Ansible, Packer, patch-audit scripts |
| 106 | gitlab-vm01 | node03 | 192.168.40.23 | 8 GB | GitLab CE |
| 107 | docker-vm-core-utilities01 | node01 | 192.168.40.13 | 24 GB | Monitoring, n8n, Paperless-ngx, Karakeep, Sentinel bot, Glance helper APIs |
| 108 | immich-vm01 | node03 | 192.168.40.22 | 16 GB | Immich |
| 121 | gitlab-runner-vm01 | node02 | 192.168.40.24 | 2 GB | GitLab CI/CD runner |

Templates: `tpl-ubuntuv24.04-v1` (1000, node01), `WS2022-Template` (9022, node03), `WS2025-Template` (9025, node03).

### LXC Containers

| CTID | Name | Node | IP | Role |
|------|------|------|----|------|
| 100 | pbs-server | node03 | 192.168.20.50 | Proxmox Backup Server (`:8007`) |
| 200 | docker-lxc-glance | node01 | 192.168.40.12 | Glance dashboard + proxmox-nodes-api, pihole-stats-api |
| 201 | docker-lxc-bots | node01 | 192.168.40.17 | Discord bots LXC |
| 202 | pihole | node01 | 192.168.90.53 | Internal DNS (Pi-hole v6 + Unbound) |
| 203 | traefik-lxc | node01 | 192.168.40.20 | Traefik reverse proxy |
| 204 | authentik-lxc | node02 | 192.168.40.21 | Authentik SSO |
| 205 | docker-lxc-media | node01 | 192.168.40.11 | Jellyfin + Arr stack |
| 206 | homeassistant-lxc | node01 | 192.168.40.25 | Home Assistant |
| 207 | chronicle-lxc | node02 | 192.168.40.15 | Homelab Chronicle |
| 208 | ghostfolio-lxc | node02 | 192.168.40.26 | Ghostfolio |
| 209 | homepage-lxc | node01 | 192.168.40.27 | Homepage (stopped) |
| 210 | helios-lxc | node01 | 192.168.40.14 | Helios API (`:8000`, `:8001`, `:8002`) |
| 211 | codex-agent-lxc | node01 | 192.168.40.16 | Codex autonomous patch-management agent |

Full details, backup jobs and IP reservations: [docs/INVENTORY.md](docs/INVENTORY.md).

### Services Running

| Category | Services |
|----------|----------|
| **Reverse Proxy** | Traefik v3 with automatic SSL (Let's Encrypt DNS-01) |
| **Identity** | Authentik (SSO for every service) |
| **DNS** | Pi-hole v6 + Unbound |
| **Media** | Jellyfin, Radarr, Sonarr, Lidarr, Prowlarr, Bazarr, Overseerr, Jellyseerr, Tdarr, Autobrr |
| **Photos** | Immich |
| **Documents / Bookmarks** | Paperless-ngx, Karakeep |
| **DevOps** | GitLab CE + runner (GitOps pipeline: push to main, deploy) |
| **Automation** | n8n, Sentinel Discord bot (infra ops + gated container updates) |
| **Dashboards** | [Glance](https://github.com/herms14/glance-dashboard) with custom helper APIs, Homepage (stopped) |
| **Monitoring** | Prometheus, Grafana, Uptime Kuma, Jaeger, Speedtest Tracker |
| **Home Automation** | Home Assistant |
| **Personal Finance** | Ghostfolio |
| **Control Plane** | [Helios API](https://github.com/herms14/helios-homelab-api) |
| **Patch Management** | Codex agent pipeline on `codex-agent-lxc` |

### Retired / Archived

| Component | Status | Kept in repo |
|-----------|--------|--------------|
| Kubernetes (9-node cluster) | Decommissioned 2026-05-23 | `ansible/roles/k8s/`, `ansible/inventory/k8s.ini`, `docs/legacy/Kubernetes_*.md`, `docs/KUBERNETES_GLANCE_TUTORIAL.md` (reference only) |
| Azure hybrid lab (Arc, Sentinel, Windows DCs, VWAN) | Decommissioned 2026-05-25 | [Azure-Hybrid-Lab/](Azure-Hybrid-Lab/README.md), `terraform/azure/`, `terraform/hybrid-lab/`, `ansible-playbooks/hybrid-lab/`, `docs/AZURE_*.md` (reference only) |
| KratosPC Hyper-V host | Retired | n/a |
| OPNsense | Not in use, routing/VLANs are Omada SDN and DNS is Pi-hole | `ansible/roles/opnsense/` (reference only) |

> [!WARNING]
> `terraform/proxmox/main.tf` still contains the old `k8s-controller`, `k8s-worker` and `linux-syslog-server` VM groups. Remove them (or set `count = 0`) before running `terraform apply` on a fresh cluster, otherwise Terraform will recreate retired VMs.

## Rebuild Order (from bare metal)

Follow these steps in order. Each step depends on the ones before it.

| # | Step | What to do | Repo reference |
|---|------|------------|----------------|
| 1 | **Network / VLANs** | Adopt the Omada devices, create VLANs 10/20/30/40/50/60/90, switch trunk ports and gateway ACLs | [docs/NETWORKING.md](docs/NETWORKING.md) |
| 2 | **Proxmox cluster + QDevice** | Install Proxmox VE 9.x on node01-03, VLAN-aware `vmbr0`, create MorpheusCluster, add the QDevice for quorum, configure SSL | [docs/PROXMOX.md](docs/PROXMOX.md), [ansible/playbooks/proxmox/configure-ssl.yml](ansible/playbooks/proxmox/configure-ssl.yml) |
| 3 | **Storage / NFS** | Create Synology NFS exports, add `VMDisks`/`ISOs` storage pools and the manual `/mnt/nfs/*` mounts on every node using `192.168.20.32` | [docs/STORAGE.md](docs/STORAGE.md) |
| 4 | **PBS (restore or fresh)** | Recreate CT100 on node03 and attach the existing datastores, or deploy fresh. With PBS back, **most guests can be restored directly from backup**, which is faster than steps 5-11 | [docs/PBS_DEPLOYMENT.md](docs/PBS_DEPLOYMENT.md), [docs/PBS_DISASTER_RECOVERY.md](docs/PBS_DISASTER_RECOVERY.md), [docs/DISASTER_RECOVERY.md](docs/DISASTER_RECOVERY.md) |
| 5 | **Templates** | Build the Ubuntu 24.04 cloud-init template (`tpl-ubuntuv24.04-v1`) and the Windows Server templates with Packer | [docs/PACKER.md](docs/PACKER.md), [packer/](packer/), [docs/legacy/CREATE_TEMPLATE_GUIDE.md](docs/legacy/CREATE_TEMPLATE_GUIDE.md) |
| 6 | **Terraform VMs / LXCs** | Copy `terraform.tfvars.example`, prune retired groups (see warning above), `terraform apply` | [terraform/proxmox/](terraform/proxmox/), [terraform/modules/](terraform/modules/), [docs/TERRAFORM.md](docs/TERRAFORM.md) |
| 7 | **Ansible configuration** | Bootstrap ansible-controller01, install Docker on all Docker hosts | [docs/ANSIBLE.md](docs/ANSIBLE.md), [ansible/roles/docker/install-docker.yml](ansible/roles/docker/install-docker.yml) |
| 8 | **Core services** | Pi-hole (DNS records for `*.hrmsmrflrii.xyz`), Traefik (wildcard cert), Authentik (SSO + forward auth) | [ansible/roles/traefik/](ansible/roles/traefik/), [ansible/roles/authentik/](ansible/roles/authentik/), [ansible/playbooks/authentik/](ansible/playbooks/authentik/), [docs/FORWARD_AUTH_SETUP.md](docs/FORWARD_AUTH_SETUP.md), [docs/NETWORKING.md](docs/NETWORKING.md) (DNS section) |
| 9 | **App services** | Media stack, Immich, GitLab + runner, Paperless, n8n, Home Assistant, Ghostfolio, Chronicle, Sentinel bot, other apps | [ansible/roles/](ansible/roles/), [ansible/playbooks/](ansible/playbooks/), [docs/SERVICES.md](docs/SERVICES.md), [docs/APPLICATION_CONFIGURATIONS.md](docs/APPLICATION_CONFIGURATIONS.md), [docs/CICD.md](docs/CICD.md) |
| 10 | **Monitoring** | Prometheus, Grafana, Uptime Kuma, exporters, observability stack, dashboards | [ansible/playbooks/monitoring/](ansible/playbooks/monitoring/), [dashboards/](dashboards/), [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md), [docs/PBS_MONITORING.md](docs/PBS_MONITORING.md) |
| 11 | **Glance** | Glance dashboard on CT200 plus helper APIs on docker-vm-core-utilities01 | [ansible/playbooks/glance/](ansible/playbooks/glance/), [docs/GLANCE.md](docs/GLANCE.md), [glance-dashboard repo](https://github.com/herms14/glance-dashboard) |
| 12 | **Helios API** | Create `helios-lxc` (CT210, 192.168.40.14), deploy as a systemd + Python venv service | [helios-homelab-api repo](https://github.com/herms14/helios-homelab-api) |
| 13 | **Codex patch-management agent** | Create `codex-agent-lxc` (CT211, 192.168.40.16), install Codex CLI and `sre-agent.service`, wire up GitLab + Discord approvals | See [Patch Management Pipeline](#autonomous-patch-management-pipeline) below |

> **Not in Terraform yet**: all 13 LXCs, including `helios-lxc` (CT210) and `codex-agent-lxc` (CT211), were deployed manually in Proxmox. `terraform/proxmox/lxc.tf` has no active LXC definitions. For a rebuild, restore these from PBS (step 4) or create them by hand, then run the matching Ansible playbooks.

### Quick Start (Terraform only)

```bash
git clone https://github.com/herms14/Homelab-Infrastructure-Deployment.git
cd Homelab-Infrastructure-Deployment/terraform/proxmox
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your own Proxmox API token (never commit it)
terraform init
terraform plan
terraform apply
```

## New Components (2026)

### Helios API

[Helios](https://github.com/herms14/helios-homelab-api) is a homelab control-plane API and CLI ("Azure ARM for your homelab") that wraps Proxmox, Synology, Omada, Ansible and Terraform behind one REST API with interactive Swagger docs. It runs on `helios-lxc` (CT210) as a systemd service and authenticates with an `X-API-Key` header.

### Autonomous Patch Management Pipeline

A six-stage, approval-gated agent pipeline that keeps the cluster patched:

| Stage | Agent | Runs on | What it does |
|-------|-------|---------|--------------|
| 1 | Patch-Audit | ansible-controller01 | Checks every node, LXC and VM for pending OS updates, emits a structured drift report |
| 2 | Backlog-Intake | ansible-controller01 | Files one deduplicated GitLab issue per host |
| 3 | Backlog-Orchestrator | codex-agent-lxc | Claims issues and has Codex draft a remediation plan, then labels them `awaiting-approval` |
| 4 | SRE executor | codex-agent-lxc (`sre-agent.service`) | After owner approval (GitLab label or Discord reaction), patches one host at a time inside a nightly maintenance window |
| 5 | Documentation | Workstation | Writes changelog/doc updates for completed runs |
| 6 | Verification | codex-agent-lxc | Independently re-checks every run and reports to Discord |

Key guardrails: **every** patch needs approval, a fresh PBS backup (or node config backup) is required before patching, guests are patched before nodes, at most one node per night, verification is deterministic (the LLM's own report is never trusted alone), and ansible-controller01 and PBS are excluded. Docker image drift is handled the same way, one issue per Compose stack, with automatic image rollback on failed health checks. Agent scripts are not published in this repo.

### Glance Dashboard

The [Glance dashboard](https://github.com/herms14/glance-dashboard) config lives in its own repo and is deployed to `docker-lxc-glance` (CT200). Custom widget APIs (life-progress, steam-stats, gaming-pc-stats, power-control, service-version, nas-backup-status) run on docker-vm-core-utilities01. See [docs/GLANCE.md](docs/GLANCE.md).

## Documentation

| Resource | Link | Description |
|----------|------|-------------|
| **Network** | [docs/NETWORKING.md](docs/NETWORKING.md) | VLANs, IPs, DNS, SSL, Tailscale |
| **Compute** | [docs/PROXMOX.md](docs/PROXMOX.md) | Cluster nodes, VM/LXC standards |
| **Storage** | [docs/STORAGE.md](docs/STORAGE.md) | NFS, Synology, storage pools |
| **Backups** | [docs/PBS_DEPLOYMENT.md](docs/PBS_DEPLOYMENT.md) | Proxmox Backup Server |
| **Disaster Recovery** | [docs/DISASTER_RECOVERY.md](docs/DISASTER_RECOVERY.md) | Recovery procedures |
| **Templates** | [docs/PACKER.md](docs/PACKER.md) | Packer image builds |
| **Terraform** | [docs/TERRAFORM.md](docs/TERRAFORM.md) | Modules, deployment |
| **Ansible** | [docs/ANSIBLE.md](docs/ANSIBLE.md) | Automation, playbooks |
| **Services** | [docs/SERVICES.md](docs/SERVICES.md) | Docker services |
| **Inventory** | [docs/INVENTORY.md](docs/INVENTORY.md) | Deployed infrastructure |
| **Troubleshooting** | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues |

**Beginner-friendly guides are in the [Wiki](../../wiki).**

## Repository Structure

```
Homelab-Infrastructure-Deployment/
├── terraform/
│   ├── proxmox/             # Proxmox VM deployment (active)
│   ├── modules/             # Reusable modules (linux-vm, lxc, windows-vm)
│   ├── azure/               # ARCHIVED: Azure lab (decommissioned)
│   └── hybrid-lab/          # ARCHIVED: Windows hybrid lab
├── ansible/
│   ├── roles/               # traefik, authentik, docker, gitlab, immich, ... (k8s, opnsense archived)
│   ├── playbooks/           # monitoring, glance, sentinel-bot, services, ...
│   └── inventory/
├── packer/                  # Windows Server / Windows 11 template builds
├── dashboards/              # Grafana dashboard JSON
├── gitops-templates/        # GitLab service templates
├── scripts/                 # Utility scripts
├── docs/                    # Technical documentation (docs/legacy/ = superseded)
├── Azure-Hybrid-Lab/        # ARCHIVED: kept for reference
├── ansible-playbooks/       # ARCHIVED: hybrid-lab playbooks
└── claude.md                # AI assistant context
```

## Key Technologies

- **Proxmox VE**: virtualization platform
- **Proxmox Backup Server**: deduplicated backups
- **Terraform**: infrastructure as code
- **Ansible**: configuration management
- **Packer**: template builds
- **Docker Compose**: service deployment
- **Traefik**: reverse proxy and automatic SSL
- **Authentik**: SSO across every service
- **TP-Link Omada**: SDN networking and VLANs
- **Cloudflare**: DNS and SSL certificates
- **Synology NAS**: NFS storage backend
- **Codex CLI**: AI-assisted, approval-gated patching

## Related Repositories

| Repo | Purpose |
|------|---------|
| [helios-homelab-api](https://github.com/herms14/helios-homelab-api) | Homelab control-plane API |
| [glance-dashboard](https://github.com/herms14/glance-dashboard) | Glance dashboard config |
| [homelab-agent](https://github.com/herms14/homelab-agent) | Claude Code slash commands for homelab ops |
| [homelab-infrastructure](https://github.com/herms14/homelab-infrastructure) | Main documentation |
| [Clustered-Thoughts](https://github.com/herms14/Clustered-Thoughts) | Blog ([site](https://herms14.github.io/Clustered-Thoughts/)) |

## Contributing

This is a personal homelab project, but feel free to:
- Open issues for questions
- Submit PRs for improvements
- Fork and adapt for your own homelab

## License

This project is open source. Use it as a reference for your own homelab!

---

*Last updated: October 6, 2026*