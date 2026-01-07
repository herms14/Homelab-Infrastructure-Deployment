terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 1.12"
    }
  }
}

# Configure the Azure Provider
# Uses managed identity when running from Azure VM
provider "azurerm" {
  features {
    log_analytics_workspace {
      permanently_delete_on_destroy = false
    }
  }

  # Uncomment if using managed identity
  # use_msi = true

  subscription_id = var.subscription_id
}

# AzAPI provider for resources not yet in azurerm
provider "azapi" {
  subscription_id = var.subscription_id
}
