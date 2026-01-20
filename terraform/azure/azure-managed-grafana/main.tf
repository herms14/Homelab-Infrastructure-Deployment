# =============================================================================
# Azure Managed Grafana - Main Configuration
# =============================================================================
# Deploys Azure Managed Grafana with Azure Monitor data source
# and comprehensive monitoring dashboards for multi-region VMs
# =============================================================================

# -----------------------------------------------------------------------------
# Resource Group
# -----------------------------------------------------------------------------
resource "azurerm_resource_group" "grafana" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

# -----------------------------------------------------------------------------
# Azure Managed Grafana
# -----------------------------------------------------------------------------
resource "azurerm_dashboard_grafana" "main" {
  name                              = var.grafana_name
  resource_group_name               = azurerm_resource_group.grafana.name
  location                          = azurerm_resource_group.grafana.location
  api_key_enabled                   = var.api_key_enabled
  deterministic_outbound_ip_enabled = var.deterministic_outbound_ip_enabled
  public_network_access_enabled     = var.public_network_access == "Enabled"
  zone_redundancy_enabled           = var.zone_redundancy == "Enabled"
  grafana_major_version             = 11

  sku = var.sku

  identity {
    type = "SystemAssigned"
  }

  azure_monitor_workspace_integrations {
    resource_id = azurerm_monitor_workspace.main.id
  }

  tags = var.tags
}

# -----------------------------------------------------------------------------
# Azure Monitor Workspace (for Prometheus metrics)
# -----------------------------------------------------------------------------
resource "azurerm_monitor_workspace" "main" {
  name                = "amw-homelab-monitoring"
  resource_group_name = azurerm_resource_group.grafana.name
  location            = azurerm_resource_group.grafana.location
  tags                = var.tags
}

# -----------------------------------------------------------------------------
# Grant Grafana MSI access to Azure Monitor
# -----------------------------------------------------------------------------
resource "azurerm_role_assignment" "grafana_monitoring_reader" {
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Monitoring Reader"
  principal_id         = azurerm_dashboard_grafana.main.identity[0].principal_id
}

resource "azurerm_role_assignment" "grafana_log_analytics_reader" {
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Log Analytics Reader"
  principal_id         = azurerm_dashboard_grafana.main.identity[0].principal_id
}

# Grant Grafana access to read all resources for metrics
resource "azurerm_role_assignment" "grafana_reader" {
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Reader"
  principal_id         = azurerm_dashboard_grafana.main.identity[0].principal_id
}

# -----------------------------------------------------------------------------
# Data Collection Rule for VMs
# -----------------------------------------------------------------------------
resource "azurerm_monitor_data_collection_rule" "vm_metrics" {
  name                = "dcr-vm-metrics-homelab"
  resource_group_name = azurerm_resource_group.grafana.name
  location            = azurerm_resource_group.grafana.location

  destinations {
    azure_monitor_metrics {
      name = "azureMonitorMetrics-default"
    }
  }

  data_flow {
    streams      = ["Microsoft-InsightsMetrics"]
    destinations = ["azureMonitorMetrics-default"]
  }

  data_sources {
    performance_counter {
      name                          = "VMInsightsPerf"
      streams                       = ["Microsoft-InsightsMetrics"]
      sampling_frequency_in_seconds = 60
      counter_specifiers = [
        "\\Processor Information(_Total)\\% Processor Time",
        "\\Processor Information(_Total)\\% Privileged Time",
        "\\Processor Information(_Total)\\% User Time",
        "\\Memory\\% Committed Bytes In Use",
        "\\Memory\\Available Bytes",
        "\\Memory\\Committed Bytes",
        "\\Memory\\Cache Bytes",
        "\\LogicalDisk(*)\\% Free Space",
        "\\LogicalDisk(*)\\Free Megabytes",
        "\\LogicalDisk(*)\\% Disk Time",
        "\\LogicalDisk(*)\\Disk Transfers/sec",
        "\\LogicalDisk(*)\\Disk Read Bytes/sec",
        "\\LogicalDisk(*)\\Disk Write Bytes/sec",
        "\\Network Interface(*)\\Bytes Total/sec",
        "\\Network Interface(*)\\Bytes Received/sec",
        "\\Network Interface(*)\\Bytes Sent/sec",
        "\\System\\Processor Queue Length",
        "\\System\\Context Switches/sec"
      ]
    }
  }

  tags = var.tags
}

