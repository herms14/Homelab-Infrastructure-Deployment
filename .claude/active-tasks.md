# Active Tasks

> Check before starting work. Update when starting/completing tasks.

---

## Currently In Progress

### Azure Sentinel Homelab Integration
**Status**: 🔄 Partially Complete
**Started**: 2026-01-15

**Completed**:
- [x] Deploy Windows DCR Terraform
- [x] Configure Proxmox syslog forwarding (3 nodes)
- [x] Configure Docker hosts syslog (4 hosts)
- [x] Enable VNet NSG flow logs
- [x] Add Sentinel analytics rules
- [x] Configure DNS forwarders on DC01/DC02

**Blocked**:
- [ ] Install AMA on Azure DCs - **VPN down**
- [ ] Configure OPNsense logging - **Manual web UI config required**

**Files Created**:
- `terraform/azure/sentinel-learning/vnet-diagnostics.tf`
- `terraform/azure/sentinel-learning/analytics-rules-syslog.tf`
- `ansible/playbooks/azure-sentinel/configure-syslog-forwarding.yml`

---

## Recently Completed

### Azure Managed Grafana Deployment (2026-01-20)
Deployed Azure Managed Grafana with multi-region VM monitoring dashboards.

**Grafana URL**: https://grafana-homelab-prod-cmd8aqhtemcddgdz.sing.grafana.azure.com

**Dashboards Created** (in Homelab Monitoring folder):
- Azure VMs - Compute Overview (CPU, Memory)
- Azure Multi-Region Storage Overview (Disk I/O, IOPS)
- Azure Multi-Region Network Overview (Network In/Out)
- Azure VWAN & VPN Overview (VPN tunnel status, bandwidth)

**VMs Monitored**:
- SEA: APP-SEA01, FS-SEA01, FS-SEA02, AZDC01, AZDC02
- East Asia: SRV-EA01, SRV-EA02, APP-EA01, AZRODC01, AZRODC02

**Files Created**:
- `terraform/azure/azure-managed-grafana/main.tf`
- `terraform/azure/azure-managed-grafana/terraform.tfvars`
- `terraform/azure/azure-managed-grafana/dashboards/*.json` (4 dashboards)

---

### NAS Backup API - Windows VM Names Fix (2026-01-15)
Updated `VM_NAMES` in backup APIs - Windows VMs now display correct names.

### Azure Hybrid Lab Deployment (2026-01-14)
12 Windows Server 2022 VMs deployed on node03 (VMIDs 300-311).

### Directory Cleanup (2026-01-15)
Removed 1000+ temp files, optimized claude.md (803→112 lines), consolidated .claude/ files.

---

## Hybrid Lab VMs Reference

| VM | VMID | IP | Role |
|----|------|-----|------|
| DC01 | 300 | 192.168.80.2 | Primary DC |
| DC02 | 301 | 192.168.80.3 | Secondary DC |
| FS01 | 302 | 192.168.80.4 | File Server |
| FS02 | 303 | 192.168.80.5 | File Server |
| SQL01 | 304 | 192.168.80.6 | SQL Server |
| AADCON01 | 305 | 192.168.80.7 | Entra ID Connect |
| AADPP01 | 306 | 192.168.80.8 | Password Protection |
| AADPP02 | 307 | 192.168.80.9 | Password Protection |
| CLIENT01 | 308 | 192.168.80.12 | Workstation |
| CLIENT02 | 309 | 192.168.80.13 | Workstation |
| IIS01 | 310 | 192.168.80.10 | Web Server |
| IIS02 | 311 | 192.168.80.11 | Web Server |
