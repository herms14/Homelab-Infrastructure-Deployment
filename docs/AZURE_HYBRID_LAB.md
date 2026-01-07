# Azure Hybrid Lab

This document covers the Azure Hybrid Lab environment - a complete enterprise simulation with Active Directory, domain controllers, and integration with the on-premises homelab via site-to-site VPN.

## Overview

The Azure Hybrid Lab extends the homelab infrastructure to Azure, providing:

- **Active Directory Forest**: Full Windows AD DS deployment with enterprise tiering model
- **Domain Controllers**: 4 DCs (2 writable, 2 RODCs) for high availability
- **Hybrid Connectivity**: Site-to-site VPN integration with existing Azure infrastructure
- **Enterprise Simulation**: Complete OU structure, security groups, and simulated users

## Architecture

```
                              AZURE CLOUD
                    Subscription: FireGiants-Prod
                    Region: Southeast Asia

  +---------------------------------------------------------------------+
  |                     erd-connectivity-sea-rg                          |
  |  +---------------------------------------------------------------+  |
  |  |           erd-shared-corp-vnet-sea (10.10.0.0/21)             |  |
  |  |                                                               |  |
  |  |  +------------------+  +------------------+                   |  |
  |  |  | GatewaySubnet    |  | IdentitySubnet   |                   |  |
  |  |  | 10.10.1.0/24     |  | 10.10.4.0/24     |                   |  |
  |  |  |                  |  |                  |                   |  |
  |  |  | VPN Gateway      |  | AZDC01  10.10.4.4|                   |  |
  |  |  | (Active-Active)  |  | AZDC02  10.10.4.5|                   |  |
  |  |  +------------------+  | AZRODC01 10.10.4.6                   |  |
  |  |                        | AZRODC02 10.10.4.7                   |  |
  |  |                        +------------------+                   |  |
  |  +---------------------------------------------------------------+  |
  |                              |                                      |
  |                    VNet Peering (Hub-Spoke)                         |
  |                              |                                      |
  +------------------------------|--------------------------------------+
                                 |
  +------------------------------|--------------------------------------+
  |                     rg-azurehybrid-app-prod                         |
  |  +---------------------------------------------------------------+  |
  |  |        vnet-azurehybrid-spoke-prod (10.1.0.0/16)              |  |
  |  |                                                               |  |
  |  |  +------------------+  +------------------+                   |  |
  |  |  | AKS Subnet       |  | ACR              |                   |  |
  |  |  | 10.1.0.0/22      |  | acrazurehybrid   |                   |  |
  |  |  |                  |  | prod.azurecr.io  |                   |  |
  |  |  | (Future AKS)     |  +------------------+                   |  |
  |  |  +------------------+                                         |  |
  |  +---------------------------------------------------------------+  |
  +---------------------------------------------------------------------+
                                 |
                      Site-to-Site VPN (IPsec)
                                 |
  +---------------------------------------------------------------------+
  |                        HOMELAB (On-Premises)                        |
  |                                                                     |
  |   VLAN 20 (192.168.20.0/24)     VLAN 40 (192.168.40.0/24)          |
  |   ├── node01 (Proxmox)          ├── docker-media                   |
  |   ├── node02 (Proxmox)          ├── docker-glance                  |
  |   └── ansible-controller        └── traefik                        |
  +---------------------------------------------------------------------+
```

---

## Domain Controllers

| Server | Role | IP Address | Global Catalog | Description |
|--------|------|------------|----------------|-------------|
| **AZDC01** | Primary DC | 10.10.4.4 | Yes | Forest root, first DC |
| **AZDC02** | Secondary DC | 10.10.4.5 | Yes | Writable replica |
| **AZRODC01** | Read-Only DC | 10.10.4.6 | Yes | Branch office simulation |
| **AZRODC02** | Read-Only DC | 10.10.4.7 | Yes | Branch office simulation |

### Domain Details

