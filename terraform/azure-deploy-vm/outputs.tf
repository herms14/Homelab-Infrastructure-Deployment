output "vm_id" {
  description = "Ubuntu deployment VM ID"
  value       = azurerm_linux_virtual_machine.ubuntu_deploy.id
}

output "vm_name" {
  description = "Ubuntu deployment VM name"
  value       = azurerm_linux_virtual_machine.ubuntu_deploy.name
}

output "private_ip" {
  description = "Private IP address"
  value       = azurerm_network_interface.ubuntu_deploy.private_ip_address
}

output "managed_identity_principal_id" {
  description = "Managed identity principal ID"
  value       = azurerm_linux_virtual_machine.ubuntu_deploy.identity[0].principal_id
}

output "ssh_private_key_path" {
  description = "Path to SSH private key"
  value       = local_file.ssh_private_key.filename
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = "ssh -i ${local_file.ssh_private_key.filename} hermes-admin@${azurerm_network_interface.ubuntu_deploy.private_ip_address}"
}

output "ssh_private_key" {
  description = "SSH private key (save this!)"
  value       = tls_private_key.ssh.private_key_pem
  sensitive   = true
}
