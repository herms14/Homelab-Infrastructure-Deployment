# Proxmox Homelab Infrastructure

[![Proxmox](https://img.shields.io/badge/Proxmox-VE%209.1.2-orange)](https://www.proxmox.com/)
[![Terraform](https://img.shields.io/badge/Terraform-1.5+-purple)](https://www.terraform.io/)
[![Ansible](https://img.shields.io/badge/Ansible-2.15+-red)](https://www.ansible.com/)

Production-grade homelab infrastructure managed with Terraform and Ansible on a 3-node Proxmox VE cluster.

## Documentation

### Modular Documentation (Recommended)

We maintain focused, composable documentation in the `docs/` directory:

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

The Wiki contains comprehensive, beginner-friendly guides for every aspect of this infrastructure.

## Infrastructure at a Glance

| Component | Details |
|-----------|---------|
| **Proxmox Cluster** | 3 nodes (node01, node02, node03) |
| **Virtual Machines** | 17 VMs across 2 VLANs |
| **Services** | 22 containerized applications |
| **Kubernetes** | 9-node HA cluster (3 control + 6 workers) |
| **SSL/HTTPS** | Let's Encrypt wildcard via Cloudflare |
| **Domain** | *.hrmsmrflrii.xyz |

### Services Running

| Category | Services |
|----------|----------|
| **Reverse Proxy** | Traefik v3.2 with automatic SSL |
| **Identity** | Authentik (SSO/OAuth/SAML) |
| **Media** | Jellyfin, Radarr, Sonarr, Lidarr, Prowlarr, Bazarr, Overseerr, Jellyseerr, Tdarr, Autobrr |
| **Photos** | Immich (self-hosted Google Photos alternative) |
| **Documents** | Paperless-ngx (document management) |
| **DevOps** | GitLab CE |
| **Automation** | n8n (workflow automation) |
| **Dashboard** | Glance |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/herms14/Proxmox-TerraformDeployments.git
cd Proxmox-TerraformDeployments

# Configure your variables
cd terraform/proxmox
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your Proxmox API credentials

# Deploy infrastructure
terraform init
terraform plan
terraform apply
```

**See [docs/TERRAFORM.md](docs/TERRAFORM.md) for detailed setup instructions.**

## Repository Structure

```
homelab-infra-automation-project/
├── terraform/              # All Terraform configurations
│   ├── proxmox/            # Proxmox VM/LXC deployment
│   │   ├── main.tf         # VM definitions
│   │   ├── lxc.tf          # LXC container definitions
│   │   └── variables.tf    # Terraform variables
│   ├── azure/              # Azure cloud resources
│   │   ├── deploy-vm/      # Azure deployment VM
│   │   ├── sentinel/       # Azure Sentinel SIEM
│   │   └── nat-gateway/    # NAT gateway
│   ├── modules/            # Reusable Terraform modules
│   │   ├── linux-vm/       # Linux VM module
│   │   ├── windows-vm/     # Windows VM module
│   │   └── lxc/            # LXC container module
│   └── env/                # Environment-specific tfvars
├── ansible/                # All Ansible automation
│   ├── roles/              # Service configurations
│   │   ├── k8s/            # Kubernetes deployment
│   │   ├── docker/         # Docker & Arr stack
│   │   ├── traefik/        # Reverse proxy
│   │   ├── authentik/      # Identity provider
│   │   └── ...             # Other services
│   ├── playbooks/          # Deployment playbooks
│   │   ├── monitoring/     # Grafana dashboards
│   │   ├── services/       # Service deployments
│   │   ├── sentinel-bot/   # Discord bots
│   │   └── ...             # Other playbooks
│   └── inventory/          # Inventory files
├── scripts/                # Utility scripts
│   ├── utilities/          # Helper scripts
│   ├── gitlab-runner/      # CI/CD scripts
│   └── diagrams/           # Diagram generators
├── docs/                   # Technical documentation
├── dashboards/             # Grafana dashboard JSON
├── apps/                   # Custom applications
├── wiki/                   # GitHub Wiki mirror
└── CLAUDE.md               # AI assistant context
```

## Key Technologies

- **Proxmox VE 9.1.2** - Virtualization platform
- **Terraform** - Infrastructure as Code
- **Ansible** - Configuration management
- **Docker** - Containerization
- **Kubernetes** - Container orchestration
- **Traefik** - Reverse proxy & SSL
- **Cloudflare** - DNS & SSL certificates
- **Synology NAS** - NFS storage backend

## Learn More

| Topic | Link |
|-------|------|
| Getting Started | [Wiki: Introduction](../../wiki/Introduction) |
| Architecture Overview | [Wiki: Architecture](../../wiki/Architecture-Overview) |
| Network Setup | [docs/NETWORKING.md](docs/NETWORKING.md) |
| Adding Services | [docs/SERVICES.md](docs/SERVICES.md) |
| Troubleshooting | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) |

## Files Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI assistant context & infrastructure summary |
| `docs/*.md` | Modular documentation |
| `CHANGELOG.md` | Version history and changes |
| `CREDENTIALS.md` | Sensitive data reference (gitignored) |

## Contributing

This is a personal homelab project, but feel free to:
- Open issues for questions
- Submit PRs for improvements
- Fork and adapt for your own homelab

## License

This project is open source. Use it as a reference for your own homelab!

---

*Last updated: December 2025*
