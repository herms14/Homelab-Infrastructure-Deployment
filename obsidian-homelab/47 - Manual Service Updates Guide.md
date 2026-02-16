# Manual Service Updates Guide

> Step-by-step procedures for manually updating Docker services across all homelab hosts.

Related: [[19 - Watchtower Updates]] | [[45 - Docker Services Reference]] | [[07 - Deployed Services]]

---

## Overview

While Watchtower monitors for updates automatically and notifies via Discord, there are times when you need to update services manually — bulk updates, troubleshooting, or when Watchtower's automated flow isn't sufficient.

This guide covers every Docker host and its services, with exact commands for each.

### General Update Process

Every Docker service follows the same pattern:

```bash
# 1. SSH into the host
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@<HOST_IP>

# 2. Navigate to the compose directory
cd /opt/<service-directory>/

# 3. Pull latest images
docker compose pull

# 4. Recreate containers with new images
docker compose up -d

# 5. (Optional) Clean up old images
docker image prune -f
```

> [!important] Pull Before Recreate
> Always run `docker compose pull` before `docker compose up -d`. Running `up -d` alone will only recreate containers if the compose file changed — it won't pull new images.

> [!warning] Never Use `docker restart`
> A `docker restart` does NOT apply new images. Containers must be recreated with `docker compose up -d` to use pulled images.

---

## Pre-Update Checklist

Before updating any service:

- [ ] Check which services have updates (Glance Services page or `docker compose pull --dry-run`)
- [ ] For database-backed services (Ghostfolio, Home Assistant), ensure backups exist
- [ ] Note the current version in case rollback is needed: `docker inspect <container> | grep Image`

---

## Host 1: Media Stack (192.168.40.11)

**Host**: docker-lxc-media
**SSH**: `ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.11`

### Arr Stack (8 services)

All media management services share a single docker-compose file.

**Compose Path**: `/opt/arr-stack/docker-compose.yml`

| Service | Port | Image |
|---------|------|-------|
| Radarr | 7878 | lscr.io/linuxserver/radarr:latest |
| Sonarr | 8989 | lscr.io/linuxserver/sonarr:latest |
| Lidarr | 8686 | lscr.io/linuxserver/lidarr:latest |
| Prowlarr | 9696 | lscr.io/linuxserver/prowlarr:latest |
| Bazarr | 6767 | lscr.io/linuxserver/bazarr:latest |
| Overseerr | 5055 | lscr.io/linuxserver/overseerr:latest |
| Autobrr | 7474 | ghcr.io/autobrr/autobrr:latest |
| Deluge | 8112 | lscr.io/linuxserver/deluge:latest |
| SABnzbd | 8080 | lscr.io/linuxserver/sabnzbd:latest |

**Update all arr-stack services:**

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.11
cd /opt/arr-stack
docker compose pull
docker compose up -d
```

**Update a single service** (e.g., Radarr only):

```bash
cd /opt/arr-stack
docker compose pull radarr
docker compose up -d radarr
```

**Verify after update:**

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" | grep -E "radarr|sonarr|lidarr|prowlarr|bazarr|overseerr|autobrr|deluge|sabnzbd"
```

### MeTube

**Compose Path**: `/opt/metube/docker-compose.yml`

| Service | Port | Image |
|---------|------|-------|
| MeTube | 8081 | ghcr.io/alexta69/metube:latest |

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.11
cd /opt/metube
docker compose pull
docker compose up -d
```

---

## Host 2: Core Utilities (192.168.40.13)

**Host**: docker-vm-core-utilities01
**SSH**: `ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.13`

### Monitoring Stack (Grafana, Speedtest Tracker, Prometheus, etc.)

**Compose Path**: `/opt/monitoring/docker-compose.yml`

| Service | Port | Image |
|---------|------|-------|
| Grafana | 3030 | grafana/grafana:latest |
| Prometheus | 9090 | prom/prometheus:latest |
| Speedtest Tracker | 3000 | lscr.io/linuxserver/speedtest-tracker:latest |
| Uptime Kuma | 3001 | louislam/uptime-kuma:latest |
| Jaeger | 16686 | jaegertracing/all-in-one:latest |
| cAdvisor | 8081 | gcr.io/cadvisor/cadvisor:latest |

**Update all monitoring services:**

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.13
cd /opt/monitoring
docker compose pull
docker compose up -d
```

**Update Grafana only:**

