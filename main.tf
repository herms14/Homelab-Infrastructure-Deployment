# Main Terraform configuration
# Dynamic VM deployment with auto-incrementing hostnames and IPs

# Define your VM groups here
locals {
  vm_groups = {
    # Ansible Control Nodes - VLAN 20
    ansible-control = {
      count         = 2
      starting_ip   = "192.168.20.50"
      starting_node = "node02" # First on node02, second on node03
      template      = "ubuntu-24.04-cloudinit-template"
      cores         = 4     # Default: 4 cores
      sockets       = 1     # Default: 1 socket
      memory        = 8192  # Default: 8GB
      disk_size     = "20G" # Default: 20GB
      storage       = "VMDisks"
      vlan_tag      = null # null for VLAN 20
      gateway       = "192.168.20.1"
      nameserver    = "192.168.91.30"
    }
  }

  # Generate flat map of all VMs to create
  vms = flatten([
    for vm_prefix, config in local.vm_groups : [
      for i in range(1, config.count + 1) : {
        key        = "${vm_prefix}${format("%02d", i)}"
        vm_name    = "${vm_prefix}${format("%02d", i)}"
        ip_address = join(".", concat(slice(split(".", config.starting_ip), 0, 3), [tonumber(split(".", config.starting_ip)[3]) + i - 1]))
        # Auto-increment target_node if starting_node is specified
        target_node = can(config.starting_node) ? (
          can(regex("^node(\\d+)$", config.starting_node)) ?
          "node${format("%02d", tonumber(regex("\\d+", config.starting_node)) + i - 1)}" :
          config.starting_node
        ) : var.default_node
        template   = config.template
        cores      = config.cores
        sockets    = config.sockets
        memory     = config.memory
        disk_size  = config.disk_size
        storage    = config.storage
        vlan_tag   = config.vlan_tag
        gateway    = config.gateway
        nameserver = config.nameserver
      }
    ]
  ])

  # Convert to map for for_each
  vms_map = { for vm in local.vms : vm.key => vm }
}

# Create all VMs using for_each
module "vms" {
  source   = "./modules/linux-vm"
  for_each = local.vms_map

  # VM Identification
  vm_name       = each.value.vm_name
  target_node   = each.value.target_node
  template_name = each.value.template

  # Resources
  cores     = each.value.cores
  sockets   = each.value.sockets
  memory    = each.value.memory
  disk_size = each.value.disk_size

  # Storage
  storage = each.value.storage

  # Network Configuration
  network_bridge = "vmbr0"
  vlan_tag       = each.value.vlan_tag
  ip_address     = each.value.ip_address
  subnet_mask    = 24
  gateway        = each.value.gateway
  nameserver     = each.value.nameserver

  # Cloud-Init
  ci_user  = var.ci_user
  ssh_keys = var.ssh_public_key

  # VM Behavior
  onboot             = true
  qemu_agent_enabled = true

}
