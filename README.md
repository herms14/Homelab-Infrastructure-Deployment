# Proxmox Homelab Infrastructure

[![Proxmox](https://img.shields.io/badge/Proxmox-VE%209.2.11-orange)](https://www.proxmox.com/)
[![Terraform](https://img.shields.io/badge/Terraform-1.5+-purple)](https://www.terraform.io/)
[![Ansible](https://img.shields.io/badge/Ansible-2.15+-red)](https://www.ansible.com/)

Self-hosted homelab infrastructure managed with Terraform and Ansible on a 3-node Proxmox VE cluster — media, identity/SSO, monitoring, automation, and a handful of personal apps, all reverse-proxied through Traefik and gated behind Authentik.

## Documentation

### Modular Documentation

| Resource | Link | Description |
|----------|------|-------------|
| **Network** | [docs/NETWORKING.md](docs/NETWORKING.md) | VLANs, IPs, DNS, SSL |
| **Compute** | [docs/PROXMOX.md](docs/PROXMOX.md) | Cluster nodes, VM/LXC standards |
| **Storage** | [docs/STORAGE.md](docs/STORAGE.md) | NFS, Synology, storage pools |
| **Terraform** | [docs/TERRAFORM.md](docs/TERRAFORM.md) | Modules, deployment |
| **Services** | [docs/SERVICES.md](docs/SERVICES.md) | Docker services |
| **Ansible** | [docs/ANSIBLE.md](docs/ANSIBLE.md) | Automation, playbooks |
| **Inventory** | [docs/INVENTORY.md](docs/INVENTORY.md) | Deployed infrastructure |
| **Troubleshooting** | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues |

### Wiki (Beginner-Friendly)

**Full documentation available in the [Wiki](../../wiki)**

## Infrastructure at a Glance

| Component | Details |
|-----------|---------|
| **Proxmox Cluster** | 3 nodes (MorpheusCluster) |
| **Virtual Machines** | 5 |
| **LXC Containers** | 11 |
| **Services** | 40+ containerized applications |
| **SSL/HTTPS** | Let's Encrypt wildcard via Cloudflare |
| **Domain** | *.hrmsmrflrii.xyz |

> This project previously ran a 9-node Kubernetes cluster and an Azure hybrid-AD lab for learning purposes. Both were decommissioned as the project matured toward a leaner, fully self-hosted architecture — see `docs/` for what's actually running today.

### Services Running

| Category | Services |
|----------|----------|
| **Reverse Proxy** | Traefik v3.7 with automatic SSL (Let's Encrypt DNS-01) |
| **Identity** | Authentik (SSO for every service) |
| **Media** | Jellyfin, Radarr, Sonarr, Lidarr, Prowlarr, Bazarr, Overseerr, Jellyseerr, Tdarr, Autobrr |
| **Photos** | Immich (self-hosted Google Photos alternative) |
| **Documents** | Paperless-ngx |
| **DevOps** | GitLab CE (GitOps pipeline: push to main → deploy) |
| **Automation** | n8n, custom Discord bot ("Sentinel") for infra ops + gated container updates |
| **Dashboards** | Glance, Homepage |
| **Monitoring** | Prometheus, Grafana, Uptime Kuma, Jaeger |
| **Home Automation** | Home Assistant |
| **Personal Finance** | Ghostfolio |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/herms14/Homelab-Infrastructure-Deployment.git
cd Homelab-Infrastructure-Deployment

# Configure your variables
cd terraform/proxmox
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your own Proxmox API credentials

# Deploy infrastructure
terraform init
terraform plan
terraform apply
```

**See [docs/TERRAFORM.md](docs/TERRAFORM.md) for detailed setup instructions.**

## Repository Structure

```
Homelab-Infrastructure-Deployment/
├── terraform/              # Terraform configurations
│   ├── proxmox/             # Proxmox VM/LXC deployment
│   └── modules/             # Reusable Terraform modules
├── ansible/                # Ansible automation
│   ├── roles/               # Service configurations (traefik, authentik, docker, ...)
│   └── playbooks/            # Deployment playbooks (monitoring, services, sentinel-bot, ...)
├── scripts/                 # Utility scripts
├── docs/                    # Technical documentation
├── dashboards/               # Grafana dashboard JSON
└── claude.md                # AI assistant context
```

## Key Technologies

- **Proxmox VE** — virtualization platform
- **Terraform** — infrastructure as code
- **Ansible** — configuration management
- **Docker Compose** — service deployment
- **Traefik** — reverse proxy & automatic SSL
- **Authentik** — SSO across every service
- **Cloudflare** — DNS & SSL certificates
- **Synology NAS** — NFS storage backend

## Contributing

This is a personal homelab project, but feel free to:
- Open issues for questions
- Submit PRs for improvements
- Fork and adapt for your own homelab

## License

This project is open source. Use it as a reference for your own homelab!

---

*Last updated: August 2026*
