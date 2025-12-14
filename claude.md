# Proxmox Terraform Infrastructure Documentation

## Overview

This repository contains Terraform infrastructure-as-code for deploying VMs and LXC containers on a Proxmox VE 9.1.2 cluster. The infrastructure is designed for a homelab environment with Kubernetes, Docker services, and supporting infrastructure.

## Infrastructure Architecture

### Proxmox Cluster Nodes

| Node | IP Address | Purpose | Workload Type |
|------|------------|---------|---------------|
| **node01** | 192.168.20.20 | VM Host | All virtual machines |
| **node02** | 192.168.20.21 | LXC Host | All LXC containers |
| **node03** | 192.168.20.22 | General Purpose | Mixed workloads |

### Network Architecture

#### VLANs

| VLAN | Network | Gateway | Purpose | Services |
|------|---------|---------|---------|----------|
| **VLAN 20** | 192.168.20.0/24 | 192.168.20.1 | Kubernetes Infrastructure | K8s control plane, worker nodes, Traefik |
| **VLAN 40** | 192.168.40.0/24 | 192.168.40.1 | Services & Management | Docker hosts, logging, automation |

#### Network Bridge
- **Bridge**: vmbr0 (all VMs and containers use this bridge)

### Storage Configuration

The cluster uses a production-grade NFS storage architecture with dedicated exports for each content type. This design prevents storage state ambiguity, content type conflicts, and ensures consistent behavior across all nodes.

#### Synology NAS Configuration

**NAS Address**: 192.168.20.31

| Storage Pool | Export Path | Type | Content Type | Management |
|--------------|-------------|------|--------------|------------|
| **VMDisks** | `/volume2/ProxmoxCluster-VMDisks` | NFS | Disk image | Proxmox-managed |
| **ISOs** | `/volume2/ProxmoxCluster-ISOs` | NFS | ISO image | Proxmox-managed |
| **LXC Configs** | `/volume2/Proxmox-LXCs` | NFS | N/A | Manual mount |
| **Media** | `/volume2/Proxmox-Media` | NFS | N/A | Manual mount |
| **local-lvm** | N/A | Local LVM | Container | Local storage |

#### Storage Architecture Principles

**Design Rule**: One NFS export = One Proxmox storage pool

1. **VMDisks** - Proxmox-managed storage for VM disk images
   - Used for: VM virtual disks, cloud-init drives
   - Enables: Live migration, snapshots, HA
   - Mount: Automatically managed by Proxmox on all nodes

2. **ISOs** - Proxmox-managed storage for installation media
   - Used for: ISO images, installation media
   - Separated from VM disks to prevent accidental operations
   - Mount: Automatically managed by Proxmox on all nodes

3. **LXC Configs** - Manual NFS mount for application data
   - Mount point: `/mnt/nfs/lxcs` (on all nodes)
   - Used for: LXC application configurations via bind mounts
   - Why NOT a Proxmox storage: Proxmox expects LXC rootfs images, not app directories
   - Configured in: `/etc/fstab` on all nodes

4. **Media** - Manual NFS mount for media files
   - Mount point: `/mnt/nfs/media` (on all nodes)
   - Used for: Radarr, Sonarr, Plex media files
   - Directory structure: `/Movies/`, `/Series/`
   - Why NOT a Proxmox storage: Prevents Proxmox from scanning thousands of media files
   - Configured in: `/etc/fstab` on all nodes

#### Proxmox Storage Configuration

**VMDisks Storage** (Datacenter → Storage → VMDisks):
```
ID: VMDisks
Server: 192.168.20.31
Export: /volume2/ProxmoxCluster-VMDisks
Content: Disk image
Nodes: All nodes
```

**ISOs Storage** (Datacenter → Storage → ISOs):
```
ID: ISOs
Server: 192.168.20.31
Export: /volume2/ProxmoxCluster-ISOs
Content: ISO image
Nodes: All nodes
```

#### Manual NFS Mounts

