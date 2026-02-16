# Immich Disk Full Troubleshooting Guide

Complete guide to diagnosing and recovering from disk-full incidents on the Immich host (192.168.40.22), including the failure cascade, fix procedures, and prevention measures.

---

## Overview

### Failure Cascade Diagram

```
IMMICH DISK FULL - FAILURE CASCADE
====================================

                    19GB Root Disk (immich-vm01)
                              │
                    ┌─────────┴─────────────┐
                    │  Docker logs grow      │
                    │  Journal logs grow     │
                    │  Docker images accumulate│
                    └─────────┬─────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  DISK REACHES 100%  │
                    │  df -h shows 0 free │
                    └─────────┬───────────┘
                              │
                ┌─────────────┼─────────────────┐
                │             │                  │
                ▼             ▼                  ▼
        ┌───────────┐ ┌──────────────┐ ┌──────────────┐
        │ Redis RDB │ │ PostgreSQL   │ │ Docker       │
        │ Save Fail │ │ WAL Issues   │ │ Can't Write  │
        │           │ │              │ │ Logs         │
        │ MISCONF   │ │ Potential    │ │              │
        │ error     │ │ data loss    │ │ Container    │
        └─────┬─────┘ └──────┬───────┘ │ restarts    │
              │               │         └──────┬───────┘
              ▼               ▼                ▼
        ┌─────────────────────────────────────────┐
        │         IMMICH SERVER CRASHES            │
        │                                          │
        │  • Container shows (unhealthy)           │
        │  • photos.hrmsmrflrii.xyz unreachable    │
        │  • API returns 502 Bad Gateway           │
        └──────────────────────────────────────────┘
```

---

## Symptoms

| Symptom | Where to Check |
|---------|----------------|
| `photos.hrmsmrflrii.xyz` returns 502 Bad Gateway | Browser |
| `immich-server` shows `(unhealthy)` status | `docker ps` on 192.168.40.22 |
| `immich-redis` logs show `MISCONF Redis is configured to save RDB snapshots` | `docker logs immich-redis` |
| `immich-server` logs show connection errors | `docker logs immich-server` |
| Root disk shows 100% or 0 available | `df -h /` on 192.168.40.22 |
| Multiple containers in restart loop | `docker ps -a` on 192.168.40.22 |

### Redis MISCONF Error (Key Indicator)

```
MISCONF Redis is configured to save RDB snapshots, but it's currently unable to
persist to disk. Commands that may modify the data set are disabled, because this
instance is configured to report errors during writes if RDB snapshotting fails
(stop-writes-on-bgsave-error option). Please check the Redis logs for details
about the RDB error.
```

This is the primary indicator that disk space caused the cascade failure. Redis cannot write its RDB snapshot file, so it refuses all write operations, which crashes Immich.

---

## Diagnosis Steps

### Step 1: Verify the disk is full

```bash
ssh hermes-admin@192.168.40.22 "df -h /"
```

Expected output when full:
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda2        19G   19G     0 100% /
```

### Step 2: Check container status

```bash
ssh hermes-admin@192.168.40.22 "docker ps --format 'table {{.Names}}\t{{.Status}}'"
```

Look for:
- `immich-server` showing `(unhealthy)` or `Restarting`
- `immich-redis` showing `Up` but with errors
- `immich-postgres` status

### Step 3: Check Redis logs for RDB errors

```bash
ssh hermes-admin@192.168.40.22 "docker logs immich-redis --tail 20 2>&1 | grep -i 'MISCONF\|error\|fail'"
```

### Step 4: Check Immich server logs

```bash
ssh hermes-admin@192.168.40.22 "docker logs immich-server --tail 30 2>&1"
```

### Step 5: Identify what's consuming disk space

```bash
ssh hermes-admin@192.168.40.22 "sudo du -sh /var/lib/docker/ /var/log/ /opt/ 2>/dev/null | sort -rh"
```

### Step 6: Check Docker image usage

```bash
ssh hermes-admin@192.168.40.22 "docker system df"
```

### Step 7: Test Immich API

```bash
ssh hermes-admin@192.168.40.22 "curl -s -o /dev/null -w '%{http_code}' http://localhost:2283/api/server/ping"
```
- `200` = Immich is responding
- Connection refused or timeout = Immich is down

---

## Fix Procedure

### Emergency Fix (When Disk Is 100% Full)

Execute these steps in order to reclaim space and restore service:

#### Step 1: Prune unused Docker images (biggest space saver)

```bash
ssh hermes-admin@192.168.40.22 "docker image prune -af"
```

This removes all unused images, typically reclaiming 2-5GB.

#### Step 2: Vacuum journal logs

```bash
ssh hermes-admin@192.168.40.22 "sudo journalctl --vacuum-size=100M"
```

#### Step 3: Clean Docker build cache

```bash
ssh hermes-admin@192.168.40.22 "docker builder prune -af"
```

#### Step 4: Verify space was reclaimed

```bash
ssh hermes-admin@192.168.40.22 "df -h /"
```

You need at least 1-2GB free for stable operation.

#### Step 5: Restart Immich stack

```bash
ssh hermes-admin@192.168.40.22 "cd /opt/immich && docker compose restart"
```

#### Step 6: Wait for health check and verify

```bash
# Wait 30 seconds for containers to initialize
sleep 30