```bash
cd /opt/monitoring
docker compose pull grafana
docker compose up -d grafana
```

> [!note] Grafana Dashboards
> Grafana dashboards are file-provisioned from `/opt/monitoring/grafana/dashboards/`. They persist through updates — no data is lost when Grafana is recreated.

### Tracearr

**Compose Path**: `/opt/tracearr/docker-compose.yml`

| Service | Port | Image |
|---------|------|-------|
| Tracearr | 3002 | ghcr.io/connorgallopo/tracearr:supervised |

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.13
cd /opt/tracearr
docker compose pull
docker compose up -d
```

---

## Host 3: Home Assistant (192.168.40.25)

**Host**: homeassistant-lxc
**SSH**: `ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.25`

### Home Assistant

**Compose Path**: `/opt/homeassistant/docker-compose.yml`

| Service | Port | Image |
|---------|------|-------|
| Home Assistant | 8123 | ghcr.io/home-assistant/home-assistant:stable |

> [!warning] Pre-Update Backup
> Home Assistant stores automations, integrations, and device configs in its data volume. While unlikely, major version updates can occasionally break integrations. Check the [Home Assistant release notes](https://www.home-assistant.io/blog/) before updating.

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.25
cd /opt/homeassistant
docker compose pull
docker compose up -d
```

**Verify Home Assistant is healthy:**

```bash
curl -s http://localhost:8123/api/ | head -c 100
```

---

## Host 4: Ghostfolio (192.168.40.26)

**Host**: ghostfolio-lxc
**SSH**: `ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.26`

### Ghostfolio (with PostgreSQL and Redis)

**Compose Path**: `/opt/ghostfolio/docker-compose.yml`

| Service | Port | Image |
|---------|------|-------|
| Ghostfolio | 3333 | ghostfolio/ghostfolio:latest |
| PostgreSQL | 5432 | postgres:15 |
| Redis | 6379 | redis:alpine |

> [!warning] Database-Backed Service
> Ghostfolio uses PostgreSQL for all financial data. While `docker compose up -d` preserves volumes (data persists), always ensure Proxmox backup exists before major updates.

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.26
cd /opt/ghostfolio
docker compose pull
docker compose up -d
```

**Verify Ghostfolio is healthy:**

```bash
curl -s http://localhost:3333/api/v1/info | head -c 200
```

---

## Host 5: Glance Dashboard (192.168.40.12)

**Host**: docker-lxc-glance
**SSH**: `ssh -i ~/.ssh/homelab_ed25519 root@192.168.40.12`

> [!note] Root Access
> The Glance LXC uses root for Docker, not hermes-admin.

### Glance

**Compose Path**: `/opt/glance/docker-compose.yml`

| Service | Port | Image |
|---------|------|-------|
| Glance | 8080 | glanceapp/glance:latest |

```bash
ssh -i ~/.ssh/homelab_ed25519 root@192.168.40.12
cd /opt/glance
docker compose pull
docker compose up -d
```

---

## Host 6: Infrastructure Services

### Traefik (192.168.40.20)

**SSH**: `ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.20`
**Compose Path**: `/opt/traefik/docker-compose.yml`

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.20
cd /opt/traefik
docker compose pull
docker compose up -d
```

> [!danger] Traefik is Critical Infrastructure
> Traefik is the reverse proxy for ALL services. Verify it's running immediately after update. If broken, all `*.hrmsmrflrii.xyz` URLs go down.

**Verify:**

```bash
curl -s -o /dev/null -w "%{http_code}" https://glance.hrmsmrflrii.xyz
# Should return 200
```

### Authentik (192.168.40.21)

**SSH**: `ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.21`
**Compose Path**: `/opt/authentik/docker-compose.yml`

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.21
cd /opt/authentik
docker compose pull
docker compose up -d
```

> [!warning] Authentik is SSO Provider
> Authentik handles authentication for Grafana, Proxmox, and other services. Test login immediately after updating.

### Immich (192.168.40.22)

**SSH**: `ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.22`
**Compose Path**: `/opt/immich/docker-compose.yml`

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.22
cd /opt/immich
docker compose pull
docker compose up -d
```

