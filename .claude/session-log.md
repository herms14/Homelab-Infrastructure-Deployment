# Session Log

> Recent session history. Keep only last 3-5 entries. Archive older entries to `session-log-archive.md` if needed.

---

## 2026-01-20

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
**Status**: Ready to Deploy
**Task**: Create Azure Managed Grafana with comprehensive monitoring dashboards

**Work Completed**:
1. **Terraform Configuration**:
   - Created `main.tf` with Grafana, Monitor Workspace, DCR, DCE, role assignments
   - Added alert rules: VPN tunnel down, high CPU, low memory, high disk IOPS
   - Created action group for critical alerts

2. **Dashboards Created** (4 total):
   - `compute-overview.json` - VM CPU, memory, disk I/O for SEA & East Asia
   - `network-overview.json` - Network traffic, bandwidth per VM
   - `storage-overview.json` - Disk performance, IOPS, managed disk inventory
   - `vwan-vpn-overview.json` - VPN tunnel status, traffic, VWAN resources

3. **Configuration**:
   - Created `terraform.tfvars` with subscription ID and VM resource IDs
   - Updated all dashboards to use correct resource names (vpngw-homelab-prod-sea)
   - Created `deploy.sh` deployment script

**Files Created**:
- `terraform/azure/azure-managed-grafana/main.tf` (with alerts)
- `terraform/azure/azure-managed-grafana/terraform.tfvars`
- `terraform/azure/azure-managed-grafana/dashboards/vwan-vpn-overview.json`
- `terraform/azure/azure-managed-grafana/deploy.sh`

**Next Steps**:
```bash
# Copy to ubuntu-deploy-vm
scp -r terraform/azure/azure-managed-grafana/ hermes-admin@ubuntu-deploy:/opt/terraform/

# SSH and deploy
ssh ubuntu-deploy
cd /opt/terraform/azure-managed-grafana
chmod +x deploy.sh && ./deploy.sh
```

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
