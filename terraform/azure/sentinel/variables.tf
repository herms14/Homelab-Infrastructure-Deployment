# ==============================================================================
# Azure Sentinel Terraform Variables
# ==============================================================================

variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group for Sentinel resources"
  type        = string
  default     = "rg-homelab-sentinel"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "southeastasia"
}

variable "log_analytics_workspace_name" {
  description = "Name of the Log Analytics workspace"
  type        = string
  default     = "law-homelab-sentinel"
}

variable "log_analytics_sku" {
  description = "SKU for Log Analytics workspace"
  type        = string
  default     = "PerGB2018"
}

variable "retention_in_days" {
  description = "Log retention period in days"
  type        = number
  default     = 90
}

variable "arc_server_resource_id" {
  description = "Resource ID of the Azure Arc-enabled server"
  type        = string
}

variable "arc_server_name" {
  description = "Name of the Azure Arc-enabled server"
  type        = string
  default     = "linux-syslog-server01"
}

variable "syslog_facilities" {
  description = "Syslog facilities to collect"
  type        = list(string)
  default = [
    "auth",
    "authpriv",
    "local0",
    "local1",
    "local2",
    "local3",
    "local4",
    "local5",
    "local6",
    "local7",
    "syslog",
    "user",
    "daemon"
  ]
}

variable "syslog_log_levels" {
  description = "Syslog log levels to collect"
  type        = list(string)
  default = [
    "Debug",
    "Info",
    "Notice",
    "Warning",
    "Error",
    "Critical",
    "Alert",
    "Emergency"
  ]
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Environment = "Homelab"
    Project     = "Sentinel-SIEM"
    ManagedBy   = "Terraform"
  }
}