# -----------------------------------------------------------------------------
# Data Collection Endpoint
# -----------------------------------------------------------------------------
resource "azurerm_monitor_data_collection_endpoint" "vm_metrics" {
  name                          = "dce-vm-metrics-homelab"
  resource_group_name           = azurerm_resource_group.grafana.name
  location                      = azurerm_resource_group.grafana.location
  public_network_access_enabled = true
  tags                          = var.tags
}

# -----------------------------------------------------------------------------
# Diagnostic Settings for VMs (collect metrics automatically)
# -----------------------------------------------------------------------------
# Note: Associate the DCR with each VM after deployment using:
# az monitor data-collection rule association create \
#   --name "configurationAccessEndpoint" \
#   --rule-id <DCR_RESOURCE_ID> \
#   --resource <VM_RESOURCE_ID>

# -----------------------------------------------------------------------------
# Action Group for Alerts
# -----------------------------------------------------------------------------
resource "azurerm_monitor_action_group" "homelab_alerts" {
  name                = "ag-homelab-critical"
  resource_group_name = azurerm_resource_group.grafana.name
  short_name          = "HomelabCrit"

  tags = var.tags
}

# -----------------------------------------------------------------------------
# Alert Rules
# -----------------------------------------------------------------------------

# VPN Tunnel Disconnection Alert
resource "azurerm_monitor_metric_alert" "vpn_tunnel_down" {
  name                = "alert-vpn-tunnel-disconnected"
  resource_group_name = azurerm_resource_group.grafana.name
  scopes              = ["/subscriptions/${var.subscription_id}/resourceGroups/rg-vwan-prod/providers/Microsoft.Network/vpnGateways/vpngw-homelab-prod-sea"]
  description         = "VPN tunnel to on-premises homelab is disconnected"
  severity            = 0
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Network/vpnGateways"
    metric_name      = "TunnelAverageBandwidth"
    aggregation      = "Average"
    operator         = "LessThan"
    threshold        = 1
  }

  action {
    action_group_id = azurerm_monitor_action_group.homelab_alerts.id
  }

  tags = var.tags
}

# High CPU Alert for All VMs
resource "azurerm_monitor_metric_alert" "vm_high_cpu" {
  name                = "alert-vm-high-cpu"
  resource_group_name = azurerm_resource_group.grafana.name
  scopes              = ["/subscriptions/${var.subscription_id}"]
  description         = "VM CPU usage is above 90% for 5 minutes"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"
  target_resource_type = "Microsoft.Compute/virtualMachines"

  criteria {
    metric_namespace = "Microsoft.Compute/virtualMachines"
    metric_name      = "Percentage CPU"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 90
  }

  action {
    action_group_id = azurerm_monitor_action_group.homelab_alerts.id
  }

  tags = var.tags
}

# Low Available Memory Alert
resource "azurerm_monitor_metric_alert" "vm_low_memory" {
  name                = "alert-vm-low-memory"
  resource_group_name = azurerm_resource_group.grafana.name
  scopes              = ["/subscriptions/${var.subscription_id}"]
  description         = "VM available memory is below 1GB"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"
  target_resource_type = "Microsoft.Compute/virtualMachines"

  criteria {
    metric_namespace = "Microsoft.Compute/virtualMachines"
    metric_name      = "Available Memory Bytes"
    aggregation      = "Average"
    operator         = "LessThan"
    threshold        = 1073741824 # 1GB in bytes
  }

  action {
    action_group_id = azurerm_monitor_action_group.homelab_alerts.id
  }

  tags = var.tags
}

# High Disk IOPS Consumed Alert
resource "azurerm_monitor_metric_alert" "vm_high_disk_iops" {
  name                = "alert-vm-high-disk-iops"
  resource_group_name = azurerm_resource_group.grafana.name
  scopes              = ["/subscriptions/${var.subscription_id}"]
  description         = "VM OS disk IOPS consumption is above 95%"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"
  target_resource_type = "Microsoft.Compute/virtualMachines"

  criteria {
    metric_namespace = "Microsoft.Compute/virtualMachines"
    metric_name      = "OS Disk IOPS Consumed Percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 95
  }

  action {
    action_group_id = azurerm_monitor_action_group.homelab_alerts.id
  }

  tags = var.tags
}
