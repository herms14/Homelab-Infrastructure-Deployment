variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
  default     = "2212d587-1bad-4013-b605-b421b1f83c30"
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
  default     = "rg-homelab-sentinel"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "southeastasia"
}

variable "vm_name" {
  description = "VM name"
  type        = string
  default     = "ubuntu-terraform-vm"
}

variable "vm_size" {
  description = "VM size"
  type        = string
  default     = "Standard_B2s"
}

variable "admin_username" {
  description = "Admin username"
  type        = string
  default     = "hermes-admin"
}
