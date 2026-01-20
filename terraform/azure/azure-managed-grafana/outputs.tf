# =============================================================================
# Azure Managed Grafana - Outputs
# =============================================================================

output "grafana_endpoint" {
  description = "The endpoint URL for Azure Managed Grafana"
  value       = azurerm_dashboard_grafana.main.endpoint
}

output "grafana_id" {
  description = "The resource ID of Azure Managed Grafana"
  value       = azurerm_dashboard_grafana.main.id
}

output "grafana_name" {
  description = "The name of Azure Managed Grafana instance"
  value       = azurerm_dashboard_grafana.main.name
}

output "grafana_identity_principal_id" {
  description = "The Principal ID of the Grafana managed identity"
  value       = azurerm_dashboard_grafana.main.identity[0].principal_id
}

output "resource_group_name" {
  description = "The resource group containing Grafana resources"
  value       = azurerm_resource_group.grafana.name
}

output "monitor_workspace_id" {
  description = "The Azure Monitor Workspace ID"
  value       = azurerm_monitor_workspace.main.id
}

output "data_collection_rule_id" {
  description = "The Data Collection Rule ID for VM metrics"
  value       = azurerm_monitor_data_collection_rule.vm_metrics.id
}

output "data_collection_endpoint_id" {
  description = "The Data Collection Endpoint ID"
  value       = azurerm_monitor_data_collection_endpoint.vm_metrics.id
}
