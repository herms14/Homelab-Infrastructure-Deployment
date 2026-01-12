# Azure Sentinel Terraform Deployment

Terraform configuration for deploying Microsoft Sentinel SIEM for homelab security monitoring.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Microsoft Sentinel                              │
│                    (Detection Rules, Hunting, Workbooks)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                          Log Analytics Workspace                             │
│                         (law-homelab-sentinel)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                               Syslog Table                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │
                    ┌─────────────────┴─────────────────┐
                    │     Data Collection Rule (DCR)     │
                    │        dcr-homelab-syslog          │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   Data Collection Endpoint (DCE)   │
                    │        dce-homelab-syslog          │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   Azure Monitor Agent Extension    │
                    │    (on Arc-enabled server)         │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   Azure Arc-enabled Server         │
                    │     linux-syslog-server01          │
                    │       192.168.40.5                 │
                    └─────────────────┬─────────────────┘
                                      │
                                      ▲ rsyslog (UDP 514)
                                      │
                    ┌─────────────────┴─────────────────┐
                    │       Omada Controller             │
                    │        192.168.0.103               │
                    └───────────────────────────────────┘
```

## Resources Created

| Resource | Name | Purpose |
|----------|------|---------|
| Log Analytics Workspace | law-homelab-sentinel | Central log storage |
| Microsoft Sentinel | (on workspace) | SIEM platform |
| Data Collection Endpoint | dce-homelab-syslog | Ingestion endpoint |
| Data Collection Rule | dcr-homelab-syslog | Syslog collection config |
| DCR Association | dcra-syslog-arc-server | Links DCR to Arc server |
| Arc Machine Extension | AzureMonitorLinuxAgent | Collects logs |
| Analytics Rule | brute-force-syslog-detection | Detects brute force |
| Analytics Rule | new-network-device-detection | Detects new devices |

## Prerequisites

1. **Azure Arc-enabled server** already registered
2. **Resource Group** `rg-homelab-sentinel` exists
3. **Terraform** >= 1.5.0 installed
4. **Azure authentication** (managed identity or service principal)

## Deployment

### Using Managed Identity (from Azure VM)

```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply configuration
terraform apply
```

### Using Azure CLI Authentication

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "2212d587-1bad-4013-b605-b421b1f83c30"

# Deploy
terraform init
terraform apply
```

## Post-Deployment

### Verify Syslog Ingestion

Run this KQL query in Log Analytics:

```kql
Syslog
| where TimeGenerated > ago(1h)
| summarize count() by Facility, SeverityLevel
| order by count_ desc
```

### Check Arc Server Extension

```bash
# From the Arc-enabled server
azcmagent show

# Check AMA extension status
sudo systemctl status azuremonitoragent
```

## Estimated Costs

| Component | Est. Monthly Cost |
|-----------|-------------------|
| Log Analytics (5GB/month) | ~$13.80 |
| Sentinel (5GB/month) | ~$12.30 |
| **Total** | **~$26.10** |

## Files

| File | Purpose |
|------|---------|
| `providers.tf` | Azure provider configuration |
| `variables.tf` | Variable definitions |
| `main.tf` | Main resources |
| `outputs.tf` | Output values |
| `terraform.tfvars` | Variable values |

## Future Enhancements

- [ ] Azure Activity Log connector
- [ ] Entra ID (Azure AD) connector
- [ ] Domain Controller SecurityEvent logs
- [ ] OPNsense firewall logs
- [ ] Custom workbooks for network monitoring
- [ ] Automated playbooks for incident response
