"""
Sentinel Bot Configuration
Loads environment variables and provides configuration access.
"""

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class DiscordConfig:
    token: str
    guild_id: Optional[int]

    # Channel names (will be resolved to IDs at runtime)
    channel_container_updates: str
    channel_media_downloads: str
    channel_onboarding: str
    channel_argus: str
    channel_project_management: str
    channel_claude_tasks: str
    channel_announcements: str


@dataclass
class APIConfig:
    # Radarr
    radarr_url: str
    radarr_api_key: str

    # Sonarr
    sonarr_url: str
    sonarr_api_key: str

    # Jellyseerr
    jellyseerr_url: str
    jellyseerr_api_key: str

    # Jellyfin
    jellyfin_url: str
    jellyfin_api_key: str

    # GitLab
    gitlab_url: str
    gitlab_token: str
    gitlab_project_id: int

    # Authentik
    authentik_url: str
    authentik_token: str

    # OPNsense
    opnsense_url: str
    opnsense_api_key: str
    opnsense_api_secret: str

    # Prometheus
    prometheus_url: str


@dataclass
class SSHConfig:
    key_path: str
    user: str
    proxmox_user: str

    # Host IPs
    node01_ip: str
    node02_ip: str
    node03_ip: str
    docker_utilities_ip: str
    docker_media_ip: str
    docker_glance_ip: str
    docker_bots_ip: str
    traefik_ip: str
    authentik_ip: str
    ansible_ip: str


@dataclass
class WebhookConfig:
    port: int
    api_key: str


@dataclass
class DatabaseConfig:
    path: str


@dataclass
class Config:
    discord: DiscordConfig
    api: APIConfig
    ssh: SSHConfig
    webhook: WebhookConfig
    database: DatabaseConfig
    domain: str


def load_config() -> Config:
    """Load configuration from environment variables."""

    discord = DiscordConfig(
        token=os.environ.get('DISCORD_TOKEN', ''),
        guild_id=int(os.environ.get('DISCORD_GUILD_ID') or 0) or None,
        channel_container_updates=os.environ.get('CHANNEL_CONTAINER_UPDATES', 'container-updates'),
        channel_media_downloads=os.environ.get('CHANNEL_MEDIA_DOWNLOADS', 'media-downloads'),
        channel_onboarding=os.environ.get('CHANNEL_ONBOARDING', 'new-service-onboarding-workflow'),
        channel_argus=os.environ.get('CHANNEL_ARGUS', 'argus-assistant'),
        channel_project_management=os.environ.get('CHANNEL_PROJECT_MANAGEMENT', 'project-management'),
        channel_claude_tasks=os.environ.get('CHANNEL_CLAUDE_TASKS', 'claude-tasks'),
        channel_announcements=os.environ.get('CHANNEL_ANNOUNCEMENTS', 'announcements'),
    )

    api = APIConfig(
        radarr_url=os.environ.get('RADARR_URL', 'http://192.168.40.11:7878'),
        radarr_api_key=os.environ.get('RADARR_API_KEY', ''),
        sonarr_url=os.environ.get('SONARR_URL', 'http://192.168.40.11:8989'),
        sonarr_api_key=os.environ.get('SONARR_API_KEY', ''),
        jellyseerr_url=os.environ.get('JELLYSEERR_URL', 'http://192.168.40.11:5056'),
        jellyseerr_api_key=os.environ.get('JELLYSEERR_API_KEY', ''),
        jellyfin_url=os.environ.get('JELLYFIN_URL', 'https://jellyfin.hrmsmrflrii.xyz'),
        jellyfin_api_key=os.environ.get('JELLYFIN_API_KEY', ''),
        gitlab_url=os.environ.get('GITLAB_URL', 'https://gitlab.hrmsmrflrii.xyz'),
        gitlab_token=os.environ.get('GITLAB_TOKEN', ''),
        gitlab_project_id=int(os.environ.get('GITLAB_PROJECT_ID', 2)),
        authentik_url=os.environ.get('AUTHENTIK_URL', 'http://192.168.40.21:9000'),
        authentik_token=os.environ.get('AUTHENTIK_TOKEN', ''),
        opnsense_url=os.environ.get('OPNSENSE_URL', 'https://192.168.91.30'),
        opnsense_api_key=os.environ.get('OPNSENSE_API_KEY', ''),
        opnsense_api_secret=os.environ.get('OPNSENSE_API_SECRET', ''),
        prometheus_url=os.environ.get('PROMETHEUS_URL', 'http://192.168.40.13:9090'),
    )

    ssh = SSHConfig(
        key_path=os.environ.get('SSH_KEY_PATH', '/root/.ssh/homelab_ed25519'),
        user=os.environ.get('SSH_USER', 'hermes-admin'),
        proxmox_user='root',
        node01_ip=os.environ.get('PROXMOX_NODE01_IP', '192.168.20.20'),
        node02_ip=os.environ.get('PROXMOX_NODE02_IP', '192.168.20.21'),
        node03_ip=os.environ.get('PROXMOX_NODE03_IP', '192.168.20.22'),
        docker_utilities_ip=os.environ.get('DOCKER_UTILITIES_IP', '192.168.40.13'),
        docker_media_ip=os.environ.get('DOCKER_MEDIA_IP', '192.168.40.11'),
        docker_glance_ip=os.environ.get('DOCKER_GLANCE_IP', '192.168.40.12'),
        docker_bots_ip=os.environ.get('DOCKER_BOTS_IP', '192.168.40.14'),
        traefik_ip=os.environ.get('TRAEFIK_IP', '192.168.40.20'),
        authentik_ip=os.environ.get('AUTHENTIK_IP', '192.168.40.21'),
        ansible_ip=os.environ.get('ANSIBLE_IP', '192.168.20.30'),
    )

    webhook = WebhookConfig(
        port=int(os.environ.get('WEBHOOK_PORT', 5050)),
        api_key=os.environ.get('API_KEY', 'sentinel-secret-key'),
    )

    database = DatabaseConfig(
        path=os.environ.get('DB_PATH', '/app/data/sentinel.db'),
    )

    return Config(
        discord=discord,
        api=api,
        ssh=ssh,
        webhook=webhook,
        database=database,
        domain=os.environ.get('DOMAIN', 'hrmsmrflrii.xyz'),
    )