# Check container health
ssh hermes-admin@192.168.40.22 "docker ps --filter name=immich --format 'table {{.Names}}\t{{.Status}}'"

# Verify API responds
ssh hermes-admin@192.168.40.22 "curl -s http://localhost:2283/api/server/ping"
# Expected: {"res":"pong"}
```

#### Step 7: Verify from browser

Navigate to `https://photos.hrmsmrflrii.xyz` and confirm the web interface loads.

---

## Prevention

### Monitoring (Implemented)

After this incident, the following monitoring was deployed:

| Component | Purpose | Location |
|-----------|---------|----------|
| **node_exporter** | Host metrics (disk, CPU, memory) | 192.168.40.22:9100 |
| **Prometheus scrape** | Collects metrics every 30s | 192.168.40.13 (prometheus.yml) |
| **Grafana dashboard** | Visual health overview | `immich-host-health` dashboard |
| **Disk >80% warning** | Discord alert after 10m | Grafana alerting |
| **Disk >90% critical** | Discord alert after 5m | Grafana alerting |
| **Disk filling prediction** | Alert if disk fills within 24h | Grafana alerting |

### Hardening (Implemented)

| Measure | Config | Effect |
|---------|--------|--------|
| **Docker log rotation** | `/etc/docker/daemon.json` - 10MB max, 3 files | Prevents log files from filling disk |
| **Journal size limit** | `/etc/systemd/journald.conf.d/size-limit.conf` - 100MB max | Caps systemd journal at 100MB |
| **node_exporter** | `/opt/node-exporter/docker-compose.yml` | Exports metrics for monitoring |

### Playbooks

| Playbook | Purpose |
|----------|---------|
| `ansible/playbooks/immich/harden-immich-disk.yml` | Deploy all hardening + node_exporter |
| `ansible/playbooks/monitoring/add-immich-node-exporter.yml` | Add Prometheus scrape + Grafana dashboard |
| `ansible/playbooks/monitoring/configure-grafana-alerts.yml` | Discord alerts for disk thresholds |

---

## Quick Reference Commands

| Command | Purpose |
|---------|---------|
| `ssh hermes-admin@192.168.40.22 "df -h /"` | Check disk usage |
| `ssh hermes-admin@192.168.40.22 "docker ps --filter name=immich"` | Check container status |
| `ssh hermes-admin@192.168.40.22 "docker logs immich-redis --tail 20"` | Check Redis logs |
| `ssh hermes-admin@192.168.40.22 "docker logs immich-server --tail 30"` | Check Immich logs |
| `ssh hermes-admin@192.168.40.22 "curl -s http://localhost:2283/api/server/ping"` | Test Immich API |
| `ssh hermes-admin@192.168.40.22 "docker image prune -af"` | Remove unused images |
| `ssh hermes-admin@192.168.40.22 "sudo journalctl --vacuum-size=100M"` | Trim journal logs |
| `ssh hermes-admin@192.168.40.22 "docker system df"` | Show Docker disk usage |
| `ssh hermes-admin@192.168.40.22 "cd /opt/immich && docker compose restart"` | Restart Immich stack |
| `curl http://192.168.40.22:9100/metrics \| grep node_filesystem` | Check node_exporter metrics |
| `curl http://192.168.40.13:9090/api/v1/targets` | Verify Prometheus scraping |

---

## Related Documentation

- [[42 - Immich Backup and Restore]] - Backup strategies and restore procedures
- [[07 - Deployed Services]] - Full service inventory
- [[23 - Glance Dashboard]] - Dashboard monitoring overview
- `dashboards/immich-host-health.json` - Grafana dashboard definition
- `docs/TROUBLESHOOTING.md` - General troubleshooting guide (includes this incident)
