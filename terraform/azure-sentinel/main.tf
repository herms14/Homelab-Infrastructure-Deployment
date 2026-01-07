# ==============================================================================
# Azure Sentinel Infrastructure
# ==============================================================================

# Get existing resource group
data "azurerm_resource_group" "sentinel" {
  name = var.resource_group_name
}

# ------------------------------------------------------------------------------
# Log Analytics Workspace
# ------------------------------------------------------------------------------

resource "azurerm_log_analytics_workspace" "sentinel" {
  name                = var.log_analytics_workspace_name
  location            = var.location
  resource_group_name = data.azurerm_resource_group.sentinel.name
  sku                 = var.log_analytics_sku
  retention_in_days   = var.retention_in_days

  # Enable for Sentinel
  internet_ingestion_enabled = true
  internet_query_enabled     = true

  tags = var.tags
}

# ------------------------------------------------------------------------------
# Microsoft Sentinel
# ------------------------------------------------------------------------------

resource "azurerm_sentinel_log_analytics_workspace_onboarding" "sentinel" {
  workspace_id                 = azurerm_log_analytics_workspace.sentinel.id
  customer_managed_key_enabled = false
}

# ------------------------------------------------------------------------------
# Data Collection Endpoint (DCE)
# ------------------------------------------------------------------------------

resource "azurerm_monitor_data_collection_endpoint" "syslog" {
  name                          = "dce-homelab-syslog"
  resource_group_name           = data.azurerm_resource_group.sentinel.name
  location                      = var.location
  kind                          = "Linux"
  public_network_access_enabled = true
  description                   = "Data Collection Endpoint for homelab syslog ingestion"

  tags = var.tags
}

# ------------------------------------------------------------------------------
# Data Collection Rule (DCR) for Syslog
# ------------------------------------------------------------------------------

resource "azurerm_monitor_data_collection_rule" "syslog" {
  name                        = "dcr-homelab-syslog"
  resource_group_name         = data.azurerm_resource_group.sentinel.name
  location                    = var.location
  data_collection_endpoint_id = azurerm_monitor_data_collection_endpoint.syslog.id
  description                 = "Data Collection Rule for syslog from homelab devices"

  destinations {
    log_analytics {
      workspace_resource_id = azurerm_log_analytics_workspace.sentinel.id
      name                  = "sentinel-destination"
    }
  }

  data_flow {
    streams      = ["Microsoft-Syslog"]
    destinations = ["sentinel-destination"]
  }

  data_sources {
    syslog {
      facility_names = var.syslog_facilities
      log_levels     = var.syslog_log_levels
      name           = "syslogDataSource"
      streams        = ["Microsoft-Syslog"]
    }
  }

  tags = var.tags
}

# ------------------------------------------------------------------------------
# DCR Association with Arc Server
# ------------------------------------------------------------------------------

resource "azurerm_monitor_data_collection_rule_association" "syslog_arc" {
  name                    = "dcra-syslog-arc-server"
  target_resource_id      = var.arc_server_resource_id
  data_collection_rule_id = azurerm_monitor_data_collection_rule.syslog.id
  description             = "Association between syslog DCR and Arc-enabled server"
}

# DCE Association with Arc Server
resource "azurerm_monitor_data_collection_rule_association" "dce_arc" {
  name                        = "configurationAccessEndpoint"
  target_resource_id          = var.arc_server_resource_id
  data_collection_endpoint_id = azurerm_monitor_data_collection_endpoint.syslog.id
  description                 = "DCE association for Arc-enabled server"
}

# ------------------------------------------------------------------------------
# Azure Monitor Agent Extension for Arc Server
# ------------------------------------------------------------------------------

resource "azurerm_arc_machine_extension" "ama" {
  name           = "AzureMonitorLinuxAgent"
  location       = var.location
  arc_machine_id = var.arc_server_resource_id
  publisher      = "Microsoft.Azure.Monitor"
  type           = "AzureMonitorLinuxAgent"

  # Use latest version
  automatic_upgrade_enabled = true

  tags = var.tags
}

# ------------------------------------------------------------------------------
# Sentinel Analytics Rules (Basic Detection)
# ------------------------------------------------------------------------------

# Brute Force Detection Rule
resource "azurerm_sentinel_alert_rule_scheduled" "brute_force_syslog" {
  name                       = "brute-force-syslog-detection"
  display_name               = "Potential Brute Force Attack (Syslog)"
  description                = "Detects multiple failed authentication attempts from syslog sources"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.sentinel.id
  severity                   = "Medium"
  enabled                    = true

  query = <<-QUERY
    Syslog
    | where Facility in ("auth", "authpriv")
    | where SyslogMessage contains "Failed" or SyslogMessage contains "failure" or SyslogMessage contains "invalid"
    | summarize FailedAttempts = count() by HostIP, bin(TimeGenerated, 5m)
    | where FailedAttempts > 10
  QUERY

  query_frequency = "PT5M"
  query_period    = "PT5M"

  trigger_operator  = "GreaterThan"
  trigger_threshold = 0

  suppression_enabled  = true
  suppression_duration = "PT1H"

  tactics = ["CredentialAccess", "InitialAccess"]

  incident_configuration {
    create_incident = true
    grouping {
      enabled                 = true
      lookback_duration       = "PT5H"
      reopen_closed_incidents = false
      entity_matching_method  = "AllEntities"
    }
  }

  depends_on = [azurerm_sentinel_log_analytics_workspace_onboarding.sentinel]
}

# New Device Detection (for Omada logs)
resource "azurerm_sentinel_alert_rule_scheduled" "new_device_detection" {
  name                       = "new-network-device-detection"
  display_name               = "New Device Detected on Network"
  description                = "Detects new devices connecting to the network via Omada controller logs"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.sentinel.id
  severity                   = "Informational"
  enabled                    = true

  query = <<-QUERY
    Syslog
    | where Facility == "local0"
    | where SyslogMessage contains "new client" or SyslogMessage contains "associated"
    | extend MAC = extract(@"([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}", 0, SyslogMessage)
    | where isnotempty(MAC)
    | summarize FirstSeen = min(TimeGenerated), Count = count() by MAC, HostName
    | where Count == 1
  QUERY

  query_frequency = "PT15M"
  query_period    = "PT15M"

  trigger_operator  = "GreaterThan"
  trigger_threshold = 0

  suppression_enabled  = true
  suppression_duration = "PT24H"

  tactics = ["InitialAccess", "Discovery"]

  incident_configuration {
    create_incident = true
    grouping {
      enabled                 = true
      lookback_duration       = "PT24H"
      reopen_closed_incidents = false
      entity_matching_method  = "AllEntities"
    }
  }

  depends_on = [azurerm_sentinel_log_analytics_workspace_onboarding.sentinel]
}
