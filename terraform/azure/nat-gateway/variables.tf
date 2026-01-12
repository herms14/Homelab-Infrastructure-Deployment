variable "resource_group_name" {
  description = "Resource group containing the VNet"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "southeastasia"
}

variable "vnet_name" {
  description = "Name of existing VNet"
  type        = string
}

variable "subnet_name" {
  description = "Name of subnet to associate with NAT Gateway"
  type        = string
}
