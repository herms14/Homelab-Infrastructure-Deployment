# Session Log

> Recent session history. Keep only last 3-5 entries. Archive older entries to `session-log-archive.md` if needed.

---

## 2026-02-16 (cont. 8)

### Download Notification Spam Fix + Jellyseerr → Seerr Upgrade
**Status**: ✅ Complete
**Task**: Fix Discord download notification spam, upgrade Jellyseerr to Seerr v3.0.1

**Download Notification Fix**:
- **Root Cause**: Sentinel bot (`scheduler.py`) sent notifications at 50%, 80%, 100% milestones = 3 msgs/download
- **Fix**: Changed `milestones = [50, 80, 100]` → `milestones = [100]` in sentinel-bot scheduler
- Also cleaned up mnemosyne-bot.py and download-monitor.py (removed start + progress notifications)
- Deployed updated scheduler.py to sentinel-bot on 192.168.40.13, restarted container

**Jellyseerr → Seerr v3.0.1 Upgrade**:
- Image changed: `fallenbagel/jellyseerr:latest` (v2.7.3) → `ghcr.io/seerr-team/seerr:latest` (v3.0.1)
- Fixed config permissions: `chown -R 1000:1000` (Seerr runs as UID 1000)
- Edited docker-compose.yml via Alpine container (no sudo on media host)
- Added `init: true` to service definition
- Database migration ran automatically on startup

**Documentation Updated**:
- `08 - Arr Media Stack.md` — Updated Jellyseerr section with Seerr v3.0.1 details
- `24 - Discord Bots.md` — Expanded download notification spam fix notes
- `Hermes Homelab Technical Manual.md` — Added Seerr upgrade procedure + download notification config section
- `Book - The Complete Homelab Guide.md` — Added Seerr migration narrative + notification spam fix narrative

---

## 2026-02-16 (cont. 7)

### Grafana Alerting Fix + Documentation
**Status**: ✅ Complete
**Task**: Fix false-positive Grafana alerts for Immich disk, document alerting configuration

**Problem**: Three Immich disk alerts firing on Discord with `DatasourceError` — actual disk was at 11% (healthy)
**Root Cause**: Alert rules missing Reduce step in pipeline. Grafana requires Query → Reduce → Threshold (3-step). Threshold was referencing raw time series (A) instead of reduced value (B).
**Fix**: Deleted 3 broken rules via Grafana API, recreated with proper 3-step pipeline. Changed `execErrState` from `"Error"` to `"OK"`.

**Documentation Updated**:
- `17 - Monitoring Stack.md` — Expanded Grafana Alerts section with pipeline architecture, contact points, notification policies, alert rules table, API management commands, troubleshooting table
- `Hermes Homelab Technical Manual.md` — Added "Grafana Alerting Configuration" section after Immich Glance Integration with rule architecture, configuration values table, deploy/manage commands
- `Book - The Complete Homelab Guide.md` — Added "The Alerting Pipeline" narrative section to Chapter 35 explaining 3-step pipeline, execErrState, predict_linear, notification routing

**Files Modified**:
- `ansible/playbooks/monitoring/configure-grafana-alerts.yml` — Fixed alert rule data pipelines

---

## 2026-02-16 (cont. 6)

### Strava Stats, Dashboard Fixes, and GitHub Sync
**Status**: ✅ Complete
**Task**: Add Strava Stats page, fix Power Control/Gaming PC widgets, Steam Last Played, sync to GitHub

**Changes**:
- Added `/api/stats` + `/page/stats` endpoints to health-tracker-api.py (Strava athlete stats: Last 4 Weeks, Best Efforts, YTD, All-Time)
- Added Strava Stats iframe to Health page (height: 500)
- Fixed Power Control widget: changed from `http://` to `https://power.hrmsmrflrii.xyz/` (mixed content fix), height: 150
- Added "Last Played" section to Steam widget on Home page (CSS `:first-child` trick)
- Fixed Gaming PC widget timeout: reduced `gaming-pc-stats` API connection timeout from 5s to 2s, rebuilt container
- Synced glance.yml and health-tracker-api.py to GitHub `herms14/glance-dashboard`
- Updated documentation: Obsidian note 55, Technical Manual v5.7, Book Chapter 18

---

## 2026-02-16 (cont. 5)