> [!warning] Check Release Notes First
> Immich has breaking changes between major versions. Always check [Immich releases](https://github.com/immich-app/immich/releases) before updating.

**Verify:**

```bash
curl -s http://localhost:2283/api/server/ping
# Should return {"res":"pong"}
```

### GitLab (192.168.40.23)

**SSH**: `ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.23`
**Compose Path**: `/opt/gitlab/docker-compose.yml`

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.23
cd /opt/gitlab
docker compose pull
docker compose up -d
```

> [!note] GitLab Takes Time
> GitLab can take 3-5 minutes to fully start after recreation. Wait before checking.

---

## Bulk Update All Hosts

To update everything at once, run these commands sequentially:

```bash
# Media Stack
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.11 "cd /opt/arr-stack && docker compose pull && docker compose up -d"
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.11 "cd /opt/metube && docker compose pull && docker compose up -d"

# Core Utilities
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.13 "cd /opt/monitoring && docker compose pull && docker compose up -d"
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.13 "cd /opt/tracearr && docker compose pull && docker compose up -d"

# Home Assistant
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.25 "cd /opt/homeassistant && docker compose pull && docker compose up -d"

# Ghostfolio
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.26 "cd /opt/ghostfolio && docker compose pull && docker compose up -d"

# Glance
ssh -i ~/.ssh/homelab_ed25519 root@192.168.40.12 "cd /opt/glance && docker compose pull && docker compose up -d"
```

---

## Post-Update Tasks

### 1. Clean Up Old Images

After updating, remove dangling images to reclaim disk space:

```bash
# Per host
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.11 "docker image prune -f"
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.13 "docker image prune -f"
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.25 "docker image prune -f"
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.26 "docker image prune -f"
ssh -i ~/.ssh/homelab_ed25519 root@192.168.40.12 "docker image prune -f"
```

### 2. Force Service Version API Rescan

The Glance Services page uses the Service Version API to display current versions. After updating, force a rescan:

```bash
ssh -i ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.13 "docker restart service-version-api"
```

### 3. Verify Services on Glance

Open https://glance.hrmsmrflrii.xyz and navigate to the Services page. All updated services should show the new version with no pending updates.

---

## Rollback Procedure

If an update breaks a service:

```bash
# 1. Check what image was running before
docker inspect <container> --format '{{.Config.Image}}'

# 2. Pin the previous version in docker-compose.yml
# Change: image: service:latest
# To:     image: service:specific-version-tag

# 3. Pull and recreate
docker compose pull <service>
docker compose up -d <service>
```

For critical failures, restore from Proxmox Backup Server:
- PBS Web UI: https://pbs.hrmsmrflrii.xyz
- See [[40 - PBS Disaster Recovery]] for restore procedures

---

## Quick Reference Table

| Host | IP | SSH User | Compose Path | Services |
|------|-----|----------|-------------|----------|
| docker-lxc-media | 192.168.40.11 | hermes-admin | `/opt/arr-stack/` | Radarr, Sonarr, Lidarr, Prowlarr, Bazarr, Overseerr, Autobrr, Deluge, SABnzbd |
| docker-lxc-media | 192.168.40.11 | hermes-admin | `/opt/metube/` | MeTube |
| docker-vm-core-utilities01 | 192.168.40.13 | hermes-admin | `/opt/monitoring/` | Grafana, Prometheus, Speedtest Tracker, Uptime Kuma, Jaeger, cAdvisor |
| docker-vm-core-utilities01 | 192.168.40.13 | hermes-admin | `/opt/tracearr/` | Tracearr |
| homeassistant-lxc | 192.168.40.25 | hermes-admin | `/opt/homeassistant/` | Home Assistant |
| ghostfolio-lxc | 192.168.40.26 | hermes-admin | `/opt/ghostfolio/` | Ghostfolio, PostgreSQL, Redis |
| docker-lxc-glance | 192.168.40.12 | root | `/opt/glance/` | Glance |
| traefik-vm01 | 192.168.40.20 | hermes-admin | `/opt/traefik/` | Traefik |
| authentik-vm01 | 192.168.40.21 | hermes-admin | `/opt/authentik/` | Authentik |
| immich-vm01 | 192.168.40.22 | hermes-admin | `/opt/immich/` | Immich |
| gitlab-vm01 | 192.168.40.23 | hermes-admin | `/opt/gitlab/` | GitLab |

---

## Related Documentation

- [[19 - Watchtower Updates]] - Automated update monitoring and Discord approval flow
- [[45 - Docker Services Reference]] - Complete container inventory
- [[07 - Deployed Services]] - All deployed services overview
- [[40 - PBS Disaster Recovery]] - Restore procedures if updates fail
- [[46 - Immich Disk Full Troubleshooting]] - Disk space management after updates