**Configuration** (`/etc/fstab` on all nodes):
```bash
192.168.20.31:/volume2/Proxmox-LXCs   /mnt/nfs/lxcs   nfs  defaults,_netdev  0  0
192.168.20.31:/volume2/Proxmox-Media  /mnt/nfs/media  nfs  defaults,_netdev  0  0
```

**Setup commands** (run on all nodes):
```bash
# Create mount points
mkdir -p /mnt/nfs/lxcs
mkdir -p /mnt/nfs/media

# Mount all
mount -a

# Verify
df -h | grep /mnt/nfs
```

#### LXC Bind Mount Strategy

**Example**: Traefik container with persistent config
```
Container config (/etc/pve/lxc/100.conf):
mp0: /mnt/nfs/lxcs/traefik,mp=/app/config
```

**Flow**:
1. Host has `/mnt/nfs/lxcs` mounted via NFS
2. Subdirectory `/mnt/nfs/lxcs/traefik/` bind-mounted into container
3. Container sees `/app/config` as normal directory
4. Data persists on NAS at `/volume2/Proxmox-LXCs/traefik/`

#### Why This Architecture Works

**Problem Prevention**:
- ✅ No inactive storage warnings (each storage has dedicated export)
- ✅ No `?` icons in UI (homogeneous content types)
- ✅ No template clone failures (all storages on all nodes)
- ✅ No LXC rootfs errors (app configs are manual mounts)
- ✅ No performance degradation (media not scanned by Proxmox)
- ✅ Migration works consistently (identical paths across nodes)

**Key Insight**: Proxmox storages are for Proxmox-managed content (VM disks, ISOs, LXC rootfs). Application data and media require manual mounts with bind mounts into containers.

## Deployed Infrastructure

### Virtual Machines (node01)

#### Kubernetes Cluster - VLAN 20

**Control Plane Nodes:**
| Hostname | IP Address | Cores | RAM | Disk | Purpose |
|----------|------------|-------|-----|------|---------|
| k8s-controlplane01 | 192.168.20.10 | 2 | 4GB | 50GB | K8s Control Plane |
| k8s-controlplane02 | 192.168.20.11 | 2 | 4GB | 50GB | K8s Control Plane |
| k8s-controlplane03 | 192.168.20.12 | 2 | 4GB | 50GB | K8s Control Plane |

**Worker Nodes:**
| Hostname | IP Address | Cores | RAM | Disk | Purpose |
|----------|------------|-------|-----|------|---------|
| k8s-workernode01 | 192.168.20.20 | 4 | 8GB | 100GB | K8s Worker |
| k8s-workernode02 | 192.168.20.21 | 4 | 8GB | 100GB | K8s Worker |
| k8s-workernode03 | 192.168.20.22 | 4 | 8GB | 100GB | K8s Worker |
| k8s-workernode04 | 192.168.20.23 | 4 | 8GB | 100GB | K8s Worker |
| k8s-workernode05 | 192.168.20.24 | 4 | 8GB | 100GB | K8s Worker |
| k8s-workernode06 | 192.168.20.25 | 4 | 8GB | 100GB | K8s Worker |

#### Services & Management - VLAN 40

| Hostname | IP Address | Cores | RAM | Disk | Purpose |
|----------|------------|-------|-----|------|---------|
| docker-media01 | 192.168.40.10 | 4 | 8GB | 100GB | Media services (Plex, etc.) |
| docker-utilities01 | 192.168.40.20 | 4 | 8GB | 100GB | Utility services |
| linux-syslogserver01 | 192.168.40.30 | 2 | 4GB | 50GB | Centralized logging |
| ansible-master01 | 192.168.40.40 | 2 | 4GB | 50GB | Ansible automation |

### LXC Containers (node02)

#### Reverse Proxy - VLAN 20

| Hostname | IP Address | Cores | RAM | Disk | Template | Purpose |
|----------|------------|-------|-----|------|----------|---------|
| traefik01 | 192.168.20.100 | 2 | 1GB | 10GB | Ubuntu 22.04 | Reverse proxy/Load balancer |