### Health Tracker API + Glance Health Page
**Status**: ✅ Complete
**Task**: Deploy Strava-integrated health tracker with weight logging, exercise calendar, and Glance dashboard page

**Components Deployed**:
- Health Tracker API (Flask): 192.168.40.13:5062
- Glance Health tab with 3 custom-api widgets + 3 iframe pages

**Files Created**:
- `ansible/playbooks/glance/files/health-tracker-api.py` — Flask API (Strava OAuth2, activity caching, weight logging, HTML pages)
- `ansible/playbooks/glance/files/health-page-config.yml` — Glance page config (avoids Jinja2/Go template conflicts)
- `ansible/playbooks/glance/deploy-health-tracker-api.yml` — Ansible playbook to deploy API container
- `ansible/playbooks/glance/update-glance-health-tab.yml` — Ansible playbook to add Health page to Glance

**Key Endpoints**:
- `/api/health` — Health check
- `/api/strava/status` — Strava connection status
- `/api/activities/weekly` — Weekly exercise summary
- `/api/weight` — Weight data (GET/POST/DELETE)
- `/page/calendar` — 60-day exercise heatmap (iframe)
- `/page/weight` — Weight chart + log form (iframe)
- `/page/activities` — Recent activities list (iframe)
- `/page/setup` — One-time Strava OAuth setup

**User Action Required**: Visit http://192.168.40.13:5062/page/setup to connect Strava

**Lesson Learned**: Glance Go template syntax (`{{ }}`) conflicts with Ansible Jinja2. Use file-based config merge (copy YAML snippet + Python merge script) instead of set_fact/combine approach for pages containing Go templates.

---

## 2026-02-16 (cont. 4)

### Comprehensive Service Onboarding Guide
**Status**: ✅ Complete
**Task**: Create/update comprehensive documentation for onboarding a new service manually, covering all 13 phases

**Documentation Updated (3 locations)**:
1. `obsidian-homelab/15 - New Service Onboarding Guide.md` — Complete rewrite with 13 phases: LXC vs VM decision framework, Docker installation (with full command explanations), NAS NFS mounts (with fstab option breakdowns), container deployment, Traefik routing, OPNsense DNS (UI + API methods), SSL (automatic), Authentik SSO (ForwardAuth + Native OIDC), Service Version API integration (SERVICE_REGISTRY format), Discord bot registration (Sentinel + Argus), Watchtower deployment, documentation checklist, and a worked example (Linkding deployment end-to-end)
2. Technical Manual v7.4 — Replaced Service Onboarding section with comprehensive quick-reference covering all integration points
3. Book Chapter 9 — Added "The Service Onboarding Pipeline" narrative section explaining the evolution and rationale

---

## 2026-02-16 (cont. 3)

### Pi-hole v6 Web UI Fix
**Status**: ✅ Complete
**Task**: Diagnose and fix Pi-hole web UI being unreachable at 192.168.90.53

**Root Cause**: Pi-hole v6 FTL drops privileges to `pihole` user after binding port 53. Web server starts after privilege drop and can't bind ports 80/443. The `o` (optional) flag in port config (`80o,443os`) causes silent failure — no errors logged.

**Fix Applied**: `setcap CAP_NET_BIND_SERVICE+eip /usr/bin/pihole-FTL` + restart FTL. Must be re-applied after Pi-hole updates.

**Documentation Updated**:
- `obsidian-homelab/12 - Troubleshooting.md` - Full diagnosis/fix entry
- `docs/TROUBLESHOOTING.md` - Service-Specific Issues section
- Technical Manual - DNS Issues section
- Book Chapter 21 - DNS / Pi-hole Issues narrative

---

## 2026-02-16 (cont. 2)

### Bulk Service Updates + Manual Service Updates Guide
**Status**: ✅ Complete
**Task**: Update 14 Docker services showing available updates, then create a manual documenting how to update each service

**Services Updated (14 total)**:
- **192.168.40.11**: Radarr, Sonarr, Lidarr, Prowlarr, Bazarr, Overseerr, Autobrr, Deluge, SABnzbd, MeTube
- **192.168.40.13**: Grafana, Speedtest Tracker, Tracearr
- **192.168.40.25**: Home Assistant
- **192.168.40.26**: Ghostfolio (+ PostgreSQL, Redis)

