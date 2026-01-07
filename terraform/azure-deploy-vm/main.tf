# Get existing resource group
data "azurerm_resource_group" "deployment" {
  name = "deployment-rg"
}

# Get existing subnet
data "azurerm_subnet" "vmsubnet" {
  name                 = "vmsubnet"
  virtual_network_name = "ans-tf-vm01-vnet"
  resource_group_name  = "deployment-rg"
}

# Get current subscription
data "azurerm_subscription" "current" {}

# Generate SSH key pair
resource "tls_private_key" "ssh" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Network Interface
resource "azurerm_network_interface" "ubuntu_deploy" {
  name                = "nic-ubuntu-deploy-vm"
  location            = data.azurerm_resource_group.deployment.location
  resource_group_name = data.azurerm_resource_group.deployment.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = data.azurerm_subnet.vmsubnet.id
    private_ip_address_allocation = "Dynamic"
  }

  tags = {
    Environment = "Homelab"
    Purpose     = "Azure-Deployment"
    ManagedBy   = "Terraform"
  }
}

# Ubuntu VM
resource "azurerm_linux_virtual_machine" "ubuntu_deploy" {
  name                = "ubuntu-deploy-vm"
  resource_group_name = data.azurerm_resource_group.deployment.name
  location            = data.azurerm_resource_group.deployment.location
  size                = "Standard_D2s_v3"
  admin_username      = "hermes-admin"

  network_interface_ids = [
    azurerm_network_interface.ubuntu_deploy.id,
  ]

  admin_ssh_key {
    username   = "hermes-admin"
    public_key = tls_private_key.ssh.public_key_openssh
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
    disk_size_gb         = 64
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  identity {
    type = "SystemAssigned"
  }

  custom_data = base64encode(<<-EOF
    #!/bin/bash
    set -e

    # Update system
    apt-get update
    apt-get upgrade -y

    # Install prerequisites
    apt-get install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release

    # Install Azure CLI
    curl -sL https://aka.ms/InstallAzureCLIDeb | bash

    # Install Terraform
    wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list
    apt-get update
    apt-get install -y terraform

    # Install Ansible
    apt-add-repository --yes --update ppa:ansible/ansible
    apt-get install -y ansible

    # Install jq and other useful tools
    apt-get install -y jq git unzip

    # Create deployment directory
    mkdir -p /opt/terraform
    chown hermes-admin:hermes-admin /opt/terraform

    # Log completion
    echo "Azure deployment tools installed successfully" > /var/log/deploy-setup.log
    date >> /var/log/deploy-setup.log
    terraform version >> /var/log/deploy-setup.log
    ansible --version >> /var/log/deploy-setup.log
    az version >> /var/log/deploy-setup.log
  EOF
  )

  tags = {
    Environment = "Homelab"
    Purpose     = "Azure-Deployment"
    ManagedBy   = "Terraform"
  }
}

# Role assignment - Contributor on subscription
resource "azurerm_role_assignment" "contributor" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_linux_virtual_machine.ubuntu_deploy.identity[0].principal_id
}

# Role assignment - User Access Administrator (for assigning roles to other resources)
resource "azurerm_role_assignment" "user_access_admin" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "User Access Administrator"
  principal_id         = azurerm_linux_virtual_machine.ubuntu_deploy.identity[0].principal_id
}

# Save private key to local file
resource "local_file" "ssh_private_key" {
  content         = tls_private_key.ssh.private_key_pem
  filename        = "${path.module}/ubuntu-deploy-vm.pem"
  file_permission = "0600"
}
