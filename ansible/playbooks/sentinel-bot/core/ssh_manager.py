"""
Sentinel Bot SSH Manager
Async SSH client for infrastructure management.
"""

import logging
import asyncio
import asyncssh
from typing import Optional, Tuple, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger('sentinel.ssh')


@dataclass
class SSHResult:
    """Result of an SSH command execution."""
    success: bool
    stdout: str
    stderr: str
    exit_code: int

    @property
    def output(self) -> str:
        """Get combined output (stdout preferred, stderr as fallback)."""
        return self.stdout.strip() or self.stderr.strip()


class SSHManager:
    """Async SSH manager for infrastructure commands."""

    def __init__(self, ssh_config):
        self.config = ssh_config
        self._connections: Dict[str, asyncssh.SSHClientConnection] = {}

    @property
    def key_path(self) -> str:
        return self.config.key_path

    @property
    def user(self) -> str:
        return self.config.user

    @property
    def proxmox_user(self) -> str:
        return self.config.proxmox_user

    async def _get_connection(
        self,
        host: str,
        user: str = None,
        force_new: bool = False
    ) -> asyncssh.SSHClientConnection:
        """Get or create an SSH connection to a host."""
        user = user or self.user
        cache_key = f"{user}@{host}"

        # Check for existing connection
        if not force_new and cache_key in self._connections:
            conn = self._connections[cache_key]
            # Verify connection is still alive
            try:
                # Quick test
                await asyncio.wait_for(conn.run('echo ok', check=False), timeout=5)
                return conn
            except Exception:
                # Connection dead, remove from cache
                del self._connections[cache_key]

        # Create new connection
        try:
            conn = await asyncssh.connect(
                host,
                username=user,
                client_keys=[self.key_path],
                known_hosts=None,  # Accept all host keys
                connect_timeout=10,
            )
            self._connections[cache_key] = conn
            logger.debug(f"SSH connected to {cache_key}")
            return conn
        except asyncssh.Error as e:
            logger.error(f"SSH connection failed to {cache_key}: {e}")
            raise

    async def run(
        self,
        host: str,
        command: str,
        user: str = None,
        timeout: int = 60
    ) -> SSHResult:
        """
        Execute a command on a remote host.

        Args:
            host: Target host IP or hostname
            command: Command to execute
            user: SSH user (defaults to config.user)
            timeout: Command timeout in seconds

        Returns:
            SSHResult with output and status
        """
        user = user or self.user

        try:
            conn = await self._get_connection(host, user)
            result = await asyncio.wait_for(
                conn.run(command, check=False),
                timeout=timeout
            )

            return SSHResult(
                success=result.exit_status == 0,
                stdout=result.stdout or '',
                stderr=result.stderr or '',
                exit_code=result.exit_status or 0
            )
        except asyncio.TimeoutError:
            logger.error(f"SSH command timeout on {host}: {command[:50]}...")
            return SSHResult(
                success=False,
                stdout='',
                stderr=f'Command timed out after {timeout}s',
                exit_code=-1
            )
        except asyncssh.Error as e:
            logger.error(f"SSH error on {host}: {e}")
            return SSHResult(
                success=False,
                stdout='',
                stderr=str(e),
                exit_code=-1
            )
        except Exception as e:
            logger.error(f"Unexpected SSH error on {host}: {e}")
            return SSHResult(
                success=False,
                stdout='',
                stderr=str(e),
                exit_code=-1
            )

    async def run_proxmox(
        self,
        node_ip: str,
        command: str,
        timeout: int = 60
    ) -> SSHResult:
        """Execute a command on a Proxmox node as root."""
        return await self.run(node_ip, command, user=self.proxmox_user, timeout=timeout)

    async def close_all(self) -> None:
        """Close all cached SSH connections."""
        for key, conn in self._connections.items():
            try:
                conn.close()
                logger.debug(f"Closed SSH connection: {key}")
            except Exception as e:
                logger.warning(f"Error closing connection {key}: {e}")

        self._connections.clear()
        logger.info("All SSH connections closed")

    # ==================== Docker Commands ====================

    async def docker_ps(self, host: str) -> SSHResult:
        """List running Docker containers."""
        return await self.run(host, 'docker ps --format "{{.Names}}\t{{.Status}}\t{{.Image}}"')

    async def docker_ps_all(self, host: str) -> SSHResult:
        """List all Docker containers."""
        return await self.run(host, 'docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.Image}}"')

    async def docker_restart(self, host: str, container: str) -> SSHResult:
        """Restart a Docker container."""
        return await self.run(host, f'docker restart {container}')

    async def docker_stop(self, host: str, container: str) -> SSHResult:
        """Stop a Docker container."""
        return await self.run(host, f'docker stop {container}')

    async def docker_start(self, host: str, container: str) -> SSHResult:
        """Start a Docker container."""
        return await self.run(host, f'docker start {container}')

    async def docker_logs(self, host: str, container: str, tail: int = 50) -> SSHResult:
        """Get Docker container logs."""
        return await self.run(host, f'docker logs {container} --tail {tail}')

    async def docker_pull(self, host: str, container: str) -> SSHResult:
        """Pull latest image for a container."""
        # Get current image
        result = await self.run(host, f'docker inspect {container} --format "{{{{.Config.Image}}}}"')
        if not result.success:
            return result

        image = result.output
        return await self.run(host, f'docker pull {image}', timeout=300)

    async def docker_compose_up(self, host: str, compose_dir: str) -> SSHResult:
        """Run docker compose up -d in a directory."""
        return await self.run(host, f'cd {compose_dir} && docker compose up -d', timeout=120)

    async def docker_compose_down(self, host: str, compose_dir: str) -> SSHResult:
        """Run docker compose down in a directory."""
        return await self.run(host, f'cd {compose_dir} && docker compose down')

    async def docker_compose_pull(self, host: str, compose_dir: str) -> SSHResult:
        """Pull images for a docker compose project."""
        return await self.run(host, f'cd {compose_dir} && docker compose pull', timeout=300)

    async def docker_compose_pull_service(self, host: str, compose_dir: str, service: str) -> SSHResult:
        """Pull image for a specific service in a docker compose project."""
        return await self.run(host, f'cd {compose_dir} && docker compose pull {service}', timeout=300)

    async def docker_compose_recreate(self, host: str, compose_dir: str, service: str) -> SSHResult:
        """
        Recreate a specific service container with pulled image.
        Uses --force-recreate to ensure the new image is used.
        """
        return await self.run(
            host,
            f'cd {compose_dir} && docker compose up -d --force-recreate {service}',
            timeout=180
        )

    # ==================== Proxmox Commands ====================

    async def pve_node_status(self, node_ip: str) -> SSHResult:
        """Get Proxmox node status."""
        return await self.run_proxmox(node_ip, 'pvesh get /nodes/$(hostname)/status --output-format json')

    async def pve_list_vms(self, node_ip: str) -> SSHResult:
        """List VMs on a Proxmox node."""
        return await self.run_proxmox(node_ip, 'pvesh get /nodes/$(hostname)/qemu --output-format json')

    async def pve_list_lxc(self, node_ip: str) -> SSHResult:
        """List LXC containers on a Proxmox node."""
        return await self.run_proxmox(node_ip, 'pvesh get /nodes/$(hostname)/lxc --output-format json')

    async def pve_vm_status(self, node_ip: str, vmid: int) -> SSHResult:
        """Get status of a specific VM."""
        return await self.run_proxmox(
            node_ip,
            f'pvesh get /nodes/$(hostname)/qemu/{vmid}/status/current --output-format json'
        )

    async def pve_lxc_status(self, node_ip: str, ctid: int) -> SSHResult:
        """Get status of a specific LXC container."""
        return await self.run_proxmox(
            node_ip,
            f'pvesh get /nodes/$(hostname)/lxc/{ctid}/status/current --output-format json'
        )

    async def pve_start_vm(self, node_ip: str, vmid: int) -> SSHResult:
        """Start a VM."""
        return await self.run_proxmox(node_ip, f'qm start {vmid}')

    async def pve_stop_vm(self, node_ip: str, vmid: int) -> SSHResult:
        """Stop a VM."""
        return await self.run_proxmox(node_ip, f'qm stop {vmid}')

    async def pve_restart_vm(self, node_ip: str, vmid: int) -> SSHResult:
        """Restart a VM."""
        return await self.run_proxmox(node_ip, f'qm reboot {vmid}')

    async def pve_start_lxc(self, node_ip: str, ctid: int) -> SSHResult:
        """Start an LXC container."""
        return await self.run_proxmox(node_ip, f'pct start {ctid}')

    async def pve_stop_lxc(self, node_ip: str, ctid: int) -> SSHResult:
        """Stop an LXC container."""
        return await self.run_proxmox(node_ip, f'pct stop {ctid}')

    async def pve_restart_lxc(self, node_ip: str, ctid: int) -> SSHResult:
        """Restart an LXC container."""
        return await self.run_proxmox(node_ip, f'pct reboot {ctid}')

    async def pve_cluster_status(self, node_ip: str) -> SSHResult:
        """Get Proxmox cluster status."""
        return await self.run_proxmox(node_ip, 'pvecm status')

    # ==================== System Commands ====================

    async def apt_update(self, host: str) -> SSHResult:
        """Update apt package cache."""
        return await self.run(host, 'sudo apt update', timeout=120)

    async def apt_upgradable(self, host: str) -> SSHResult:
        """List upgradable packages."""
        return await self.run(host, 'apt list --upgradable 2>/dev/null | tail -n +2')

    async def apt_upgrade(self, host: str) -> SSHResult:
        """Upgrade all packages (non-interactive)."""
        return await self.run(
            host,
            'sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y',
            timeout=600
        )

    async def system_uptime(self, host: str) -> SSHResult:
        """Get system uptime."""
        return await self.run(host, 'uptime -p')

    async def disk_usage(self, host: str) -> SSHResult:
        """Get disk usage summary."""
        return await self.run(host, 'df -h / | tail -1')

    async def memory_usage(self, host: str) -> SSHResult:
        """Get memory usage."""
        return await self.run(host, 'free -h | grep Mem')

    # ==================== File Operations ====================

    async def read_file(self, host: str, path: str) -> SSHResult:
        """Read a file from remote host."""
        return await self.run(host, f'cat {path}')

    async def file_exists(self, host: str, path: str) -> bool:
        """Check if a file exists on remote host."""
        result = await self.run(host, f'test -f {path} && echo "yes" || echo "no"')
        return result.output == 'yes'

    async def write_file(self, host: str, path: str, content: str) -> SSHResult:
        """Write content to a file on remote host."""
        # Escape content for shell
        escaped = content.replace("'", "'\\''")
        return await self.run(host, f"echo '{escaped}' > {path}")

    # ==================== Power Management Commands ====================

    async def pve_is_node_online(self, node_ip: str, timeout: int = 5) -> bool:
        """Check if a Proxmox node is reachable and responding."""
        try:
            result = await self.run_proxmox(node_ip, 'echo ok', timeout=timeout)
            return result.success and 'ok' in result.output
        except Exception:
            return False

    async def pve_get_running_vms(self, node_ip: str) -> list:
        """Get list of running VMs on a Proxmox node."""
        result = await self.run_proxmox(
            node_ip,
            'pvesh get /nodes/$(hostname)/qemu --output-format json'
        )
        if not result.success:
            return []

        try:
            import json
            vms = json.loads(result.stdout)
            return [
                {'vmid': vm['vmid'], 'name': vm.get('name', f'VM{vm["vmid"]}'), 'status': vm.get('status', 'unknown')}
                for vm in vms if vm.get('status') == 'running'
            ]
        except (json.JSONDecodeError, KeyError):
            return []

    async def pve_get_all_vms(self, node_ip: str) -> list:
        """Get list of all VMs (including stopped) on a Proxmox node."""
        result = await self.run_proxmox(
            node_ip,
            'pvesh get /nodes/$(hostname)/qemu --output-format json'
        )
        if not result.success:
            return []

        try:
            import json
            vms = json.loads(result.stdout)
            return [
                {'vmid': vm['vmid'], 'name': vm.get('name', f'VM{vm["vmid"]}'), 'status': vm.get('status', 'unknown')}
                for vm in vms
            ]
        except (json.JSONDecodeError, KeyError):
            return []

    async def pve_get_running_lxcs(self, node_ip: str) -> list:
        """Get list of running LXC containers on a Proxmox node."""
        result = await self.run_proxmox(
            node_ip,
            'pvesh get /nodes/$(hostname)/lxc --output-format json'
        )
        if not result.success:
            return []

        try:
            import json
            lxcs = json.loads(result.stdout)
            return [
                {'ctid': lxc['vmid'], 'name': lxc.get('name', f'CT{lxc["vmid"]}'), 'status': lxc.get('status', 'unknown')}
                for lxc in lxcs if lxc.get('status') == 'running'
            ]
        except (json.JSONDecodeError, KeyError):
            return []

    async def lxc_is_running(self, node_ip: str, ctid: int) -> bool:
        """Check if a specific LXC container is running."""
        result = await self.pve_lxc_status(node_ip, ctid)
        if not result.success:
            return False

        try:
            import json
            data = json.loads(result.stdout)
            return data.get('status') == 'running'
        except (json.JSONDecodeError, KeyError):
            return False

    async def pve_shutdown_node(self, node_ip: str) -> SSHResult:
        """Shutdown a Proxmox node."""
        return await self.run_proxmox(node_ip, 'shutdown -h now', timeout=30)

    async def send_wol(self, mac_address: str, broadcast: str = '255.255.255.255') -> SSHResult:
        """
        Send a Wake-on-LAN magic packet.
        Requires wakeonlan or etherwake to be installed on a running host.
        """
        # Try wakeonlan first, then etherwake
        # This runs from docker-utilities which should be online
        host = self.config.docker_utilities_ip

        # Try wakeonlan command
        result = await self.run(
            host,
            f'wakeonlan -i {broadcast} {mac_address} 2>/dev/null || etherwake -b {mac_address} 2>/dev/null || echo "WoL command not available"'
        )
        return result

    async def wait_for_node_online(self, node_ip: str, timeout: int = 300) -> bool:
        """
        Wait for a node to come online (respond to SSH).

        Args:
            node_ip: IP address of the node
            timeout: Maximum seconds to wait (default 5 minutes)

        Returns:
            True if node came online, False if timeout
        """
        import time
        start = time.time()
        check_interval = 10  # Check every 10 seconds

        while (time.time() - start) < timeout:
            if await self.pve_is_node_online(node_ip):
                return True
            await asyncio.sleep(check_interval)

        return False