**Documentation Created**:
- `obsidian-homelab/47 - Manual Service Updates Guide.md` - Comprehensive per-host update procedures with pre/post checklists
- Technical Manual v7.3 - Added "Manual Service Update Procedures" section with all host commands
- Book Chapter 16 - Added "Manual Updates: When Automation Isn't Enough" narrative section

---

## 2026-02-16 (cont.)

### IP/URL Mapping Audit and Corrections
**Status**: ✅ Complete
**Task**: Audit all IP/URL references across documentation and code for consistency after 192.168.40.10 decommission

**Issues Found and Fixed**:
- `.claude/agents/glance-grafana-dashboard-fixer.md` - Updated from 192.168.40.10/docker-utilities to correct hosts (192.168.40.12 for Glance, 192.168.40.13 for Grafana)
- `.claude/context.md` - Fixed Media Stats API and Reddit Manager location (moved from .12 to .13), added missing hosts (immich, gitlab), fixed types (LXC vs VM)
- `obsidian-homelab/07 - Deployed Services.md` - Fixed overview table (Media Stats API/Reddit Manager on .13 not .12)
- `obsidian-homelab/10 - IP Address Map.md` - Added missing Ghostfolio LXC entry
- `obsidian-homelab/23 - Glance Dashboard.md` - Fixed Omada Exporter IP (192.168.20.30 → 192.168.40.13)
- `ansible/playbooks/container-updates/argus-bot.py` - Fixed all container→host mappings (30+ references)
- `ansible/playbooks/sysadmin-bot/sysadmin-bot.py` - Fixed DOCKER_HOSTS and health check URLs
- `ansible/roles/traefik/deploy-traefik-ssl.yml` - Fixed utilities_server_ip and otel_collector_endpoint
- `ansible/roles/n8n/deploy-n8n.yml` - Fixed comments
- 30+ additional ansible playbooks - batch-fixed all 192.168.40.10 → 192.168.40.13 references

---

## 2026-02-16

### Immich Monitoring, Grafana Alerts, and Disk Hardening
**Status**: ✅ Complete
**Task**: Deploy node_exporter, Grafana dashboard, Discord alerting, and preventive hardening for Immich host after disk-full incident

**Files Created**:

| File | Purpose |
|------|---------|
| `ansible/playbooks/immich/harden-immich-disk.yml` | Docker log rotation, journal limits, node_exporter, cleanup |
| `ansible/playbooks/monitoring/add-immich-node-exporter.yml` | Prometheus scrape target + Grafana dashboard deployment |
| `ansible/playbooks/monitoring/configure-grafana-alerts.yml` | Discord webhook + 3 alert rules (80%, 90%, 24h predict) |
| `dashboards/immich-host-health.json` | Grafana dashboard: disk, memory, CPU, network, uptime |
| `obsidian-homelab/46 - Immich Disk Full Troubleshooting.md` | Obsidian troubleshooting guide with cascade diagram |
| `docs/TROUBLESHOOTING.md` | Added disk-full incident section |

**Execution Order** (for deployment):
1. `harden-immich-disk.yml` on 192.168.40.22 (node_exporter + hardening)
2. `add-immich-node-exporter.yml` on 192.168.40.13 (Prometheus + dashboard)
3. `configure-grafana-alerts.yml` on 192.168.40.13 (requires Discord webhook URL)

**Requires User Action**: Create Discord `#infrastructure-alerts` channel and provide webhook URL for Step 3.

---

## 2026-01-29

### Service Version Manager API + Glance Services Page Overhaul
**Status**: ✅ Complete
**Task**: Replace simple monitor widgets on Glance Services page with rich version-aware widgets backed by a new API

**Components Created**:

| Component | Status | Location |
|-----------|--------|----------|
| Service Version Manager API | ✅ Created | `ansible/playbooks/glance/files/service-version-api.py` |
| Ansible Deployment Playbook | ✅ Created | `ansible/playbooks/glance/deploy-service-version-api.yml` |
| Glance Services Page (gitops) | ✅ Updated | `gitops-repos/glance-homelab/config/glance.yml` |
| Glance Services Page (ansible) | ✅ Updated | `ansible/playbooks/glance/files/glance.yml` |

