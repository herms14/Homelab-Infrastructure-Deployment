output "nat_gateway_id" {
  description = "NAT Gateway ID"
  value       = azurerm_nat_gateway.nat.id
}

output "nat_gateway_public_ip" {
  description = "Public IP address for NAT Gateway"
  value       = azurerm_public_ip.nat.ip_address
}

output "associated_subnet" {
  description = "Subnet associated with NAT Gateway"
  value       = data.azurerm_subnet.subnet.name
}