# Container to host mapping
CONTAINER_HOSTS = {
    # docker-vm-core-utilities01 (192.168.40.13)
    'grafana': '192.168.40.13',
    'prometheus': '192.168.40.13',
    'uptime-kuma': '192.168.40.13',
    'speedtest-tracker': '192.168.40.13',
    'n8n': '192.168.40.13',
    'jaeger': '192.168.40.13',
    'cadvisor': '192.168.40.13',
    'sentinel-bot': '192.168.40.13',
    'life-progress': '192.168.40.13',
    'karakeep': '192.168.40.13',
    'wizarr': '192.168.40.13',
    'tracearr': '192.168.40.13',
    'paperless': '192.168.40.13',
    'pbs-exporter': '192.168.40.13',
    'pve-exporter': '192.168.40.13',
    'snmp-exporter': '192.168.40.13',
    'homelab-chronicle': '192.168.40.13',
    'power-control-api': '192.168.40.13',
    'steam-stats': '192.168.40.13',
    'gaming-pc-stats': '192.168.40.13',

    # docker-vm-media01 (192.168.40.11)
    'jellyfin': '192.168.40.11',
    'radarr': '192.168.40.11',
    'sonarr': '192.168.40.11',
    'lidarr': '192.168.40.11',
    'prowlarr': '192.168.40.11',
    'bazarr': '192.168.40.11',
    'jellyseerr': '192.168.40.11',
    'overseerr': '192.168.40.11',
    'tdarr': '192.168.40.11',
    'autobrr': '192.168.40.11',
    'deluge': '192.168.40.11',
    'sabnzbd': '192.168.40.11',
    'metube': '192.168.40.11',

    # docker-lxc-glance (192.168.40.12)
    'glance': '192.168.40.12',
    'media-stats-api': '192.168.40.12',
    'reddit-manager': '192.168.40.12',
    'nba-stats-api': '192.168.40.12',
    'pihole-stats-api': '192.168.40.12',
    'proxmox-nodes-api': '192.168.40.12',

    # traefik-vm01 (192.168.40.20)
    'traefik': '192.168.40.20',

    # authentik-vm01 (192.168.40.21)
    'authentik-server': '192.168.40.21',
    'authentik-worker': '192.168.40.21',

    # immich-vm01 (192.168.40.22)
    'immich-server': '192.168.40.22',
    'immich-ml': '192.168.40.22',
}