**Service Version Manager API** (port 5070 on docker-vm-core-utilities01):
- Tracks 53 services across 9 Docker hosts
- 6 categories: Infrastructure, Auth, Core Apps, Media, Monitoring, APIs & Bots
- Health checks via HTTP (every 60s) and Docker inspect
- Version detection via Docker image digest comparison against Docker Hub/GHCR
- One-click update via `docker compose pull + up -d` (POST with API key)
- Safety: Traefik, Authentik, Glance blacklisted from one-click updates
- Custom-built APIs (local registry) show health only, no version comparison

**New Services Added to Dashboard** (previously missing):
- Ghostfolio, Overseerr, Autobrr, Reactive Resume, BentoPDF, Open Notebook
- Lagident, Immich ML, Authentik Worker, cAdvisor
- All 9 custom APIs & bots (Sentinel Bot, Media Stats, NAS Backup, etc.)

**Deployment**: `ansible-playbook -i inventory.ini glance/deploy-service-version-api.yml`

---

## 2026-01-27

### Ghostfolio Finance Tracker Deployment
**Status**: ✅ Complete
**Task**: Deploy self-hosted finance tracker with stocks, crypto, savings, and insurance tracking

**Components Deployed**:

| Component | Status | Location |
|-----------|--------|----------|
| Ghostfolio LXC (ID 208) | ✅ Deployed | node02, 192.168.40.26 |
| Ghostfolio Stack | ✅ Running | PostgreSQL, Redis, Ghostfolio |
| Traefik Route | ✅ Configured | ghostfolio.hrmsmrflrii.xyz |
| DNS Entry | ✅ Added | Pi-hole pihole.toml hosts array |
| Finance Forecast API | ✅ Running | docker-glance:5065 (systemd) |
| Glance Config Update | ✅ Deployed | Finance page live |

**Ghostfolio**:
- Self-hosted wealth management software
- URL: https://ghostfolio.hrmsmrflrii.xyz
- Container ID: 208 on node02
- Features: Stock tracking, crypto tracking, cash accounts, performance analytics

**Finance Forecast API**:
- Custom API for savings/investment forecasting and insurance tracking
- Port: 5065 on docker-glance (192.168.40.12)
- Endpoints:
  - `/api/savings-forecast` - Compound growth projections
  - `/api/investment-forecast` - Portfolio projections
  - `/api/insurance` - Policy tracking with renewal alerts
  - `/api/net-worth-summary` - Asset breakdown

**Glance Finance Page Updates**:
- Ghostfolio iframe embed
- Savings Forecast widget (current, 5yr, 10yr projections)
- Insurance Policies widget (with renewal status)
- Investment Forecast widget (conservative/expected/optimistic)
- Retained stock/crypto market tickers

**Files Created**:
- `ansible/playbooks/ghostfolio/deploy-ghostfolio.yml`
- `ansible/playbooks/ghostfolio/docker-compose.yml`
- `ansible/playbooks/ghostfolio/traefik-ghostfolio.yml`
- `ansible/playbooks/glance/deploy-finance-forecast-api.yml`
- `ansible/playbooks/glance/files/finance-forecast-api.py`
- `ansible/playbooks/glance/update-finance-page.yml`
- `gitops-repos/glance-homelab/config/glance.yml` (updated Finance page)

**Pending Due to Network Outage**:
1. Deploy updated glance.yml to docker-glance container
2. End-to-end testing of all widgets
3. Documentation updates (Obsidian, Technical Manual, Book)

**To Complete When Network Returns**:
```bash
# Option 1: Manual deployment
scp gitops-repos/glance-homelab/config/glance.yml hermes-admin@192.168.40.12:/opt/glance/config/
ssh hermes-admin@192.168.40.12 "docker restart glance"

# Option 2: Ansible playbook
ansible-playbook -i "192.168.40.12," ansible/playbooks/glance/update-finance-page.yml
```

**Post-Deployment Setup**:
1. Access https://ghostfolio.hrmsmrflrii.xyz
2. Create admin account (first user gets admin)
3. Add stock/crypto holdings manually or import
4. Edit `/opt/finance-forecast-api/config/savings.json` with actual savings data
5. Edit `/opt/finance-forecast-api/config/insurance.json` with policy details

---

### Arr Stack Cleanup
**Status**: Completed ✅
**Task**: Fix missing media showing on Glance but not in Jellyfin

