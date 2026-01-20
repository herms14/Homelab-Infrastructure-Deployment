#!/bin/bash
# =============================================================================
# Azure Managed Grafana Deployment Script
# =============================================================================
# Run from: ubuntu-deploy-vm (10.90.10.5)
#   scp -r azure-managed-grafana/ hermes-admin@ubuntu-deploy:/opt/terraform/
#   ssh ubuntu-deploy
#   cd /opt/terraform/azure-managed-grafana
#   chmod +x deploy.sh && ./deploy.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Azure Managed Grafana Deployment ===${NC}"
echo ""

# Check if running on ubuntu-deploy
if [[ $(hostname) != "ubuntu-deploy"* ]]; then
    echo -e "${YELLOW}Warning: This script is designed to run on ubuntu-deploy-vm${NC}"
    echo "The VM has Managed Identity with required Azure permissions."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 1: Initialize Terraform
echo -e "${GREEN}[1/5] Initializing Terraform...${NC}"
terraform init

# Step 2: Validate configuration
echo -e "${GREEN}[2/5] Validating Terraform configuration...${NC}"
terraform validate

# Step 3: Plan deployment
echo -e "${GREEN}[3/5] Planning deployment...${NC}"
terraform plan -out=tfplan

# Step 4: Apply deployment
echo -e "${YELLOW}Ready to apply Terraform configuration.${NC}"
read -p "Apply? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo -e "${GREEN}[4/5] Applying Terraform configuration...${NC}"
terraform apply tfplan

# Get outputs
GRAFANA_NAME=$(terraform output -raw grafana_name)
RESOURCE_GROUP=$(terraform output -raw resource_group_name)
GRAFANA_ENDPOINT=$(terraform output -raw grafana_endpoint)

echo ""
echo -e "${GREEN}Terraform deployment complete!${NC}"
echo "Grafana Name: $GRAFANA_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo "Endpoint: $GRAFANA_ENDPOINT"
echo ""

# Step 5: Import dashboards
echo -e "${GREEN}[5/5] Importing dashboards...${NC}"

# Create Homelab Monitoring folder
echo "Creating dashboard folder..."
az grafana folder create \
    --name "$GRAFANA_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --title "Homelab Monitoring" 2>/dev/null || echo "Folder may already exist"

# Import dashboards
DASHBOARDS=("compute-overview" "network-overview" "storage-overview" "vwan-vpn-overview")

for dashboard in "${DASHBOARDS[@]}"; do
    echo "Importing $dashboard dashboard..."
    az grafana dashboard import \
        --name "$GRAFANA_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --folder "Homelab Monitoring" \
        --definition @dashboards/${dashboard}.json || echo "Failed to import $dashboard"
done

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Azure Managed Grafana URL: $GRAFANA_ENDPOINT"
echo ""
echo "Dashboards imported:"
echo "  - Azure VMs - Compute Overview"
echo "  - Azure Multi-Region Network Overview"
echo "  - Azure Multi-Region Storage Overview"
echo "  - Azure VWAN & VPN Overview"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Access Grafana at: $GRAFANA_ENDPOINT"
echo "2. Sign in with your Azure AD account"
echo "3. Navigate to Dashboards > Homelab Monitoring"
echo "4. Verify data sources are working"
echo ""