| Property | Value |
|----------|-------|
| **Domain Name** | hrmsmrflrii.xyz |
| **NetBIOS Name** | HRMSMRFLRII |
| **Forest Functional Level** | Windows Server 2016 |
| **Domain Functional Level** | Windows Server 2016 |
| **DNS Forwarders** | 8.8.8.8, 8.8.4.4 |
| **AD Site** | Default-First-Site-Name |

### Credentials

| Account | Username | Password | Purpose |
|---------|----------|----------|---------|
| Domain Admin | HRMSMRFLRII\azureadmin | (stored in vault) | Full domain admin |
| DSRM | N/A | (stored in vault) | Directory Services Restore Mode |
| Standard Users | HRMSMRFLRII\{username} | (change on first login) | Simulated employees |

---

## Enterprise Tiering Model

The Active Directory structure follows Microsoft's recommended enterprise tiering model for privileged access security.

### Tier Structure

```
hrmsmrflrii.xyz (Domain Root)
│
├── Tier 0 - Domain Controllers & Privileged Access
│   ├── Admin Accounts          # T0 admin accounts (t0.admin, t0.entadmin, etc.)
│   ├── Admin Groups            # T0-Domain-Admins, T0-Enterprise-Admins, etc.
│   ├── Admin Workstations      # Privileged Access Workstations (PAWs)
│   ├── Service Accounts        # T0 service accounts
│   └── Servers                 # DCs, PKI, etc.
│
├── Tier 1 - Server Administration
│   ├── Admin Accounts          # T1 admin accounts (t1.srvadmin, t1.sqladmin, etc.)
│   ├── Admin Groups            # T1-Server-Admins, T1-SQL-Admins, etc.
│   ├── Service Accounts        # T1 service accounts
│   └── Servers
│       ├── Application Servers
│       ├── Database Servers
│       ├── Web Servers
│       └── File Servers
│
├── Tier 2 - Workstation Administration
│   ├── Admin Accounts          # T2 admin accounts (t2.deskadmin, t2.helpdesk1, etc.)
│   ├── Admin Groups            # T2-Workstation-Admins, T2-Helpdesk-L1, etc.
│   ├── Service Accounts        # T2 service accounts
│   └── Workstations
│       ├── Windows 11
│       ├── Windows 10
│       └── Kiosks
│
├── Corporate - Standard Users & Resources
│   ├── Users                   # Standard user accounts
│   ├── Groups
│   │   ├── Security Groups     # Dept-IT, VPN-Users, FS-Finance-Read, etc.
│   │   └── Distribution Lists
│   └── Departments
│       ├── IT
│       ├── Finance
│       ├── HR
│       ├── Sales
│       ├── Engineering
│       ├── Operations
│       ├── Legal
│       └── Executive
│
├── Quarantine - Disabled Objects
│   ├── Disabled Users
│   └── Disabled Computers
│
└── Staging - New Objects
    ├── New Users
    └── New Computers
```

### Security Groups

| Group | Tier | Scope | Purpose |
|-------|------|-------|---------|
| T0-Domain-Admins | 0 | Global | Domain administration |
| T0-Enterprise-Admins | 0 | Universal | Forest-wide administration |
| T0-Schema-Admins | 0 | Universal | Schema modifications |
| T0-PAW-Users | 0 | Global | PAW workstation access |
| T1-Server-Admins | 1 | Global | Server administration |
| T1-SQL-Admins | 1 | Global | SQL Server administration |
| T1-Backup-Operators | 1 | Global | Backup operations |
| T2-Workstation-Admins | 2 | Global | Workstation administration |
| T2-Helpdesk-L1 | 2 | Global | Level 1 helpdesk |
| T2-Helpdesk-L2 | 2 | Global | Level 2 helpdesk |
| Dept-IT | Corp | Global | IT department members |
| Dept-Finance | Corp | Global | Finance department members |
| VPN-Users | Corp | Global | VPN access |
| FS-Finance-Read | Corp | DomainLocal | Finance share read access |

### Simulated Users