**Root Cause**: Glance shows Radarr/Sonarr download queues, not Jellyfin library. Items fail to import due to:
- Missing Usenet articles (DMCA takedowns)
- NFS I/O errors in Deluge
- Stuck files in Completed folder

**Fixes Applied**:
1. Cleared 10 failed SABnzbd downloads
2. Removed 2 failed Radarr items (Mission Impossible: Final Reckoning)
3. Moved 9 stuck files to cleanup folder (freed ~184GB)
4. Restarted Deluge to clear NFS errors

**Recommendation**: Add backup Usenet provider for missing articles on older releases.

---

## 2026-01-22

### Power Control API Bug Fixes
**Status**: Completed ✅
**Task**: Fix multiple bugs in Glance dashboard power control feature

**Issues Fixed**:

| Bug | Symptom | Root Cause | Fix |
|-----|---------|------------|-----|
| Shutdown command | Nodes received command but stayed online | `shutdown -h now` unreliable on Proxmox VE | Changed to `systemctl poweroff` with nohup |
| Mixed Content | Browser blocked iframe | HTTPS Glance loading HTTP iframe | Added Traefik route `power.hrmsmrflrii.xyz` |
| Missing confirmTitle ID | JS error on modal open | HTML element missing `id` attribute | Added `id="confirmTitle"` |
| setLoading null error | JS error on button click | Missing status elements | Simplified function to only handle buttons |
| Empty nodes array | API returned 400 Bad Request | `cancelConfirm()` cleared array before API call | Reordered to save nodes first |

**Shutdown Command Fix**:
```python
# BEFORE (unreliable on Proxmox VE):
client.exec_command("shutdown -h now 'Shutdown initiated from Glance Dashboard'")

# AFTER (working):
client.exec_command("nohup sh -c 'sleep 2 && systemctl poweroff' > /dev/null 2>&1 &")
```

**Traefik HTTPS Route** (`/opt/traefik/config/dynamic/power-control.yml`):
```yaml
http:
  routers:
    power-control:
      rule: "Host(`power.hrmsmrflrii.xyz`)"
      entryPoints:
        - websecure
      service: power-control
      tls:
        certResolver: letsencrypt
  services:
    power-control:
      loadBalancer:
        servers:
          - url: "http://192.168.40.13:5057"
```

**JavaScript Bug Fixes**:
1. Added `id="confirmTitle"` to confirm dialog div
2. Simplified `setLoading()` function with null check
3. Fixed `executeShutdown()` to save nodes array BEFORE calling `cancelConfirm()`

**Files Modified**:
- `ansible/playbooks/glance/files/power-control-api.py`
- `gitops-repos/glance-homelab/apis/power-control-api.py`
- `/opt/traefik/config/dynamic/power-control.yml` (created)
- `/opt/glance/config/glance.yml` (updated to use HTTPS URL)

**Documentation Updated**:
- `obsidian-homelab/23 - Glance Dashboard.md` - Added Power Control API section
- `Hermes Homelab Technical Manual.md` - Added Power Control API section (v7.1)
- `Book - The Complete Homelab Guide.md` - Added Power Control API section in Chapter 29

**Testing**: Successfully verified shutdown and Wake-on-LAN functionality from dashboard.

**Note**: node02 WoL required BIOS setting to be enabled first.

---

## 2026-01-21

### Sentinel Bot Container Update Fix
**Status**: Completed ✅
**Task**: Fix Discord bot container updates not applying new images

**Problem**: `/updateall` and `/update <container>` commands reported success but containers still ran old images. The `/check` command correctly detected updates available (e.g., bazarr), but after running `/updateall`, containers weren't actually updated.

**Root Cause**: The bot used `docker restart` after pulling new images. However, `docker restart` does NOT apply new images - it only restarts the container with its existing image. Docker containers must be **recreated** to use a newly pulled image.

**Fix Applied**:
1. Added `COMPOSE_DIRS` mapping in `config.py` - maps each container to its docker-compose directory
2. Added `docker_compose_pull_service()` and `docker_compose_recreate()` methods to `ssh_manager.py`
3. Updated `updates.py` to use `docker compose up -d --force-recreate` instead of `docker restart`

**Files Modified**:
- `ansible/playbooks/sentinel-bot/config.py` - Added COMPOSE_DIRS mapping
- `ansible/playbooks/sentinel-bot/core/ssh_manager.py` - Added compose methods
- `ansible/playbooks/sentinel-bot/cogs/updates.py` - Fixed update logic

