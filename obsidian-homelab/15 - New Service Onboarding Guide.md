# New Service Onboarding Guide

> Complete end-to-end guide for adding a new service to the homelab, from infrastructure provisioning to full monitoring integration.

Related: [[07 - Deployed Services]] | [[09 - Traefik Reverse Proxy]] | [[14 - Authentik Google SSO Setup]] | [[13 - Service Configuration Guide]] | [[22 - Service Onboarding Workflow]] | [[47 - Manual Service Updates Guide]]

---

## Table of Contents

- [[#Overview]]
- [[#Phase 1 - Infrastructure Decision (LXC vs VM)]]
- [[#Phase 2 - Provision the Host]]
- [[#Phase 3 - Install Docker]]
- [[#Phase 4 - NAS Storage Mounts]]
- [[#Phase 5 - Deploy the Service]]
- [[#Phase 6 - Traefik Reverse Proxy]]
- [[#Phase 7 - DNS Configuration]]
- [[#Phase 8 - SSL Certificates]]
- [[#Phase 9 - Authentik SSO Integration]]
- [[#Phase 10 - Glance Dashboard and Service Monitoring]]
- [[#Phase 11 - Discord Bot Integration]]
- [[#Phase 12 - Watchtower Update Monitoring]]
- [[#Phase 13 - Documentation]]
- [[#Complete Onboarding Checklist]]
- [[#Quick Reference]]
- [[#Worked Example - Deploying a New Service End-to-End]]

---

## Overview

Every new service in the homelab requires integration with multiple systems. This guide walks through each step with exact commands and API calls.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    SERVICE ONBOARDING PIPELINE                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Phase 1       Phase 2       Phase 3       Phase 4       Phase 5     │
│  ┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐      │
│  │LXC or│────▶│Provi-│────▶│Docker│────▶│ NAS  │────▶│Deploy│      │
│  │ VM?  │     │sion  │     │Setup │     │Mount │     │Cont. │      │
│  └──────┘     └──────┘     └──────┘     └──────┘     └──────┘      │
│                                                          │           │
│  Phase 10      Phase 9      Phase 8      Phase 7      Phase 6       │
│  ┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐      │
│  │Glance│◀────│Auth- │◀────│ SSL  │◀────│ DNS  │◀────│Trae- │      │
│  │Mon.  │     │entik │     │(Auto)│     │Record│     │ fik  │      │
│  └──────┘     └──────┘     └──────┘     └──────┘     └──────┘      │
│       │                                                              │
│       ▼                                                              │
│  Phase 11      Phase 12      Phase 13                                │
│  ┌──────┐     ┌──────┐     ┌──────┐                                 │
│  │Discord│───▶│Watch-│────▶│ Docs │                                 │
│  │ Bots │     │tower │     │      │                                 │
│  └──────┘     └──────┘     └──────┘                                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Systems That Need Configuration

| System | Host | Purpose | Required? |
|--------|------|---------|-----------|
| Docker Host | Various | Run the container | Yes |
| Traefik | 192.168.40.20 | HTTPS reverse proxy | Yes (if web UI) |
| OPNsense DNS | 192.168.91.30 | Domain name resolution | Yes (if web UI) |
| SSL | Automatic | HTTPS certificates | Automatic |
| Authentik | 192.168.40.21 | Single Sign-On | Optional |
| Service Version API | 192.168.40.13:5070 | Glance service monitoring | Recommended |
| Sentinel Bot | 192.168.40.13 | Discord update notifications | Recommended |
| Argus Bot | 192.168.40.13 | Watchtower webhook approvals | Recommended |
| Watchtower | Target host | Auto-detect updates | Automatic |

---

## Phase 1 - Infrastructure Decision (LXC vs VM)

Before deploying anything, decide whether the service needs a dedicated LXC container, a dedicated VM, or can be added to an existing Docker host.

### Decision Framework

```
Does the service need...
│
├─ Windows? ─────────────────────────────── VM (node03, VLAN 80)
│
├─ GPU passthrough or USB devices? ──────── VM
│
├─ Kernel modules (NFS server, ZFS)? ────── VM
│
├─ Just Docker containers? ──────────────┐
│                                         │
│   Is it a lightweight single service?   │
│   ├─ Yes ──────────────────────────────── LXC (2-4 cores, 1-4GB RAM)
│   └─ No (multi-container stack) ───────── VM (4+ cores, 8-16GB RAM)
│
├─ Can it share a host with others? ─────┐
│   ├─ Utility/monitoring tool ──────────── Add to 192.168.40.13 (utilities)
│   ├─ Media-related ────────────────────── Add to 192.168.40.11 (media)
│   └─ Needs isolation ─────────────────── New LXC or VM
│
└─ Critical infrastructure? ─────────────── Dedicated LXC or VM
```

### LXC vs VM Comparison

| Factor | LXC Container | Virtual Machine |
|--------|--------------|-----------------|
| **Boot time** | 2-5 seconds | 15-30 seconds |
| **RAM overhead** | ~50-100MB | ~300-500MB |
| **Disk overhead** | Minimal (shared kernel) | Full OS image (2-5GB) |
| **Isolation** | Process-level (shared kernel) | Full hardware virtualization |
| **Docker support** | Yes (with nesting) | Yes (native) |
| **NFS mounts** | Requires bind mount from host | Native NFS client |
| **Snapshots** | Instant | Requires disk snapshot |
| **Backup size** | Smaller | Larger |
| **Best for** | Single-purpose services, lightweight apps | Multi-service stacks, resource-heavy apps |

### When to Use an Existing Host

Before creating a new LXC/VM, check if the service fits on an existing Docker host:

| Host | IP | Current Load | Good For Adding |
|------|-----|-------------|----------------|
| docker-vm-core-utilities01 | 192.168.40.13 | 21 containers | Monitoring tools, utility APIs, bots |
| docker-lxc-media | 192.168.40.11 | 12 containers | Media-related services |
| docker-lxc-glance | 192.168.40.12 | 1 container (Glance) | Dashboard-related services only |

### IP Address Allocation

| VLAN | Network | Purpose | Next Available |
|------|---------|---------|---------------|
| 20 | 192.168.20.0/24 | Infrastructure | Check `10 - IP Address Map.md` |
| 40 | 192.168.40.0/24 | Services | Check `10 - IP Address Map.md` |
| 80 | 192.168.80.0/24 | Hybrid Lab (AD) | 192.168.80.14+ |
| 90 | 192.168.90.0/24 | Management | Check `10 - IP Address Map.md` |

---

## Phase 2 - Provision the Host

Skip this phase if adding to an existing Docker host.

### Option A: Create an LXC via Proxmox Web UI

1. Login to Proxmox: https://proxmox.hrmsmrflrii.xyz
2. Select target node (node01 or node02)
3. Click **Create CT**:

| Setting | Value |
|---------|-------|
| CT ID | Next available (check existing) |
| Hostname | `<service>-lxc` |
| Password | Set a root password |
| Template | `ubuntu-22.04-standard` (from local storage) |
| Disk | `local-lvm`, 10-30GB depending on service |
| CPU | 2-4 cores |
| Memory | 1024-4096 MB |
| Network | `vmbr0`, VLAN tag `40`, IP `192.168.40.XX/24`, GW `192.168.40.1` |
| DNS | `192.168.90.53` (Pi-hole) |

4. Under **Options** tab after creation:
   - Enable **Start at boot**
   - If running Docker: Edit `/etc/pve/lxc/<CTID>.conf` on the node and add:
     ```
     features: keyctl=1,nesting=1
     ```
     These features allow Docker to run inside the LXC.

5. Start the LXC and configure SSH:
```bash
# From your workstation
ssh root@192.168.40.XX

# Create the admin user
adduser hermes-admin
usermod -aG sudo hermes-admin

# Add SSH key
mkdir -p /home/hermes-admin/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINVYlOowJQE4tC4GEo17MptDGdaQfWwMDMRxLdKd/yui hermes@homelab-nopass" > /home/hermes-admin/.ssh/authorized_keys
chmod 700 /home/hermes-admin/.ssh
chmod 600 /home/hermes-admin/.ssh/authorized_keys
chown -R hermes-admin:hermes-admin /home/hermes-admin/.ssh
```

### Option B: Create an LXC via Terraform

Add to `terraform/proxmox/lxc.tf`:

```hcl
module "myservice_lxc" {
  source = "../modules/lxc"

  hostname     = "myservice-lxc"
  vmid         = 209  # Next available CTID
  target_node  = "node01"
  cores        = 2
  memory       = 2048
  swap         = 1024
  disk_size    = "20G"
  disk_storage = "local-lvm"
  ip_address   = "192.168.40.XX/24"
  gateway      = "192.168.40.1"
  vlan_tag     = 40
  dns_server   = "192.168.90.53"
  template     = "local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
  ssh_keys     = file("~/.ssh/homelab_ed25519.pub")
}
```

Apply:
```bash
cd terraform/proxmox
terraform plan -out=tfplan
terraform apply tfplan
```

### Option C: Create a VM via Terraform

Add to `terraform/proxmox/main.tf`:

```hcl
module "myservice_vm" {
  source = "../modules/linux-vm"

  vm_group = [{
    name        = "myservice-vm"
    count       = 1
    target_node = "node01"
    vmid_start  = 115  # Next available VMID
    cores       = 4
    sockets     = 1
    memory      = 8192
    disk_size   = "40G"
    ip_start    = "192.168.40.XX"
    vlan_tag    = 40
    template    = "tpl-ubuntu-shared-v1"
  }]
}
```

---

## Phase 3 - Install Docker

Skip if using an existing Docker host. Required for new LXCs and VMs that will run Docker containers.

### Manual Docker Installation (Recommended for LXCs)

SSH into the new host and run:

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.XX
```

#### Step 1: Install prerequisites

```bash
# Update package index
sudo apt update

# Install packages needed for HTTPS apt repositories
sudo apt install -y \
  apt-transport-https \  # Allows apt to use HTTPS repos
  ca-certificates \      # SSL certificate authority bundle
  curl \                 # For downloading Docker's GPG key
  gnupg \                # GPG key management for repo verification
  lsb-release            # Identifies Ubuntu version for correct repo
```

#### Step 2: Add Docker's official GPG key

```bash
# Download and store Docker's GPG key for package verification
# This ensures packages from Docker's repo are authentic
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

#### Step 3: Add Docker repository

```bash
# Add Docker's official apt repository for your Ubuntu version
# $(lsb_release -cs) returns the codename (e.g., "jammy" for 22.04)
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

#### Step 4: Install Docker Engine

```bash
sudo apt update

# Install all Docker components:
# docker-ce:            The Docker engine daemon
# docker-ce-cli:        The 'docker' command-line tool
# containerd.io:        Low-level container runtime (manages container lifecycle)
# docker-compose-plugin: Enables 'docker compose' v2 commands
# docker-buildx-plugin:  Enables multi-platform image builds
sudo apt install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-compose-plugin \
  docker-buildx-plugin
```

#### Step 5: Post-install configuration

```bash
# Add hermes-admin to docker group so you don't need sudo for docker commands
sudo usermod -aG docker hermes-admin

# Apply group change (or log out and back in)
newgrp docker

# Verify Docker is running
docker --version
docker compose version

# Test with hello-world
docker run hello-world
```

#### Step 6: Configure Docker daemon log rotation

Without this, Docker logs can fill the disk over time (this caused the Immich disk-full incident — see [[46 - Immich Disk Full Troubleshooting]]).

```bash
# Create Docker daemon configuration for log rotation
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker to apply
sudo systemctl restart docker
```

**What this does**:
- `max-size: 10m` — Each log file is capped at 10MB
- `max-file: 3` — Docker keeps only 3 rotated log files per container
- This means each container uses at most 30MB of disk for logs

#### Step 7: Configure systemd journal limits

```bash
# Limit systemd journal size to prevent disk bloat
sudo mkdir -p /etc/systemd/journald.conf.d
sudo tee /etc/systemd/journald.conf.d/size-limit.conf > /dev/null << 'EOF'
[Journal]
SystemMaxUse=100M
EOF

sudo systemctl restart systemd-journald
```

### Ansible Docker Installation (For VMs)

Use the Ansible playbook for repeatable VM setup:

```bash
ssh hermes-admin@192.168.20.30  # Ansible controller
ansible-playbook docker/install-docker.yml -e "target_host=192.168.40.XX"
```

### Verify Docker Installation

```bash
# Check Docker is running
docker info

# Verify compose plugin
docker compose version

# Check log rotation is active
docker info --format '{{.LoggingDriver}}'
# Should return: json-file
```

---

## Phase 4 - NAS Storage Mounts

Only needed if the service requires access to NAS storage (media files, shared data, backups).

### Available NAS Shares (Synology 192.168.20.31)

| NFS Export Path | Contents | Common Use |
|----------------|----------|------------|
| `/volume2/Proxmox-Media` | Movies, Series, Music, Downloads | Media stack (*arr, Jellyfin) |
| `/volume2/Proxmox-Media/Movies` | Movie library | Radarr, Jellyfin |
| `/volume2/Proxmox-Media/Series` | TV series library | Sonarr, Jellyfin |
| `/volume2/Proxmox-Media/Music` | Music library | Lidarr |
| `/volume2/Proxmox-Media/Downloads` | Active downloads | Deluge, SABnzbd |
| `/volume2/Proxmox-LXCs` | LXC app configs | Bind mounts for LXC persistence |
| `/volume2/Immich Photos` | Photo uploads | Immich |
| `/volume2/homes/hermes-admin/Photos` | Legacy Synology Photos | Immich (read-only) |

### Step 1: Install NFS client

```bash
sudo apt install -y nfs-common
```

### Step 2: Create mount point

```bash
# Create the local directory where NAS storage will appear
sudo mkdir -p /mnt/media    # For media services
# or
sudo mkdir -p /mnt/nas      # For general NAS access
# or
sudo mkdir -p /mnt/appdata  # For application data
```

### Step 3: Add fstab entry for persistent mount

```bash
# Edit fstab to auto-mount on boot
sudo nano /etc/fstab

# Add this line (adjust share path and mount point):
192.168.20.31:/volume2/Proxmox-Media  /mnt/media  nfs  defaults,_netdev  0  0
```

**fstab options explained**:
- `192.168.20.31:/volume2/Proxmox-Media` — NAS IP and export path
- `/mnt/media` — Local mount point
- `nfs` — Filesystem type (NFS v4 by default)
- `defaults` — Standard mount options (rw, suid, dev, exec, auto, nouser, async)
- `_netdev` — **Critical**: Wait for network before mounting. Without this, the mount fails on boot because NFS isn't available until the network is up
- `0 0` — Don't include in dump or fsck checks

### Step 4: Mount and verify

```bash
# Mount immediately without rebooting
sudo mount -a

# Verify the mount
df -h | grep media
# Should show: 192.168.20.31:/volume2/Proxmox-Media  3.6T  ...  /mnt/media

# List contents
ls /mnt/media/
# Should show: Movies  Series  Music  Downloads  etc.
```

### Step 5: Map NAS paths to Docker containers

In your `docker-compose.yml`, map the NAS mount into the container:

```yaml
services:
  myservice:
    volumes:
      # Map NAS media to container path
      - /mnt/media/Movies:/movies:ro      # Read-only access to movies
      - /mnt/media/Downloads:/downloads   # Read-write for downloads
      - /opt/myservice/config:/config     # Local config (not on NAS)
```

**Volume mapping format**: `<host_path>:<container_path>[:options]`
- `:ro` — Read-only mount (use for libraries that shouldn't be modified)
- No suffix — Read-write (default)

### NFS Permissions

The Synology NAS uses `all_squash` with `anonuid=1024,anongid=100`. This means all NFS access is mapped to uid 1024. If containers need specific UID/GID (like LinuxServer images with PUID/PGID), set them to match:

```yaml
environment:
  - PUID=1024    # Match NAS squash uid
  - PGID=100     # Match NAS squash gid
```

### Troubleshooting NFS

```bash
# Check if NFS port is reachable
nc -zv 192.168.20.31 2049

# Show available NFS exports
showmount -e 192.168.20.31

# Check current mounts
mount | grep nfs

# If mount fails, check syslog
sudo journalctl -u mount | tail -20
```

---

## Phase 5 - Deploy the Service

### Docker Compose Deployment (Recommended)

#### Step 1: Create the service directory

```bash
# Convention: all services go under /opt/<service-name>/
sudo mkdir -p /opt/myservice
cd /opt/myservice
```

#### Step 2: Create docker-compose.yml

```bash
sudo tee /opt/myservice/docker-compose.yml > /dev/null << 'EOF'
name: myservice

services:
  myservice:
    image: vendor/myservice:latest
    container_name: myservice
    restart: unless-stopped
    ports:
      - "8080:8080"       # <host_port>:<container_port>
    volumes:
      - ./config:/config  # Persistent configuration
      - ./data:/data      # Persistent data
    environment:
      - TZ=Asia/Manila    # Timezone for logs and schedules
    labels:
      - "com.centurylinklabs.watchtower.enable=true"  # Enable update monitoring
EOF
```

**Key settings explained**:
- `restart: unless-stopped` — Auto-restart on crash or reboot, but stays stopped if you manually stop it
- `container_name` — Fixed name for the container (used by monitoring systems). Without this, Docker generates a random name
- `TZ` — Set timezone so logs show the correct local time
- Watchtower label — Enables automatic update detection (see [[19 - Watchtower Updates]])

#### Step 3: Deploy and verify

```bash
# Pull the image and start the container
cd /opt/myservice
docker compose up -d

# Check it's running
docker ps --filter name=myservice

# Watch logs for startup errors
docker logs myservice -f --tail 50

# Test the service responds
curl -s http://localhost:8080
```

### Ansible Deployment (For Repeatable Setups)

Create a playbook at `ansible/playbooks/<service>/deploy-<service>.yml`:

```yaml
---
- name: Deploy <Service>
  hosts: <target_host>
  become: yes
  vars:
    service_path: /opt/myservice
    service_port: 8080

  tasks:
    - name: Create service directory
      file:
        path: "{{ service_path }}"
        state: directory
        mode: '0755'

    - name: Deploy Docker Compose file
      copy:
        src: files/docker-compose.yml
        dest: "{{ service_path }}/docker-compose.yml"
        mode: '0644'

    - name: Pull and start containers
      command: docker compose up -d
      args:
        chdir: "{{ service_path }}"

    - name: Wait for service to be ready
      uri:
        url: "http://localhost:{{ service_port }}"
        status_code: [200, 301, 302]
      register: health
      until: health.status in [200, 301, 302]
      retries: 30
      delay: 2
```

---

## Phase 6 - Traefik Reverse Proxy

Traefik provides HTTPS access via `<service>.hrmsmrflrii.xyz` URLs. All external traffic flows through Traefik on 192.168.40.20.

### How Traffic Flows

```
Browser                    OPNsense DNS              Traefik              Service
   │                          │                        │                    │
   │ myservice.hrmsmrflrii.xyz │                        │                    │
   │─────────────────────────▶│                        │                    │
   │                          │ Resolves to 192.168.40.20                   │
   │                          │───────────────────────▶│                    │
   │                          │                        │ Matches Host() rule│
   │                          │                        │ TLS termination    │
   │                          │                        │───────────────────▶│
   │                          │                        │ http://IP:PORT     │
   │◀─────────────────────────────────────────────────────────────────────│
```

### Step 1: SSH to Traefik host

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.20
```

### Step 2: Edit dynamic services configuration

```bash
sudo nano /opt/traefik/config/dynamic/services.yml
```

Add a **router** entry (under `http.routers:`):

```yaml
    myservice:
      rule: "Host(`myservice.hrmsmrflrii.xyz`)"   # Match this hostname
      service: myservice                           # Forward to this service definition
      entryPoints:
        - websecure                                # Listen on port 443 (HTTPS)
      tls:
        certResolver: letsencrypt                  # Auto-provision SSL certificate
```

Add a **service** entry (under `http.services:`):

```yaml
    myservice:
      loadBalancer:
        servers:
          - url: "http://192.168.40.XX:8080"       # Backend: service IP and port
```

**What each field means**:
- `rule: "Host(...)"` — Traefik matches incoming requests by hostname. Only requests for `myservice.hrmsmrflrii.xyz` hit this router
- `entryPoints: websecure` — Only accept HTTPS connections (port 443)
- `certResolver: letsencrypt` — Traefik auto-requests a Let's Encrypt certificate via Cloudflare DNS-01 challenge
- `loadBalancer.servers.url` — The internal HTTP address of your service (Traefik terminates TLS and forwards plain HTTP)

### Step 3: Verify configuration

Traefik watches the config directory and auto-reloads. No restart needed, but you can force it:

```bash
# Check config is valid YAML
cat /opt/traefik/config/dynamic/services.yml | python3 -c "import sys,yaml; yaml.safe_load(sys.stdin); print('YAML OK')"

# If needed, restart Traefik
cd /opt/traefik && docker compose restart

# Check Traefik logs for errors
docker logs traefik 2>&1 | tail -20

# Verify the route in Traefik dashboard
# Open https://traefik.hrmsmrflrii.xyz in browser
```

### Adding Authentik SSO to Traefik (Optional)

If the service needs SSO protection, add a middleware reference to the router:

```yaml
    myservice:
      rule: "Host(`myservice.hrmsmrflrii.xyz`)"
      service: myservice
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - authentik                                # Add this line for SSO
```

The `authentik` middleware is already defined globally in services.yml:

```yaml
  middlewares:
    authentik:
      forwardAuth:
        address: http://192.168.40.21:9000/outpost.goauthentik.io/auth/traefik
        trustForwardHeader: true
        authResponseHeaders:
          - X-authentik-username
          - X-authentik-groups
          - X-authentik-email
          - X-authentik-name
          - X-authentik-uid
```

---

## Phase 7 - DNS Configuration

Every service needs a DNS record pointing `<service>.hrmsmrflrii.xyz` to Traefik's IP (192.168.40.20). DNS is managed by OPNsense Unbound.

### Option A: OPNsense Web UI (Manual)

1. Login to OPNsense: **https://192.168.91.30**
2. Navigate: **Services** > **Unbound DNS** > **Overrides** > **Host Overrides**
3. Click **+** (Add):

| Field | Value |
|-------|-------|
| Host | `myservice` |
| Domain | `hrmsmrflrii.xyz` |
| Type | `A (IPv4 address)` |
| IP | `192.168.40.20` (Traefik) |
| Description | `My Service - reverse proxy` |

4. Click **Save**
5. Click **Apply Changes** (this reconfigures Unbound)

### Option B: OPNsense API (Automated)

```bash
# Set API credentials (get from System > Access > Users > API keys)
export OPNSENSE_API_KEY="your-api-key"
export OPNSENSE_API_SECRET="your-api-secret"

# Add DNS host override via API
curl -k -X POST "https://192.168.91.30/api/unbound/settings/addHostOverride" \
  -u "${OPNSENSE_API_KEY}:${OPNSENSE_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "host": {
      "enabled": "1",
      "hostname": "myservice",
      "domain": "hrmsmrflrii.xyz",
      "rr": "A",
      "server": "192.168.40.20",
      "description": "My Service"
    }
  }'

# Reconfigure Unbound to apply the change
curl -k -X POST "https://192.168.91.30/api/unbound/service/reconfigure" \
  -u "${OPNSENSE_API_KEY}:${OPNSENSE_API_SECRET}"
```

### Verify DNS Resolution

```bash
# Test DNS resolves correctly
nslookup myservice.hrmsmrflrii.xyz

# Expected output:
# Server:  pi.hole
# Address: 192.168.90.53
#
# Name:    myservice.hrmsmrflrii.xyz
# Address: 192.168.40.20

# If DNS doesn't resolve, test directly against OPNsense
nslookup myservice.hrmsmrflrii.xyz 192.168.91.30
```

> **Important**: ALL service DNS records point to **192.168.40.20** (Traefik), not the service IP directly. Traefik handles routing based on the hostname in the HTTP request.

---

## Phase 8 - SSL Certificates

SSL is **fully automatic**. No manual steps required.

### How It Works

1. Traefik detects a new router with `certResolver: letsencrypt`
2. Traefik uses the Cloudflare DNS-01 challenge to prove domain ownership
3. Let's Encrypt issues a certificate for `myservice.hrmsmrflrii.xyz`
4. Certificate is stored in `/opt/traefik/certs/acme.json`
5. Auto-renewal happens before expiration (every 60-90 days)

### Verify SSL

```bash
# Test HTTPS works
curl -vI https://myservice.hrmsmrflrii.xyz 2>&1 | grep -E "SSL|issuer|subject"

# Expected output includes:
# * SSL certificate verify ok.
# *  subject: CN=myservice.hrmsmrflrii.xyz
# *  issuer: C=US; O=Let's Encrypt
```

### Troubleshooting SSL

```bash
# Check Traefik ACME logs
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.20 \
  "docker logs traefik 2>&1 | grep -i acme"

# Verify acme.json has the certificate
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.20 \
  "cat /opt/traefik/certs/acme.json | python3 -c 'import sys,json; certs=json.load(sys.stdin); [print(c[\"domain\"][\"main\"]) for c in certs.get(\"letsencrypt\",{}).get(\"Certificates\",[])]'"
```

---

## Phase 9 - Authentik SSO Integration

Only needed if the service requires login protection. Skip for public services, APIs, or services with their own auth.

### When to Use SSO

| Use SSO | Skip SSO |
|---------|----------|
| Admin dashboards (Grafana, Proxmox) | Public speed tests |
| Services without built-in auth | Services with strong built-in auth |
| Sensitive data (Paperless, n8n) | API endpoints |
| Multi-user services | Internal-only monitoring tools |

### Method A: Traefik ForwardAuth (Easiest)

This adds an Authentik login gate in front of ANY service, even if the service has no auth support.

#### Step 1: Create Provider in Authentik

1. Open https://auth.hrmsmrflrii.xyz/if/admin/
2. Navigate: **Applications** > **Providers** > **Create**
3. Select **Proxy Provider**

| Field | Value |
|-------|-------|
| Name | `myservice-provider` |
| Authorization Flow | `default-provider-authorization-implicit-consent` |
| Type | `Forward auth (single application)` |
| External Host | `https://myservice.hrmsmrflrii.xyz` |

4. Click **Finish**

#### Step 2: Create Application in Authentik

1. Navigate: **Applications** > **Applications** > **Create**

| Field | Value |
|-------|-------|
| Name | `My Service` |
| Slug | `myservice` |
| Provider | `myservice-provider` (created above) |
| Launch URL | `https://myservice.hrmsmrflrii.xyz` |

2. Click **Create**

#### Step 3: Assign to Outpost

> **This step is the #1 most forgotten step. Without it, SSO won't work.**

1. Navigate: **Applications** > **Outposts**
2. Edit **authentik Embedded Outpost**
3. Under **Applications**, add `My Service` to the Selected list
4. Click **Update**

#### Step 4: Add Middleware to Traefik Router

Already shown in Phase 6 — add `middlewares: [authentik]` to the router definition.

### Method B: Native OIDC (For Supporting Services)

Some services have built-in OIDC/OAuth2 support (GitLab, Immich, Grafana). This is preferred when available because it provides deeper integration (user roles, groups, etc.).

#### Step 1: Create Provider in Authentik

1. Navigate: **Applications** > **Providers** > **Create**
2. Select **OAuth2/OpenID Provider**

| Field | Value |
|-------|-------|
| Name | `myservice-oidc` |
| Authorization Flow | `default-provider-authorization-implicit-consent` |
| Client Type | `Confidential` |
| Client ID | (auto-generated, copy this) |
| Client Secret | (auto-generated, copy this) |
| Redirect URIs | `https://myservice.hrmsmrflrii.xyz/auth/callback` (check service docs) |

#### Step 2: Configure the Service

Use these Authentik OIDC endpoints in your service's SSO settings:

| Endpoint | URL |
|----------|-----|
| Authorization | `https://auth.hrmsmrflrii.xyz/application/o/authorize/` |
| Token | `https://auth.hrmsmrflrii.xyz/application/o/token/` |
| Userinfo | `https://auth.hrmsmrflrii.xyz/application/o/userinfo/` |
| JWKS | `https://auth.hrmsmrflrii.xyz/application/o/<slug>/jwks/` |
| OpenID Config | `https://auth.hrmsmrflrii.xyz/application/o/<slug>/.well-known/openid-configuration` |

---

## Phase 10 - Glance Dashboard and Service Monitoring

The Glance Services page displays health status, version info, and update availability for all monitored services. This is powered by the **Service Version API** running on 192.168.40.13:5070.

### How It Works

```
Service Version API (192.168.40.13:5070)
│
├── SERVICE_REGISTRY (Python dict)     ◀── You add your service here
│   Defines: name, category, host, compose dir, health URL
│
├── Health Check Thread (every 55s)
│   SSH to host → docker inspect → check container state
│   HTTP request → health_url → check HTTP response
│
├── Version Check Thread (every 1hr)
│   SSH to host → docker inspect → get running image digest
│   Query Docker Hub/GHCR → get latest remote digest
│   Compare → "update available" if different
│
└── API Endpoints
    GET /api/services              → All services by category
    GET /api/services/<category>   → Single category
    GET /api/summary               → Count summary
    POST /api/update/<service>     → Trigger update (requires API key)
```

Glance queries these API endpoints with 1-minute caching. No Glance config changes needed — just add to the Service Version API and it appears automatically.

### Step 1: Add Service to SERVICE_REGISTRY

SSH to the utilities host and edit the Service Version API:

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.13
sudo nano /opt/service-version-api/service-version-api.py
```

Find the `SERVICE_REGISTRY` dictionary and add your service:

```python
SERVICE_REGISTRY = {
    # ... existing services ...

    "myservice": {
        "display_name": "My Service",
        "category": "core_apps",           # Category (see table below)
        "icon": "my-service",              # Icon name from dashboard-icons
        "host_ip": "192.168.40.XX",        # Host where container runs
        "compose_dir": "/opt/myservice",   # Docker compose directory
        "container_name": "myservice",     # Container name in 'docker ps'
        "health_url": "http://192.168.40.XX:8080/health",  # Health endpoint (or None)
        "web_url": "https://myservice.hrmsmrflrii.xyz",    # Web UI URL
    },
}
```

### Category Reference

| Category | Description | Glance Section |
|----------|-------------|---------------|
| `infrastructure` | Proxmox, NAS, PBS | Critical Infrastructure |
| `auth` | Authentik, Pi-hole | Auth & Identity |
| `core_apps` | GitLab, n8n, Paperless, Home Assistant | Core Applications |
| `media` | Jellyfin, *arr stack, Overseerr | Media Stack |
| `monitoring` | Grafana, Prometheus, Uptime Kuma | Monitoring & Observability |
| `apis_bots` | Custom APIs, Discord bots | Custom APIs & Bots |

### Special Configuration Options

```python
# For services without a Docker container (HTTP-only monitoring)
"proxmox-node01": {
    "display_name": "Proxmox Node 01",
    "type": "http_only",                   # No Docker inspection
    "health_url": "https://192.168.20.20:8006",
    # ... other fields ...
},

# For locally-built containers (no upstream registry to check)
"sentinel-bot": {
    "display_name": "Sentinel Bot",
    "registry": "local",                   # Skip upstream version check
    # ... other fields ...
},

# For multi-service compose files where service name differs from container
"grafana": {
    "compose_service": "grafana",          # Service name in docker-compose.yml
    "compose_dir": "/opt/monitoring",      # Shared compose file
    # ... other fields ...
},

# For services that should NOT have one-click update
"traefik": {
    # Add to UPDATE_BLACKLIST at the top of the file
    # UPDATE_BLACKLIST = ["traefik", "authentik-server", ...]
},
```

### Step 2: Restart the Service Version API

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.13
docker restart service-version-api
```

### Step 3: Verify

```bash
# Check the service appears in the API
curl -s http://192.168.40.13:5070/api/services | python3 -m json.tool | grep myservice

# Check health status
curl -s http://192.168.40.13:5070/api/services/core_apps | python3 -m json.tool
```

The service will automatically appear on the Glance Services page (https://glance.hrmsmrflrii.xyz, Services tab) within 1 minute.

### Icon Reference

Icons come from the [Dashboard Icons](https://github.com/walkxcode/dashboard-icons) repository. Find your service icon name there. For Glance, you can use:
- `si:<name>` — Simple Icons (brand logos)
- `mdi:<name>` — Material Design Icons (generic icons)
- Full URL to a PNG — Custom icons

---

## Phase 11 - Discord Bot Integration

Two Discord bots need to know about your service for update tracking and management.

### Sentinel Bot (Primary)

Location: `/opt/sentinel-bot/config.py` on 192.168.40.13

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.13
sudo nano /opt/sentinel-bot/config.py
```

#### Add to CONTAINER_HOSTS

Maps container name to the host IP where it runs. Used by `/check` command to scan for updates.

```python
CONTAINER_HOSTS = {
    # ... existing entries ...
    'myservice': '192.168.40.XX',          # Add your container
}
```

#### Add to COMPOSE_DIRS

Maps container name to the docker-compose directory. Required for the `/update` command to know where to run `docker compose pull`.

```python
COMPOSE_DIRS = {
    # ... existing entries ...
    'myservice': '/opt/myservice',         # Add compose directory
}
```

#### Restart Sentinel Bot

```bash
cd /opt/sentinel-bot && docker compose restart
```

### Argus Bot (Watchtower Integration)

Location: `/opt/argus-bot/argus-bot.py` on 192.168.40.13 (or in the repo at `ansible/playbooks/container-updates/argus-bot.py`)

```bash
sudo nano /opt/argus-bot/argus-bot.py
```

#### Add to CONTAINER_HOSTS

```python
CONTAINER_HOSTS = {
    # ... existing entries ...
    "myservice": "192.168.40.XX",          # Keep in sync with Sentinel Bot
}
```

#### For Custom-Built Containers (Not from Docker Hub)

If the container is built locally (not pulled from a registry), also add to CUSTOM_CONTAINERS:

```python
CUSTOM_CONTAINERS = {
    "myservice": {"host": "192.168.40.XX", "path": "/opt/myservice"},
}
```

#### Restart Argus Bot

```bash
cd /opt/argus-bot && docker compose down && docker compose up -d
```

### Discord Commands After Onboarding

Once configured, these commands work for your new service:

| Command | Bot | Description |
|---------|-----|-------------|
| `/check` | Sentinel | Scans all containers including yours for updates |
| `/update myservice` | Sentinel | Pulls latest image and recreates container |
| `/containers` | Sentinel | Lists all monitored containers |

---

## Phase 12 - Watchtower Update Monitoring

Watchtower runs on each Docker host and monitors containers for image updates. It sends webhooks to the Argus bot when updates are detected.

### Default Behavior

If your host already has Watchtower running (all main Docker hosts do), your new container is **automatically monitored** — no configuration needed.

### Verify Watchtower is Running on Your Host

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.XX
docker ps --filter name=watchtower
```

### If Watchtower is NOT Running (New Host)

Deploy Watchtower on the new Docker host:

```bash
sudo mkdir -p /opt/watchtower
sudo tee /opt/watchtower/docker-compose.yml > /dev/null << 'EOF'
name: watchtower

services:
  watchtower:
    image: containrrr/watchtower:latest
    container_name: watchtower
    restart: unless-stopped
    environment:
      DOCKER_API_VERSION: "1.44"
      WATCHTOWER_SCHEDULE: "0 0 3 * * *"    # Check at 3 AM daily
      WATCHTOWER_CLEANUP: "true"             # Remove old images after update
      WATCHTOWER_INCLUDE_STOPPED: "false"    # Ignore stopped containers
      WATCHTOWER_MONITOR_ONLY: "true"        # Don't auto-update, just notify
      WATCHTOWER_NOTIFICATIONS: "shoutrrr"
      WATCHTOWER_NOTIFICATION_URL: "generic+http://192.168.40.13:5050/webhook"
      TZ: "America/New_York"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
EOF

cd /opt/watchtower && docker compose up -d
```

**Key settings**:
- `WATCHTOWER_MONITOR_ONLY: "true"` — **Critical**: Only detect updates, don't auto-apply. Updates go through Discord approval via Argus bot
- `WATCHTOWER_NOTIFICATION_URL` — Must use `generic+http://` format (not `generic://`). Wrong format causes TLS handshake errors
- `/var/run/docker.sock:ro` — Read-only access to Docker socket for inspecting containers

### Excluding a Container from Watchtower

Add this label to your docker-compose.yml to exclude a container from monitoring:

```yaml
labels:
  - "com.centurylinklabs.watchtower.enable=false"
```

---

## Phase 13 - Documentation

After deploying and integrating the service, update these documentation files:

### 1. Obsidian: Deployed Services

Edit `obsidian-homelab/07 - Deployed Services.md`:

```markdown
### My Service (myservice-lxc)

**Status**: Deployed February 2026

| Property | Value |
|----------|-------|
| Host | myservice-lxc (LXC 209) |
| IP:Port | 192.168.40.XX:8080 |
| URL | https://myservice.hrmsmrflrii.xyz |
| Docker Image | vendor/myservice:latest |
| Config Path | /opt/myservice/ |
| SSO | Authentik ForwardAuth |
```

### 2. Obsidian: IP Address Map

Edit `obsidian-homelab/10 - IP Address Map.md` — add the new IP allocation.

### 3. Context File

Edit `.claude/context.md` — add to Deployed Hosts table.

### 4. Docker Services Reference

Edit `obsidian-homelab/45 - Docker Services Reference.md` — add container details.

### 5. Session Log

Edit `.claude/session-log.md` — document what was deployed and when.

---

## Complete Onboarding Checklist

Copy this checklist when onboarding a new service:

### Infrastructure
- [ ] Decide: LXC, VM, or existing host
- [ ] Provision host (if new): IP assigned, SSH configured, key deployed
- [ ] Install Docker (if new host): engine, compose, log rotation, journal limits
- [ ] Configure NAS mounts (if needed): fstab entry, mount -a, verify

### Container Deployment
- [ ] Create `/opt/<service>/docker-compose.yml`
- [ ] Deploy: `docker compose up -d`
- [ ] Verify: container running, logs clean, health endpoint responds

### External Access
- [ ] Traefik: Add router + service to `/opt/traefik/config/dynamic/services.yml`
- [ ] DNS: Add host override in OPNsense (`<service>` → `192.168.40.20`)
- [ ] SSL: Verify HTTPS works (automatic via Let's Encrypt)
- [ ] Authentik SSO (if needed): Provider + Application + Outpost assignment

### Monitoring Integration
- [ ] Service Version API: Add to `SERVICE_REGISTRY` in `service-version-api.py`
- [ ] Sentinel Bot: Add to `CONTAINER_HOSTS` and `COMPOSE_DIRS` in `config.py`
- [ ] Argus Bot: Add to `CONTAINER_HOSTS` in `argus-bot.py`
- [ ] Watchtower: Verify running on host (or deploy if new host)
- [ ] Verify: Service appears on Glance Services page

### Documentation
- [ ] `obsidian-homelab/07 - Deployed Services.md`
- [ ] `obsidian-homelab/10 - IP Address Map.md`
- [ ] `.claude/context.md` — Deployed Hosts table
- [ ] `.claude/session-log.md` — Session entry

---

## Quick Reference

### SSH Access

```bash
# All services hosts use the same SSH key
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.XX

# Exception: Glance LXC uses root
ssh -i ~/.ssh/homelab_ed25519 root@192.168.40.12
```

### Service Directory Convention

All Docker services follow: `/opt/<service-name>/docker-compose.yml`

### Port Allocation

| Range | Category | Examples |
|-------|----------|----------|
| 80, 443 | Traefik (reserved) | HTTP/HTTPS entry |
| 2283 | Immich (reserved) | Photo management |
| 3000-3999 | Monitoring & Utilities | Grafana (3030), Uptime Kuma (3001), Speedtest (3000) |
| 5050-5099 | Custom APIs & Bots | Sentinel (5050), Life Progress (5051), Media Stats (5054) |
| 5100-5999 | Request Managers | Overseerr (5055), Jellyseerr (5056) |
| 6000-6999 | Subtitle Services | Bazarr (6767) |
| 7000-7999 | Download Automation | Autobrr (7474), Radarr (7878) |
| 8000-8999 | Web Applications | Jellyfin (8096), Sonarr (8989), Deluge (8112) |
| 9000-9999 | Auth & Indexers | Authentik (9000), Prowlarr (9696), Prometheus (9090) |

### Key Configuration Files

| File | Host | Purpose |
|------|------|---------|
| `/opt/traefik/config/dynamic/services.yml` | 192.168.40.20 | Traefik routing |
| `/opt/service-version-api/service-version-api.py` | 192.168.40.13 | Glance service monitoring |
| `/opt/sentinel-bot/config.py` | 192.168.40.13 | Discord bot config |
| `/opt/argus-bot/argus-bot.py` | 192.168.40.13 | Watchtower integration |
| `/opt/glance/config/glance.yml` | 192.168.40.12 | Glance dashboard |

---

## Worked Example - Deploying a New Service End-to-End

### Scenario: Deploy Linkding (Bookmark Manager)

Let's walk through deploying Linkding as a real example, hitting every phase.

**Decision**: Lightweight single service → add to existing utilities host (192.168.40.13). No new LXC/VM needed. No NAS mount needed (bookmarks stored locally).

#### 1. Deploy Container

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.13

sudo mkdir -p /opt/linkding
sudo tee /opt/linkding/docker-compose.yml > /dev/null << 'EOF'
name: linkding

services:
  linkding:
    image: sissbruecker/linkding:latest
    container_name: linkding
    restart: unless-stopped
    ports:
      - "9191:9090"
    volumes:
      - ./data:/etc/linkding/data
    environment:
      - TZ=Asia/Manila
      - LD_SUPERUSER_NAME=hermes
      - LD_SUPERUSER_PASSWORD=changeme
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
EOF

cd /opt/linkding && docker compose up -d
docker logs linkding --tail 20
```

#### 2. Add Traefik Route

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.20
sudo nano /opt/traefik/config/dynamic/services.yml
```

Add:
```yaml
# Under routers:
    linkding:
      rule: "Host(`bookmarks.hrmsmrflrii.xyz`)"
      service: linkding
      entryPoints: [websecure]
      tls:
        certResolver: letsencrypt
      middlewares: [authentik]

# Under services:
    linkding:
      loadBalancer:
        servers:
          - url: "http://192.168.40.13:9191"
```

#### 3. Add DNS Record

In OPNsense: Services > Unbound DNS > Host Overrides > Add:
- Host: `bookmarks`, Domain: `hrmsmrflrii.xyz`, IP: `192.168.40.20`

#### 4. Authentik SSO

1. Create Proxy Provider: `linkding-provider`, External Host: `https://bookmarks.hrmsmrflrii.xyz`
2. Create Application: `Linkding`, Slug: `linkding`, Provider: `linkding-provider`
3. Add to Embedded Outpost

#### 5. Service Version API

```python
"linkding": {
    "display_name": "Linkding",
    "category": "core_apps",
    "icon": "linkding",
    "host_ip": "192.168.40.13",
    "compose_dir": "/opt/linkding",
    "container_name": "linkding",
    "health_url": "http://192.168.40.13:9191/health",
    "web_url": "https://bookmarks.hrmsmrflrii.xyz",
},
```

#### 6. Sentinel Bot

```python
# In CONTAINER_HOSTS:
'linkding': '192.168.40.13',

# In COMPOSE_DIRS:
'linkding': '/opt/linkding',
```

#### 7. Argus Bot

```python
# In CONTAINER_HOSTS:
"linkding": "192.168.40.13",
```

#### 8. Restart Services

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.13
docker restart service-version-api
cd /opt/sentinel-bot && docker compose restart
cd /opt/argus-bot && docker compose down && docker compose up -d
```

#### 9. Verify

- https://bookmarks.hrmsmrflrii.xyz — loads with Authentik login
- Glance Services page — shows Linkding with green health status
- `/check` in Discord — includes Linkding in scan results

---

## Related Documentation

- [[13 - Service Configuration Guide]] - Detailed Docker and service configs with explanations
- [[22 - Service Onboarding Workflow]] - Discord bot onboarding checker
- [[09 - Traefik Reverse Proxy]] - Traefik configuration deep dive
- [[14 - Authentik Google SSO Setup]] - SSO setup with Google as identity source
- [[19 - Watchtower Updates]] - Automated update monitoring
- [[47 - Manual Service Updates Guide]] - How to manually update any service
- [[45 - Docker Services Reference]] - Complete container inventory
- [[07 - Deployed Services]] - All deployed services
- [[10 - IP Address Map]] - IP allocation table
- [[46 - Immich Disk Full Troubleshooting]] - Why log rotation matters

---

*Last updated: February 2026*
