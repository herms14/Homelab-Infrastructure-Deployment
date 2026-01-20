# =============================================================================
# Azure Managed Grafana - Variables
# =============================================================================

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
  default     = "2212d587-1bad-4013-b605-b421b1f83c30"
}

variable "resource_group_name" {
  description = "Name of the resource group for Grafana"
  type        = string
  default     = "rg-grafana-prod-sea"
}

variable "location" {
  description = "Azure region for Grafana deployment"
  type        = string
  default     = "southeastasia"
}

variable "grafana_name" {
  description = "Name of the Azure Managed Grafana instance"
  type        = string
  default     = "grafana-homelab-prod"
}

variable "sku" {
  description = "SKU for Azure Managed Grafana (Standard or Essential)"
  type        = string
  default     = "Standard"
}

variable "api_key_enabled" {
  description = "Enable API key authentication"
  type        = bool
  default     = true
}

variable "deterministic_outbound_ip_enabled" {
  description = "Enable deterministic outbound IP"
  type        = bool
  default     = false
}

variable "public_network_access" {
  description = "Enable public network access"
  type        = string
  default     = "Enabled"
}

variable "zone_redundancy" {
  description = "Enable zone redundancy"
  type        = string
  default     = "Disabled"
}

variable "grafana_admin_object_ids" {
  description = "Object IDs for Grafana admin access"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    environment = "production"
    project     = "homelab-monitoring"
    managed_by  = "terraform"
  }
}

# =============================================================================
# VM Monitoring Configuration
# =============================================================================

variable "sea_vm_resource_ids" {
  description = "Resource IDs of VMs in Southeast Asia to monitor"
  type        = list(string)
  default     = []
}

variable "eastasia_vm_resource_ids" {
  description = "Resource IDs of VMs in East Asia to monitor"
  type        = list(string)
  default     = []
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID for Sentinel integration"
  type        = string
  default     = ""
}