**Commands Fixed**:
- `/update <container>` - Now uses compose pull + recreate
- `/updateall` - Now recreates containers instead of restarting
- Reaction-based updates - Also fixed

**Deployment**:
```bash
scp config.py updates.py ssh_manager.py hermes-admin@192.168.40.13:/opt/sentinel-bot/
ssh hermes-admin@192.168.40.13 "cd /opt/sentinel-bot && docker compose build --no-cache && docker compose up -d"
```

**Documentation Updated**:
- `obsidian-homelab/24 - Discord Bots.md` - Updated workflow, added troubleshooting
- `.claude/session-log.md`

---

### NAS Backup Status API Duration Fix
**Status**: Completed ✅
**Task**: Fix incorrect backup duration calculation on Glance Backup page

**Problem**: Dashboard showed "7h 21m" duration for daily backups when actual job took ~38 minutes. The API calculated duration from first to last backup timestamp of the entire day, not the actual job span.

**Root Cause**: When multiple backup jobs run on the same day (e.g., morning at 08:20 and afternoon at 15:03), the API incorrectly treated them as one job spanning 7+ hours.

**Fix**: Updated `get_backup_job_status()` in `/opt/nas-backup-status-api/app.py` to:
1. Sort backup timestamps descending (most recent first)
2. Group backups within 1 hour of each other as a single job
3. Calculate duration only for the most recent contiguous job

**Results**:
| Metric | Before | After |
|--------|--------|-------|
| Daily Backups Duration | 7h 21m | 38m 0s |
| Main Backups Duration | 1h 48m | 1h 48m (unchanged, was correct) |

**Files Modified**:
- `/opt/nas-backup-status-api/app.py` on docker-vm-core-utilities01
- Container rebuilt via `docker compose build --no-cache && docker compose up -d`

**Documentation Updated**:
- `.claude/session-log.md`
- `obsidian-homelab/23 - PBS Monitoring.md`
- Technical Manual (v6.9 → v7.0)
- Book Chapter 26

---

## 2026-01-20

### Azure Deployment Documentation
**Status**: Completed ✅
**Task**: Create comprehensive Azure deployment documentation for Claude agents

**Files Created/Updated**:
1. **AZURE-CLAUDE.md** (Obsidian)
   - Claude agent context file for Azure deployments
   - All three subscriptions: FireGiants-Prod, FireGiants-Dev, Nokron-Prod
   - SSH access details, key locations
   - Deployment workflow architecture
   - Terraform provider templates
   - **Comprehensive documentation requirements section**
   - Troubleshooting guide

2. **53 - Azure Deployment Tutorial.md** (Obsidian)
   - Step-by-step deployment guide
   - Local-to-Azure workflow
   - Best practices and naming conventions
   - Common operations (update, destroy, import)
   - Quick reference commands

3. **claude.md** (Project root)
   - Added all Azure subscriptions
   - Added Azure deployment workflow section
   - Added mandatory documentation requirements
   - Documentation checklist for implementations

**Documentation Synced To**:
- Technical Manual: Added "Azure Deployment Workflow" section
- Book Chapter 24: Expanded Terraform Deployment Workflow with architecture diagram

**Azure Subscriptions Documented**:
- FireGiants-Prod: `2212d587-1bad-4013-b605-b421b1f83c30` (Primary)
- FireGiants-Dev: `79e34814-e81a-465c-abf3-11103880db90`
- Nokron-Prod: `9dde5c52-88be-4608-9bee-c52d1909693f`

**Documentation Requirements Added**:
- All implementations must be documented in 3 locations
- Technical Manual: Tutorial style (steps, tables, code)
- Book: Narrative style (full paragraphs, context, lessons)
- Obsidian: Modular notes with diagrams and configs

---

### Glance Dashboard UI Redesign & Documentation Update
**Status**: Completed
**Task**: Major UI redesign with 25 new themes and comprehensive documentation updates

**Work Completed**:
1. **Glance UI Redesign**:
   - Added page icons/emojis for all 11 pages: 🏠🛠💻💾📦🌐🎬📰💰🤖🏀
   - Created new Services page consolidating all health monitors
   - Split Web page into News and Finance pages
   - Standardized widget styling (padding: 12px, border-radius: 8px)
   - Optimized iframe heights (Proxmox: 2400px, Container: 1800px)
   - Added 25 new themes (total now 35)
   - Fixed backup schedule text (Daily: 19:00, Main: 02:00 AM)