| Username | Name | Title | Department | Groups |
|----------|------|-------|------------|--------|
| t0.admin | Tier0 Admin | Domain Administrator | IT | T0-Domain-Admins, T0-PAW-Users |
| t1.srvadmin | Server Admin | Server Administrator | IT | T1-Server-Admins |
| t2.helpdesk1 | Helpdesk Level1 | Helpdesk L1 | IT | T2-Helpdesk-L1 |
| jsmith | John Smith | IT Manager | IT | Dept-IT, VPN-Users |
| dmiller | David Miller | CFO | Finance | Dept-Finance, FS-Finance-Write |
| jmartinez | Jennifer Martinez | HR Director | HR | Dept-HR, FS-HR-Write |
| cthomas | Christopher Thomas | VP Engineering | Engineering | Dept-Engineering, APP-DevTools-Users |
| wturner | William Turner | CEO | Executive | Dept-Executive, VPN-Users |

---

## Infrastructure Deployment

### Terraform Configuration

The Azure infrastructure is deployed using Terraform from the `ubuntu-deploy-vm` (10.90.10.5).

#### Directory Structure

```
/opt/terraform/azure-hybrid-lab/
├── main.tf                 # Main orchestration
├── providers.tf            # Azure provider with MSI auth
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── terraform.tfvars        # Secrets (not in git)
└── modules/
    ├── connectivity/       # Hub VNet, Identity subnet, NSG
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── platform-lz/        # Domain controllers, Key Vault
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    └── app-lz/             # Spoke VNet, AKS, ACR
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

#### Key Terraform Resources

**Connectivity Module** (`modules/connectivity/main.tf`):
- References existing Hub VNet (`erd-shared-corp-vnet-sea`)
- Creates Identity subnet (10.10.4.0/24)
- Creates NSG for identity subnet

**Platform Identity Module** (`modules/platform-lz/main.tf`):
- Creates 4 Windows Server 2022 VMs for domain controllers
- Configures NICs with static IPs
- Attaches data disks for AD database
- Configures WinRM via VM extension
- Creates Key Vault for secrets
- Creates private DNS zone

**App Landing Zone Module** (`modules/app-lz/main.tf`):
- Creates Spoke VNet (10.1.0.0/16)
- Creates subnets for AKS, services, data
- Creates Azure Container Registry
- Prepares for future AKS deployment

#### Provider Configuration

```hcl
# providers.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85"
    }
  }
}

# Platform subscription (FireGiants-Prod)
provider "azurerm" {
  features {}
  use_msi         = true
  subscription_id = "2212d587-1bad-4013-b605-b421b1f83c30"
  alias           = "platform"
}

# App subscription (Nokron-Prod)
provider "azurerm" {
  features {}
  use_msi         = true
  subscription_id = "9dde5c52-88be-4608-9bee-c52d1909693f"
  alias           = "app"
}
```

#### Deployment Commands

```bash
# SSH to deployment VM
ssh ubuntu-deploy

# Navigate to terraform directory
cd /opt/terraform/azure-hybrid-lab

# Login with managed identity
az login --identity

# Initialize and deploy
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Ansible Configuration

Active Directory is deployed using Ansible from the homelab Ansible controller (192.168.20.30).

#### Directory Structure

```
~/ansible/azure-ad/
├── inventory.yml                   # Windows hosts inventory
└── deploy-active-directory.yml     # Main deployment playbook
```

#### Inventory File

```yaml
# inventory.yml
all:
  vars:
    ansible_user: azureadmin
    ansible_password: "{{ vault_ansible_password }}"  # Stored in Ansible Vault
    ansible_connection: winrm
    ansible_winrm_transport: ntlm
    ansible_winrm_server_cert_validation: ignore
    ansible_port: 5985

  children:
    primary_dc:
      hosts:
        AZDC01:
          ansible_host: 10.10.4.4
          dc_role: "PrimaryDC"

    secondary_dcs:
      hosts:
        AZDC02:
          ansible_host: 10.10.4.5
          dc_role: "SecondaryDC"

    rodcs:
      hosts:
        AZRODC01:
          ansible_host: 10.10.4.6
          dc_role: "RODC"
        AZRODC02:
          ansible_host: 10.10.4.7
          dc_role: "RODC"
```