# VM host mapping (for apt updates)
VM_HOSTS = {
    'docker-utilities': '192.168.40.13',
    'docker-media': '192.168.40.11',
    'traefik': '192.168.40.20',
    'authentik': '192.168.40.21',
    'immich': '192.168.40.22',
    'gitlab': '192.168.40.23',
    'gitlab-runner': '192.168.40.24',
    'ansible': '192.168.20.30',
}

# Proxmox nodes
PROXMOX_NODES = {
    'node01': '192.168.20.20',
    'node02': '192.168.20.21',
    'node03': '192.168.20.22',
}

# LXC Container mapping (ctid -> (node_ip, name))
LXC_CONTAINERS = {
    100: ('192.168.20.20', 'pi-hole'),
    101: ('192.168.20.20', 'docker-lxc-glance'),
    # Add more LXC containers as needed
}

# Wake-on-LAN MAC addresses for nodes
WOL_MAC_ADDRESSES = {
    'node01': 'TBD',  # Fill in actual MAC address
    'node02': 'TBD',  # Fill in actual MAC address
    'node03': 'TBD',  # Fill in actual MAC address
}

# WoL broadcast address
WOL_BROADCAST = '192.168.20.255'

# Node shutdown order (services first, then infrastructure)
NODE_SHUTDOWN_ORDER = ['node02', 'node03', 'node01']

# Node startup order (infrastructure first, then services)
NODE_STARTUP_ORDER = ['node01', 'node02', 'node03']

# LXC startup order (name, node_ip, ctid) - Pi-hole first for DNS
LXC_STARTUP_ORDER = [
    ('pi-hole', '192.168.20.20', 100),
    ('docker-lxc-glance', '192.168.20.20', 101),
    # Add more in startup priority order
]

# Critical LXCs that should be kept running (name -> (node_ip, ctid))
CRITICAL_LXCS = {
    'pi-hole': ('192.168.20.20', 100),
}

# Compose directory mapping for container updates
# Maps container names to their docker-compose directories
COMPOSE_DIRS = {
    # docker-vm-core-utilities01 (192.168.40.13)
    'grafana': '/opt/docker/monitoring',
    'prometheus': '/opt/docker/monitoring',
    'uptime-kuma': '/opt/docker/uptime-kuma',
    'speedtest-tracker': '/opt/docker/speedtest-tracker',
    'n8n': '/opt/docker/n8n',
    'jaeger': '/opt/docker/monitoring',
    'cadvisor': '/opt/docker/monitoring',
    'sentinel-bot': '/opt/sentinel-bot',
    'life-progress': '/opt/docker/life-progress',
    'karakeep': '/opt/docker/karakeep',
    'wizarr': '/opt/docker/wizarr',
    'tracearr': '/opt/docker/tracearr',
    'paperless': '/opt/docker/paperless',
    'pbs-exporter': '/opt/docker/monitoring',
    'pve-exporter': '/opt/docker/monitoring',
    'snmp-exporter': '/opt/docker/monitoring',
    'homelab-chronicle': '/opt/docker/homelab-chronicle',
    'power-control-api': '/opt/docker/power-control-api',
    'steam-stats': '/opt/docker/steam-stats',
    'gaming-pc-stats': '/opt/docker/gaming-pc-stats',

    # docker-vm-media01 (192.168.40.11)
    'jellyfin': '/opt/docker/media',
    'radarr': '/opt/docker/media',
    'sonarr': '/opt/docker/media',
    'lidarr': '/opt/docker/media',
    'prowlarr': '/opt/docker/media',
    'bazarr': '/opt/docker/media',
    'jellyseerr': '/opt/docker/media',
    'overseerr': '/opt/docker/media',
    'tdarr': '/opt/docker/tdarr',
    'autobrr': '/opt/docker/autobrr',
    'deluge': '/opt/docker/media',
    'sabnzbd': '/opt/docker/media',
    'metube': '/opt/docker/metube',

    # docker-lxc-glance (192.168.40.12)
    'glance': '/opt/glance',
    'media-stats-api': '/opt/glance',
    'reddit-manager': '/opt/glance',
    'nba-stats-api': '/opt/glance',
    'pihole-stats-api': '/opt/glance',
    'proxmox-nodes-api': '/opt/glance',

    # traefik-vm01 (192.168.40.20)
    'traefik': '/opt/docker/traefik',

    # authentik-vm01 (192.168.40.21)
    'authentik-server': '/opt/docker/authentik',
    'authentik-worker': '/opt/docker/authentik',

    # immich-vm01 (192.168.40.22)
    'immich-server': '/opt/docker/immich',
    'immich-ml': '/opt/docker/immich',
}