2. **Git Operations**:
   - Committed and pushed to `herms14/glance-dashboard` (commit 3680bbc)
   - Synced config to `ansible/playbooks/glance/files/glance.yml`

3. **Documentation Updates**:
   - CHANGELOG.md - Added UI redesign entry
   - `obsidian-homelab/23 - Glance Dashboard.md` - Updated page structure, themes, iframe heights
   - Technical Manual v6.9 - Updated Glance section with new page structure
   - Book Chapter 29 - Updated architecture diagram and page table

**Files Modified**:
- `gitops-repos/glance-homelab/config/glance.yml`
- `ansible/playbooks/glance/files/glance.yml`
- `ansible/playbooks/glance/files/backup-page.yml`
- `CHANGELOG.md`
- `obsidian-homelab/23 - Glance Dashboard.md`
- Obsidian Technical Manual (v6.8 → v6.9)
- Obsidian Book (Chapter 29)

---

### Azure Managed Grafana Deployment
**Status**: Completed ✅
**Task**: Create Azure Managed Grafana with comprehensive monitoring dashboards

**Grafana URL**: https://grafana-homelab-prod-cmd8aqhtemcddgdz.sing.grafana.azure.com

**Work Completed**:
1. **Terraform Deployment**: Grafana, Monitor Workspace, DCR, DCE, role assignments, alerts

2. **Dashboards Created** (4 total in Homelab Monitoring folder):
   - `compute-overview.json` - VM CPU, memory for SEA & East Asia
   - `network-overview.json` - Network traffic, bandwidth per VM
   - `storage-overview.json` - Disk performance, IOPS
   - `vwan-vpn-overview.json` - VPN tunnel status, traffic

3. **VPN Dashboard Fix** (Critical):
   - **Issue**: Dashboard showed "No data" for VPN metrics
   - **Root cause**: VPN Gateway metrics don't support 1-minute intervals
   - **Fix**: Changed `"timeGrain": "auto"` to `"timeGrain": "PT5M"`
   - Updated resource to correct VPN Gateway: `erd-shared-corp-vnetgw-sea` in `erd-connectivity-sea-rg`

4. **Documentation Updated**:
   - Obsidian `52 - Azure Managed Grafana.md` - Full documentation with query examples
   - Technical Manual - VPN Gateway query format and time grain warning
   - Book Chapter 34 - Added lesson #8 about VPN Gateway time grain

**Key Lesson**: VPN Gateway metrics require PT5M or higher time grain (PT5M, PT15M, PT30M, PT1H, PT6H, PT12H, P1D)

**Files Modified**:
- `terraform/azure/azure-managed-grafana/dashboards/vwan-vpn-overview.json`
- `obsidian-homelab/52 - Azure Managed Grafana.md` (Obsidian)
- Technical Manual, Book (Obsidian)

---

## 2026-01-16

### Gaming PC & Steam Integration for Glance
**Status**: Completed (Pending User Setup)
**Task**: Add gaming PC metrics and Steam profile to Glance Home dashboard

**Features Added**:
1. **Gaming PC Widget** (192.168.10.10):
   - CPU temperature and load
   - GPU temperature, load, VRAM usage
   - Memory usage (used/available)
   - Fan speeds
   - Storage temperatures and usage
   - Requires LibreHardwareMonitor HTTP server

2. **Steam Profile Widget**:
   - Top 3 recently played games with thumbnails
   - Playtime (total and last 2 weeks)
   - Last played timestamps
   - Total games owned count
   - Wishlist items on sale notifications

**Files Created**:
- `ansible/playbooks/glance/deploy-steam-stats-api.yml` - Steam API service
- `ansible/playbooks/glance/deploy-gaming-steam-widgets.yml` - Glance config update

**User Setup Required**:
1. Install LibreHardwareMonitor on gaming PC, enable HTTP server (port 8085)
2. Get Steam API key from https://steamcommunity.com/dev/apikey
3. Find Steam64 ID from https://steamid.io/
4. Run playbooks with credentials

---

