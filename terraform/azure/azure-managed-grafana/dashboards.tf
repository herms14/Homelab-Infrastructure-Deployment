# =============================================================================
# Azure Managed Grafana - Dashboard Provisioning
# =============================================================================
# Uses azapi provider to deploy Grafana dashboards via the Grafana API
# =============================================================================

# -----------------------------------------------------------------------------
# Local Variables for Dashboard Content
# -----------------------------------------------------------------------------
locals {
  dashboards = {
    compute = {
      folder = "Homelab Monitoring"
      json   = file("${path.module}/dashboards/compute-overview.json")
    }
    network = {
      folder = "Homelab Monitoring"
      json   = file("${path.module}/dashboards/network-overview.json")
    }
    storage = {
      folder = "Homelab Monitoring"
      json   = file("${path.module}/dashboards/storage-overview.json")
    }
    vwan_vpn = {
      folder = "Homelab Monitoring"
      json   = file("${path.module}/dashboards/vwan-vpn-overview.json")
    }
  }
}

# -----------------------------------------------------------------------------
# Dashboard Deployment Notes
# -----------------------------------------------------------------------------
# Azure Managed Grafana dashboards can be deployed after Grafana is created
# using the Grafana HTTP API. The dashboard JSON files are in ./dashboards/
#
# After terraform apply, deploy dashboards using:
#   1. Get Grafana endpoint from terraform output
#   2. Use Azure CLI to get access token: az grafana show -n grafana-homelab-prod -g rg-grafana-prod-sea
#   3. Import dashboards via Grafana API or Azure portal
#
# Example using Azure CLI:
#   az grafana dashboard import \
#     --name grafana-homelab-prod \
#     --resource-group rg-grafana-prod-sea \
#     --definition @dashboards/compute-overview.json
# -----------------------------------------------------------------------------

# Output dashboard file paths for reference
output "dashboard_files" {
  description = "Dashboard JSON files to import"
  value = {
    compute  = "${path.module}/dashboards/compute-overview.json"
    network  = "${path.module}/dashboards/network-overview.json"
    storage  = "${path.module}/dashboards/storage-overview.json"
    vwan_vpn = "${path.module}/dashboards/vwan-vpn-overview.json"
  }
}