#### Playbook Phases

The `deploy-active-directory.yml` playbook runs in 9 phases:

| Phase | Description | Target Hosts |
|-------|-------------|--------------|
| 1 | Install AD DS and DNS features | All DCs |
| 2 | Promote AZDC01 as Primary DC | AZDC01 |
| 3 | Configure DNS forwarders | AZDC01 |
| 4 | Promote AZDC02 as Secondary DC | AZDC02 |
| 5 | Promote RODCs | AZRODC01, AZRODC02 |
| 6 | Create Enterprise Tiering OU Structure | AZDC01 |
| 7 | Create Security Groups | AZDC01 |
| 8 | Create Simulated Users | AZDC01 |
| 9 | Final Verification | AZDC01 |

#### Deployment Commands

```bash
# SSH to Ansible controller
ssh ansible

# Navigate to azure-ad directory
cd ~/ansible/azure-ad

# Test connectivity
ansible -i inventory.yml all -m win_ping

# Run deployment
ansible-playbook -i inventory.yml deploy-active-directory.yml -v
```

---

## VPN Connectivity

### OPNsense Configuration

To access Azure resources from the homelab, configure OPNsense with:

| Setting | Value |
|---------|-------|
| **Remote Subnets** | 10.10.0.0/21 (covers all Azure Hub VNet) |
| **Local Subnets** | 192.168.20.0/24, 192.168.40.0/24, 192.168.90.0/24 |

### Azure Local Network Gateway

The Azure Local Network Gateway includes these homelab networks:

```
192.168.10.0/24
192.168.20.0/24
192.168.30.0/24
192.168.40.0/24
192.168.90.0/24
```

### Testing Connectivity

```bash
# From homelab (after VPN configured)
ping 10.10.4.4          # AZDC01
nc -zv 10.10.4.4 3389   # RDP
nc -zv 10.10.4.4 5985   # WinRM

# RDP to domain controller
mstsc /v:10.10.4.4
# Login: HRMSMRFLRII\azureadmin
```

---

## Cost Considerations

| Resource | Estimated Monthly Cost |
|----------|------------------------|
| AZDC01 (Standard_B2s) | ~$30 USD |
| AZDC02 (Standard_B2s) | ~$30 USD |
| AZRODC01 (Standard_B2s) | ~$30 USD |
| AZRODC02 (Standard_B2s) | ~$30 USD |
| Data Disks (4x 32GB) | ~$5 USD |
| Container Registry (Basic) | ~$5 USD |
| VNet Peering | ~$1 USD |
| **Total** | **~$130 USD/month** |

> **Tip**: Stop VMs when not in use to reduce costs.

---

## Troubleshooting

### Cannot RDP to Domain Controllers

```bash
# Test connectivity
ping 10.10.4.4
nc -zv 10.10.4.4 3389

# Check VPN status in OPNsense
# Verify route for 10.10.0.0/21 exists
```

### AD Replication Issues

```powershell
# On any DC
repadmin /replsummary
repadmin /showrepl
dcdiag /v
```

### DNS Resolution Failures

```powershell
# Test DNS
nslookup hrmsmrflrii.xyz 10.10.4.4
Get-DnsServerForwarder
```

### WinRM Connection Issues

```bash
# From Ansible controller
ansible -i inventory.yml AZDC01 -m win_ping -vvv
```

---

## Related Documentation

- [Azure Environment](AZURE_ENVIRONMENT.md) - Base Azure setup
- [Networking](NETWORKING.md) - Network architecture
- [Ansible](ANSIBLE.md) - Ansible configuration
- [Terraform](TERRAFORM.md) - Terraform basics

---

*Last updated: January 7, 2026*