### Backup Jobs Failing - VM Locked Fix
**Status**: Completed
**Issue**: Backup jobs reporting "job errors" - VMs 121 and 109 had orphaned backup locks
**Root Cause**: Node reboots on Jan 13 during scheduled backup jobs left VMs locked
**Fix**:
- `qm unlock 121` on node02 (gitlab-vm01)
- `qm unlock 109` on node03 (linux-syslog-server01)
- Verified backups work (VM 121 completed successfully)
**Documentation Updated**:
- `docs/TROUBLESHOOTING.md` (main repo)
- `12 - Troubleshooting.md` (Obsidian)
- `Hermes Homelab Technical Manual.md` v6.3
- `Book - The Complete Homelab Guide.md`

### PBS-to-NAS Sync Documentation
**Status**: Completed
**Task**: Document how PBS backups are synced to Synology NAS for offsite protection
**Key Details**:
- Script: `/usr/local/bin/pbs-backup-to-nas.sh`
- Schedule: Daily at 2:00 AM via cron
- Syncs `/backup` (main) and `/backup-ssd` (daily) to NAS at 192.168.20.31
- Logs: `/var/log/pbs-nas-sync.log`
**Documentation Updated**:
- `docs/TROUBLESHOOTING.md` (main repo)
- `12 - Troubleshooting.md` (Obsidian)
- `Hermes Homelab Technical Manual.md` v6.3
- `Book - The Complete Homelab Guide.md` (Chapter 27)

### Glance Backup Page Schedule Fix
**Status**: Completed
**Issue**: Backup schedule on Glance backup page showed incorrect times
**Fix**: Updated schedule from "Daily 1:00 AM, Weekly" to correct times
**Correct Schedule**:
- Daily backups: 21:00 (9 PM)
- Main backups: Fridays at midnight
- NAS Direct: Sundays at 01:00
- PBS-to-NAS Sync: 02:00 AM daily
**Changes Made**:
- Updated live Glance config on docker-lxc-glance (192.168.40.12)
- Committed to GitHub: https://github.com/herms14/glance-dashboard (commit f6df506)
- Updated `ansible/playbooks/glance/files/backup-page.yml`
- Updated `gitops-repos/glance-homelab/config/glance.yml`
**Documentation Updated**:
- `docs/GLANCE.md`
- `23 - Glance Dashboard.md` (Obsidian)
- `Hermes Homelab Technical Manual.md` (2 sections)
- `Book - The Complete Homelab Guide.md`

---

## 2026-01-15

### NAS Backup API - Windows VM Names Fix
**Status**: Completed
**Issue**: Windows VMs (300-311) showing as "k8s-ctrl-01" etc. in backup report
**Fix**: Updated `VM_NAMES` in nas-backup-api-app.py and deployed
**Files**: `ansible/playbooks/glance/files/nas-backup-api-app.py`, `gitops-repos/glance-homelab/apis/nas-backup-status-api.py`

### Directory Cleanup & Token Optimization
**Status**: In Progress
**Work**: Removing temp files, consolidating .claude/ files, optimizing claude.md

---

## 2026-01-14

### Azure Sentinel Homelab Integration
**Status**: Partially Complete (VPN-dependent items blocked)
**Completed**:
- Windows DCR Terraform deployed
- Syslog forwarding configured (all Proxmox nodes + Docker hosts)
- VNet NSG flow logs and analytics rules created
**Blocked**: AMA install on Azure DCs (VPN down), OPNsense logging (manual config needed)

### Hybrid AD Extension Playbooks
**Status**: Completed (Playbooks Created)
**Files Created**:
- `ansible/playbooks/azure-ad/promote-onprem-dcs.yml`
- `ansible/playbooks/azure-ad/transfer-fsmo-roles.yml`
- `ansible/playbooks/azure-ad/configure-dns.yml`
- `ansible/playbooks/azure-ad/domain-join-vms.yml`
- `terraform/azure/sentinel/windows-dcr.tf`

---

## 2026-01-13

### Azure Hybrid Lab Full Deployment
**Status**: Completed
**Result**: 12 Windows Server 2022 VMs deployed on node03
**Template**: 9022 (Windows Server 2022 with automated OOBE)
**VMs**: DC01, DC02, FS01, FS02, SQL01, AADCON01, AADPP01, AADPP02, CLIENT01, CLIENT02, IIS01, IIS02
