# Homelab Infrastructure

IaC for a 3-node Proxmox VE cluster running self-hosted services, managed with Terraform and Ansible.

## Infrastructure Summary

```
PROXMOX CLUSTER (MorpheusCluster) — Proxmox VE 9.2.11
├─ node01 - Primary (all LXCs, Docker media/utilities, Tailscale subnet router)
├─ node02 - Services (GitLab runner)
└─ node03 - Desktop-class node (Immich, GitLab)

NETWORKS (7 VLANs)
├─ VLAN 10 - Internal LAN
├─ VLAN 20 - Homelab/Proxmox infrastructure
├─ VLAN 30 - IoT
├─ VLAN 40 - Production Docker services
├─ VLAN 50 - Guest WiFi
├─ VLAN 60 - Sonos
└─ VLAN 90 - Management

KEY HOSTS (11 LXCs + 5 VMs)
├─ traefik-lxc      - Reverse proxy (Traefik v3.7)
├─ authentik-lxc    - SSO for every service
├─ docker-lxc-media - Jellyfin + full *arr stack
├─ docker-lxc-glance - Custom dashboard + widget APIs
├─ pihole           - DNS + ad-blocking
├─ homeassistant-lxc, ghostfolio-lxc, homepage-lxc, chronicle-lxc
├─ pbs-server       - Proxmox Backup Server
└─ 5 VMs: ansible-controller, docker-utilities (Grafana/Prometheus/n8n),
          gitlab + gitlab-runner, immich
```

**Retired**: a 9-node Kubernetes cluster and an Azure hybrid-AD lab both ran here at various points and were decommissioned as the project's focus shifted toward a leaner, fully self-hosted stack.

## Key Technologies

- **Proxmox VE** — virtualization
- **Terraform** + **Ansible** — infrastructure as code / configuration management
- **Docker Compose** — service deployment (no k8s currently)
- **Traefik** + **Authentik** — reverse proxy + SSO for every service
- **GitLab CI/CD** — GitOps deployment pipeline (push to main → SSH deploy)
- **Discord bot ("Sentinel")** — infra commands, media requests, and gated (approval-required) container update checks
- **Prometheus + Grafana + Jaeger** — full observability stack

## SSH Access

Standard ed25519 key auth to all nodes/VMs/LXCs; no plaintext keys or passwords live in this repo (see `.gitignore`).

## Adding a New Service

1. Terraform VM/LXC → 2. Ansible playbook → 3. Traefik route → 4. DNS → 5. Authentik (optional SSO) → 6. Update docs

## Repository Notes for AI Assistants

- `docs/` holds modular technical documentation, one file per topic
- `.claude/` holds working context for AI-assisted sessions on this repo (task tracking, conventions, session history) — start with `.claude/active-tasks.md`
- Real credentials, tokens, and internal-only IPs are intentionally excluded from this repo — see `CREDENTIALS.md` (gitignored) for the private equivalent
- This repo mirrors a private Obsidian knowledge base that tracks day-to-day infrastructure changes in more detail than is appropriate to publish here