## IP Address Allocation

### VLAN 20 (192.168.20.0/24)
- **10-12**: Kubernetes Control Plane
- **20-25**: Kubernetes Worker Nodes
- **100-199**: LXC Containers (Traefik, future services)

### VLAN 40 (192.168.40.0/24)
- **10-19**: Docker Media Services
- **20-29**: Docker Utility Services
- **30-39**: Logging & Monitoring
- **40-49**: Automation & Management

## Authentication & Access

### SSH Access
- **User**: hermes-admin
- **SSH Key**: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAby7br+5MzyDus2fi2UFjUBZvGucN40Gxa29bgUTbfz hermes@homelab`
- **Access Method**: SSH key authentication only

### Proxmox API
- **API URL**: https://192.168.20.21:8006/api2/json
- **Authentication**: API Token (terraform-deployment-user@pve!tf)
- **TLS**: Self-signed certificate (insecure mode enabled)

## Terraform Configuration

### Provider
- **Provider**: telmate/proxmox v3.0.2-rc06
- **Reason for RC version**: Compatibility with Proxmox VE 9.x

### Module Structure

```
tf-proxmox/
├── main.tf                 # VM group definitions and orchestration
├── lxc.tf                  # LXC container definitions
├── variables.tf            # Global variables and defaults
├── outputs.tf              # Output definitions
├── terraform.tfvars        # Variable values (gitignored)
├── modules/
│   ├── linux-vm/          # VM deployment module
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── lxc/               # LXC deployment module
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── lxc-example.tf         # Example LXC configurations
├── LXC_GUIDE.md          # LXC deployment documentation
└── claude.md             # This file
```

### Key Features
- **Auto-incrementing hostnames**: Automatic sequential naming (e.g., k8s-workernode01, k8s-workernode02)
- **Auto-incrementing IPs**: Automatic IP assignment from starting_ip
- **Dynamic resource creation**: Uses Terraform for_each for scalable deployments
- **Cloud-init provisioning**: Automated VM configuration on first boot
- **Consistent configuration**: DRY principle through modules

## VM Configuration Standards

### All VMs Include:
- **Cloud-init**: For automated provisioning
- **QEMU Guest Agent**: Enabled for better integration
- **On Boot**: Auto-start enabled
- **CPU Type**: host (maximum performance)
- **SCSI Controller**: lsi
- **Network Model**: virtio
- **Template**: tpl-ubuntu-24.04-cloudinit-v3

## LXC Configuration Standards

### Container Types:
- **Unprivileged** (default): More secure, suitable for most services
- **Privileged**: Only when needed (e.g., Docker with nesting)

### Features:
- **Nesting**: Enabled only for Docker hosts
- **Auto-start**: Enabled for production services
- **SSH Keys**: Pre-configured for access

## Common Operations

### Deploy All Infrastructure
```bash
terraform init
terraform plan
terraform apply
```

### Deploy Only VMs
```bash
terraform apply -target=module.vms
```

### Deploy Only LXC Containers
```bash
terraform apply -target=module.lxc
```

### View Deployed Resources
```bash
# View all VMs
terraform output vm_summary

# View all LXC containers
terraform output lxc_summary

# View IP mappings
terraform output vm_ips
terraform output lxc_ips
```

### Add New VM Group
Edit `main.tf` and add to `vm_groups` local:
```hcl
new-service = {
  count         = 1
  starting_ip   = "192.168.20.50"
  starting_node = "node01"  # Optional: auto-increment nodes (node01, node02, node03...)
  template      = "tpl-ubuntu-24.04-cloudinit-v3"
  cores         = 2
  sockets       = 1
  memory        = 4096
  disk_size     = "50G"
  storage       = "VMDisks"
  vlan_tag      = null  # or specific VLAN number
  gateway       = "192.168.20.1"
  nameserver    = "192.168.20.1"
}
```

### Add New LXC Container
Edit `lxc.tf` and add to `lxc_groups` local:
```hcl
new-container = {
  count        = 1
  starting_ip  = "192.168.20.101"
  ostemplate   = "local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
  unprivileged = true
  cores        = 1
  memory       = 512
  swap         = 256
  disk_size    = "8G"
  storage      = "local-lvm"  # LXC rootfs on local storage
  vlan_tag     = null
  gateway      = "192.168.20.1"
  nameserver   = "192.168.20.1"
  nesting      = false
}
```

**Note**: LXC containers use `local-lvm` for rootfs. Application data should be bind-mounted from `/mnt/nfs/lxcs`:
```
Container config (/etc/pve/lxc/101.conf):
mp0: /mnt/nfs/lxcs/new-container,mp=/app/config
```

## LXC Template Management

### Download LXC Templates (on Proxmox nodes)
```bash
# Update template list
pveam update

