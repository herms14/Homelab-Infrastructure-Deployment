# Session Log

> Recent session history. Keep only last 3-5 entries. Archive older entries to `session-log-archive.md` if needed.

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
