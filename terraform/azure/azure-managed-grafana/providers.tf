# =============================================================================
# Azure Managed Grafana - Provider Configuration
# =============================================================================
# Deploy Azure Managed Grafana with comprehensive monitoring dashboards
# for multi-region VMs (SEA and East Asia)
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 1.9"
    }
  }
}

provider "azurerm" {
  features {}

  # Use Managed Identity when running from ubuntu-deploy-vm
  use_msi         = true
  subscription_id = var.subscription_id
}

provider "azapi" {
  use_msi         = true
  subscription_id = var.subscription_id
}