# List available templates
pveam available

# Download Ubuntu 22.04 LXC template
pveam download local ubuntu-22.04-standard_22.04-1_amd64.tar.zst

# Download Debian 12 LXC template
pveam download local debian-12-standard_12.2-1_amd64.tar.zst
```

Templates are stored in: `/var/lib/vz/template/cache/`

## Resource Sizing Guidelines

### Kubernetes Nodes
- **Control Plane**: 2 cores, 4GB RAM minimum
- **Worker Nodes**: 4 cores, 8GB RAM (adjust based on workload)

### Docker Hosts
- **Media Services**: 4 cores, 8GB RAM (for transcoding)
- **General Services**: 2-4 cores, 4-8GB RAM

### LXC Containers
- **Reverse Proxy (Traefik)**: 1-2 cores, 1GB RAM
- **Web Servers**: 1 core, 512MB RAM
- **Docker in LXC**: 2-4 cores, 2-4GB RAM

## Troubleshooting

### Common Issues

#### Connection Refused Errors
- **Symptom**: `dial tcp 192.168.20.21:8006: connectex: No connection could be made`
- **Cause**: Proxmox API temporarily unavailable during heavy operations
- **Solution**: Wait and retry, or check Proxmox node status

#### Template Not Found (LXC)
- **Symptom**: `template 'local:vztmpl/...' does not exist`
- **Solution**: SSH to target node and download template with `pveam download`

#### Tainted Resources
- **Symptom**: Resources marked as tainted, requiring replacement
- **Solution**: Run `terraform apply` to recreate them properly

#### State Lock
- **Symptom**: Terraform state is locked
- **Solution**: Ensure no other terraform operations are running, or force unlock with caution

### Useful Commands

```bash
# Check Terraform state
terraform state list

# Show specific resource
terraform state show module.vms["k8s-controlplane01"].proxmox_vm_qemu.linux_vm

# Refresh state
terraform refresh

# Validate configuration
terraform validate

# Format configuration files
terraform fmt
```

## Security Considerations

1. **API Tokens**: Stored in `terraform.tfvars` (excluded from git)
2. **SSH Keys**: Public key only in configuration
3. **Unprivileged LXC**: Default for security
4. **Network Segmentation**: VLANs separate workloads
5. **Cloud-init**: Automated security updates possible

## Future Expansion

### Planned Services
- **Media Stack (arr suite)**: Radarr, Sonarr, Plex with dedicated media storage
- Additional LXC containers for lightweight services
- Monitoring stack (Prometheus, Grafana)
- GitLab or similar CI/CD
- Database containers (PostgreSQL, Redis)

### IP Reservation
Keep IP ranges available for future growth:
- VLAN 20: 192.168.20.101-199 (LXC containers)
- VLAN 40: 192.168.40.50-99 (Future services)

## Notes

- All VMs use Ubuntu 24.04 LTS cloud-init template
- LXC containers use Ubuntu 22.04 LTS or Debian 12
- VLAN 20 uses `vlan_tag = null` (default VLAN on vmbr0)
- VLAN 40 uses explicit `vlan_tag = 40`
- Auto-start enabled on all production infrastructure
- Proxmox node02 dedicated to containers for resource isolation
