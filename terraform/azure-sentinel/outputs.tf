# ==============================================================================
# Terraform Outputs
# ==============================================================================

output "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID"
  value       = azurerm_log_analytics_workspace.sentinel.id
}

output "log_analytics_workspace_name" {
  description = "Log Analytics Workspace Name"
  value       = azurerm_log_analytics_workspace.sentinel.name
}

output "log_analytics_primary_key" {
  description = "Log Analytics Primary Shared Key"
  value       = azurerm_log_analytics_workspace.sentinel.primary_shared_key
  sensitive   = true
}

output "log_analytics_workspace_id_short" {
  description = "Log Analytics Workspace ID (GUID)"
  value       = azurerm_log_analytics_workspace.sentinel.workspace_id
}

output "sentinel_workspace_id" {
  description = "Sentinel-enabled workspace resource ID"
  value       = azurerm_sentinel_log_analytics_workspace_onboarding.sentinel.workspace_id
}

output "data_collection_endpoint_id" {
  description = "Data Collection Endpoint ID"
  value       = azurerm_monitor_data_collection_endpoint.syslog.id
}

output "data_collection_endpoint_url" {
  description = "Data Collection Endpoint URL"
  value       = azurerm_monitor_data_collection_endpoint.syslog.logs_ingestion_endpoint
}

output "data_collection_rule_id" {
  description = "Data Collection Rule ID"
  value       = azurerm_monitor_data_collection_rule.syslog.id
}

output "azure_monitor_agent_extension_id" {
  description = "Azure Monitor Agent Extension ID"
  value       = azurerm_arc_machine_extension.ama.id
}

output "sentinel_portal_url" {
  description = "Direct link to Sentinel in Azure Portal"
  value       = "https://portal.azure.com/#blade/Microsoft_Azure_Security_Insights/MainMenuBlade/Overview/workspaceId/${azurerm_log_analytics_workspace.sentinel.id}"
}

output "arc_server_portal_url" {
  description = "Direct link to Arc server in Azure Portal"
  value       = "https://portal.azure.com/#resource${var.arc_server_resource_id}/overview"
}
