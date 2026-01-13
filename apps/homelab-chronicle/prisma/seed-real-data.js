const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Real timeline events from Hermes's Homelab documentation
const events = [
  // ============================================
  // INFRASTRUCTURE - PROXMOX CLUSTER
  // ============================================
  {
    title: 'MorpheusCluster Created - Proxmox VE 9.1.2',
    date: new Date('2024-10-15'),
    category: 'infrastructure',
    source: 'manual',
    infrastructureNode: 'node01',
    tags: JSON.stringify(['proxmox', 'cluster', 'virtualization', 'ha']),
    services: JSON.stringify(['Proxmox VE']),
    content: `<h3>Proxmox Cluster Initialization</h3>
<p>Created the MorpheusCluster - a high-availability Proxmox VE 9.1.2 cluster for homelab virtualization.</p>

<h4>Cluster Details</h4>
<ul>
  <li><strong>Cluster Name:</strong> MorpheusCluster</li>
  <li><strong>Proxmox Version:</strong> 9.1.2</li>
  <li><strong>Configuration:</strong> 3-node + Qdevice for quorum</li>
</ul>

<h4>Initial Node (node01)</h4>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>IP Address</td><td>192.168.20.20</td></tr>
  <tr><td>Tailscale IP</td><td>100.89.33.5</td></tr>
  <tr><td>Purpose</td><td>Primary VM Host (K8s, LXCs, Core Services)</td></tr>
  <tr><td>Node Exporter</td><td>192.168.20.20:9100</td></tr>
</table>

<h4>VM Configuration Standards</h4>
<ul>
  <li><strong>CPU:</strong> 1 socket, 4 cores (default)</li>
  <li><strong>Memory:</strong> 8GB</li>
  <li><strong>Disk:</strong> 20GB on VMDisks (NFS)</li>
  <li><strong>BIOS:</strong> UEFI (ovmf)</li>
  <li><strong>Machine:</strong> q35</li>
  <li><strong>Cloud-init:</strong> Enabled</li>
</ul>`
  },
  {
    title: 'Node02 Added to MorpheusCluster',
    date: new Date('2024-10-20'),
    category: 'infrastructure',
    source: 'manual',
    infrastructureNode: 'node02',
    tags: JSON.stringify(['proxmox', 'cluster', 'ha', 'node']),
    services: JSON.stringify(['Proxmox VE']),
    content: `<h3>Second Node Added to Cluster</h3>
<p>Added node02 to the MorpheusCluster for expanded capacity and high availability.</p>

<h4>Node02 Specifications</h4>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>IP Address</td><td>192.168.20.21</td></tr>
  <tr><td>Tailscale IP</td><td>100.96.195.27</td></tr>
  <tr><td>Purpose</td><td>Service Host (Traefik, Authentik)</td></tr>
  <tr><td>Node Exporter</td><td>192.168.20.21:9100</td></tr>
  <tr><td>API Endpoint</td><td>https://192.168.20.21:8006/api2/json</td></tr>
</table>

<h4>Cluster Status After Join</h4>
<pre>pvecm status
# Quorum: 2 nodes
# Cluster active and healthy</pre>`
  },
  {
    title: 'Node03 Added - Ryzen 9 Desktop Node',
    date: new Date('2026-01-11'),
    category: 'infrastructure',
    source: 'manual',
    infrastructureNode: 'node03',
    tags: JSON.stringify(['proxmox', 'cluster', 'ryzen', 'desktop', 'power-management']),
    services: JSON.stringify(['Proxmox VE', 'GitLab', 'Immich']),
    content: `<h3>Desktop PC Added as Third Cluster Node</h3>
<p>Added a Ryzen 9 5900XT desktop PC as node03, completing the 3-node HA cluster.</p>

<h4>Node03 Specifications</h4>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>IP Address</td><td>192.168.20.22</td></tr>
  <tr><td>Tailscale IP</td><td>100.88.228.34</td></tr>
  <tr><td>CPU</td><td>AMD Ryzen 9 5900XT</td></tr>
  <tr><td>Purpose</td><td>GitLab, Immich, Syslog Server</td></tr>
</table>

<h4>Power Management Configuration</h4>
<p>Desktop node optimized for power efficiency:</p>
<table>
  <tr><th>Setting</th><th>Value</th><th>Effect</th></tr>
  <tr><td>CPU Governor</td><td>powersave</td><td>Reduces clock speed at idle</td></tr>
  <tr><td>AMD P-State</td><td>amd-pstate-epp</td><td>Modern AMD power management</td></tr>
  <tr><td>Max C-State</td><td>9</td><td>Enables deep sleep states</td></tr>
  <tr><td>SATA Policy</td><td>med_power_with_dipm</td><td>SATA link power management</td></tr>
  <tr><td>HDD Spindown</td><td>20 minutes</td><td>Spins down 4TB HDD after idle</td></tr>
</table>

<p><strong>Expected idle power:</strong> ~40-60W (down from ~100-150W)</p>

<h4>GRUB Configuration</h4>
<pre>GRUB_CMDLINE_LINUX_DEFAULT="quiet amd_pstate=active processor.max_cstate=9"</pre>`
  },

  // ============================================
  // INFRASTRUCTURE - ANSIBLE & AUTOMATION
  // ============================================
  {
    title: 'Ansible Controller Deployed',
    date: new Date('2024-11-01'),
    category: 'infrastructure',
    source: 'manual',
    infrastructureNode: 'ansible-controller01',
    tags: JSON.stringify(['ansible', 'automation', 'terraform', 'iac']),
    services: JSON.stringify(['Ansible', 'Terraform']),
    content: `<h3>Central Automation Controller</h3>
<p>Deployed ansible-controller01 as the central automation hub for infrastructure management.</p>

<h4>Controller Specifications</h4>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>IP Address</td><td>192.168.20.30</td></tr>
  <tr><td>VLAN</td><td>20 (Infrastructure)</td></tr>
  <tr><td>Template</td><td>tpl-ubuntuv24.04-v1</td></tr>
  <tr><td>User</td><td>hermes-admin</td></tr>
</table>

<h4>Installed Tools</h4>
<ul>
  <li><strong>Ansible:</strong> Infrastructure automation</li>
  <li><strong>Terraform:</strong> Proxmox provider v3.0.2-rc06</li>
  <li><strong>Packer:</strong> VM template creation</li>
  <li><strong>Docker:</strong> Container deployments</li>
</ul>

<h4>SSH Access</h4>
<pre>ssh hermes-admin@192.168.20.30
# Or via alias:
ssh ansible</pre>`
  },

  // ============================================
  // SERVICES - TRAEFIK REVERSE PROXY
  // ============================================
  {
    title: 'Traefik v3 Reverse Proxy Deployed',
    date: new Date('2024-12-19'),
    category: 'service',
    source: 'ansible',
    infrastructureNode: 'traefik-lxc',
    tags: JSON.stringify(['traefik', 'reverse-proxy', 'ssl', 'letsencrypt', 'docker']),
    services: JSON.stringify(['Traefik']),
    content: `<h3>Central Reverse Proxy with Let's Encrypt SSL</h3>
<p>Deployed Traefik v3.2 as the central reverse proxy for all homelab services with automatic SSL certificate management.</p>

<h4>Deployment Details</h4>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>Host</td><td>traefik-lxc (LXC 203)</td></tr>
  <tr><td>IP Address</td><td>192.168.40.20</td></tr>
  <tr><td>Traefik Version</td><td>v3.2</td></tr>
  <tr><td>SSL Provider</td><td>Let's Encrypt (Cloudflare DNS-01)</td></tr>
  <tr><td>Certificate Type</td><td>Wildcard (*.hrmsmrflrii.xyz)</td></tr>
</table>

<h4>Docker Compose Configuration</h4>
<pre>services:
  traefik:
    container_name: traefik
    image: traefik:v3.2
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    ports:
      - "80:80"    # HTTP (redirects to HTTPS)
      - "443:443"  # HTTPS
      - "8080:8080" # Dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./config/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./config/dynamic:/etc/traefik/dynamic:ro
      - ./certs:/certs
      - ./logs:/logs</pre>

<h4>Entrypoints Configuration</h4>
<ul>
  <li><strong>web (80):</strong> HTTP - auto-redirects to HTTPS</li>
  <li><strong>websecure (443):</strong> HTTPS with TLS</li>
  <li><strong>dashboard (8080):</strong> Traefik dashboard</li>
</ul>

<h4>Access URLs</h4>
<ul>
  <li>Dashboard: <a href="https://traefik.hrmsmrflrii.xyz">https://traefik.hrmsmrflrii.xyz</a></li>
  <li>Metrics: http://192.168.40.20:8082/metrics</li>
</ul>`
  },

  // ============================================
  // SERVICES - AUTHENTIK SSO
  // ============================================
  {
    title: 'Authentik Identity Provider Deployed',
    date: new Date('2024-12-18'),
    category: 'service',
    source: 'ansible',
    infrastructureNode: 'authentik-lxc',
    tags: JSON.stringify(['authentik', 'sso', 'identity', 'oauth', 'ldap']),
    services: JSON.stringify(['Authentik']),
    content: `<h3>Single Sign-On Identity Provider</h3>
<p>Deployed Authentik for centralized authentication and SSO across all homelab services.</p>

<h4>Deployment Details</h4>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>Host</td><td>authentik-lxc (LXC 204)</td></tr>
  <tr><td>IP Address</td><td>192.168.40.21</td></tr>
  <tr><td>Web Port</td><td>9000</td></tr>
  <tr><td>Secure Port</td><td>9443</td></tr>
</table>

<h4>Features</h4>
<ul>
  <li>OAuth2/OpenID Connect Provider</li>
  <li>SAML Provider</li>
  <li>LDAP Outpost</li>
  <li>Proxy Authentication for legacy apps</li>
  <li>Multi-factor Authentication (TOTP, WebAuthn)</li>
</ul>

<h4>Protected Services</h4>
<ul>
  <li>Grafana (OAuth2)</li>
  <li>Immich (OAuth2)</li>
  <li>GitLab (OAuth2)</li>
  <li>Proxmox (Proxy Auth)</li>
</ul>

<h4>Access URL</h4>
<p><a href="https://auth.hrmsmrflrii.xyz">https://auth.hrmsmrflrii.xyz</a></p>`
  },

  // ============================================
  // SERVICES - ARR MEDIA STACK
  // ============================================
  {
    title: 'Arr Media Stack Deployed - 14 Services',
    date: new Date('2024-12-01'),
    category: 'service',
    source: 'ansible',
    infrastructureNode: 'docker-lxc-media',
    tags: JSON.stringify(['arr-stack', 'jellyfin', 'radarr', 'sonarr', 'media', 'automation']),
    services: JSON.stringify(['Jellyfin', 'Radarr', 'Sonarr', 'Lidarr', 'Prowlarr', 'Bazarr', 'Overseerr', 'Jellyseerr', 'Tdarr', 'Autobrr', 'Deluge', 'SABnzbd']),
    content: `<h3>Complete Media Automation Stack</h3>
<p>Deployed comprehensive media management stack with 14 services for automated media acquisition, organization, and streaming.</p>

<h4>Deployment Details</h4>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>Host</td><td>docker-lxc-media (LXC 205)</td></tr>
  <tr><td>IP Address</td><td>192.168.40.11</td></tr>
  <tr><td>Config Path</td><td>/opt/arr-stack/</td></tr>
  <tr><td>Media Mount</td><td>/mnt/media (NFS from Synology)</td></tr>
</table>

<h4>Services Overview</h4>
<table>
  <tr><th>Service</th><th>Port</th><th>Purpose</th></tr>
  <tr><td>Jellyfin</td><td>8096</td><td>Media server (streaming)</td></tr>
  <tr><td>Radarr</td><td>7878</td><td>Movie management</td></tr>
  <tr><td>Sonarr</td><td>8989</td><td>TV series management</td></tr>
  <tr><td>Lidarr</td><td>8686</td><td>Music management</td></tr>
  <tr><td>Prowlarr</td><td>9696</td><td>Indexer manager</td></tr>
  <tr><td>Bazarr</td><td>6767</td><td>Subtitle management</td></tr>
  <tr><td>Overseerr</td><td>5055</td><td>Plex request management</td></tr>
  <tr><td>Jellyseerr</td><td>5056</td><td>Jellyfin request management</td></tr>
  <tr><td>Tdarr</td><td>8265</td><td>Transcoding automation</td></tr>
  <tr><td>Autobrr</td><td>7474</td><td>IRC/torrent automation</td></tr>
  <tr><td>Deluge</td><td>8112</td><td>BitTorrent client</td></tr>
  <tr><td>SABnzbd</td><td>8081</td><td>Usenet client</td></tr>
</table>

<h4>Docker Compose (Partial)</h4>
<pre>services:
  jellyfin:
    image: jellyfin/jellyfin:latest
    container_name: jellyfin
    volumes:
      - /opt/arr-stack/jellyfin/config:/config
      - /mnt/media/Movies:/data/movies:ro
      - /mnt/media/Series:/data/tvshows:ro
    ports:
      - 8096:8096

  radarr:
    image: lscr.io/linuxserver/radarr:latest
    container_name: radarr
    volumes:
      - /opt/arr-stack/radarr:/config
      - /mnt/media:/data
    ports:
      - 7878:7878</pre>

<h4>Storage Configuration</h4>
<p>All services use unified <code>/data</code> mount for hardlink support:</p>
<pre>Mount: /mnt/media (NFS from 192.168.20.31)
├── /Completed       # Download clients finished files
├── /Downloading     # Active downloads
├── /Movies          # Radarr organizes movies
├── /Series          # Sonarr organizes TV
└── /Music           # Lidarr organizes music</pre>`
  },

  // ============================================
  // SERVICES - MONITORING STACK
  // ============================================
  {
    title: 'Monitoring Stack Deployed - Grafana, Prometheus, Uptime Kuma',
    date: new Date('2024-12-21'),
    category: 'service',
    source: 'ansible',
    infrastructureNode: 'docker-vm-core-utilities01',
    tags: JSON.stringify(['monitoring', 'grafana', 'prometheus', 'uptime-kuma', 'metrics']),
    services: JSON.stringify(['Grafana', 'Prometheus', 'Uptime Kuma', 'PVE Exporter', 'SNMP Exporter']),
    content: `<h3>Complete Monitoring Solution</h3>
<p>Deployed comprehensive monitoring stack with metrics collection, visualization, and uptime monitoring.</p>

<h4>Deployment Details</h4>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>Host</td><td>docker-vm-core-utilities01</td></tr>
  <tr><td>IP Address</td><td>192.168.40.13</td></tr>
  <tr><td>Config Path</td><td>/opt/monitoring/</td></tr>
</table>

<h4>Services</h4>
<table>
  <tr><th>Service</th><th>Port</th><th>Purpose</th></tr>
  <tr><td>Uptime Kuma</td><td>3001</td><td>Service uptime monitoring</td></tr>
  <tr><td>Prometheus</td><td>9090</td><td>Metrics collection & time-series DB</td></tr>
  <tr><td>Grafana</td><td>3030</td><td>Metrics visualization & dashboards</td></tr>
  <tr><td>PVE Exporter</td><td>9221</td><td>Proxmox metrics for Prometheus</td></tr>
  <tr><td>SNMP Exporter</td><td>9116</td><td>Synology NAS metrics</td></tr>
</table>

<h4>Docker Compose Configuration</h4>
<pre>services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    ports:
      - "3001:3001"

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    command:
      - '--storage.tsdb.retention.time=30d'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3030:3000"
    environment:
      - GF_SECURITY_ALLOW_EMBEDDING=true
      - GF_AUTH_ANONYMOUS_ENABLED=true</pre>

<h4>Access URLs</h4>
<ul>
  <li><a href="https://grafana.hrmsmrflrii.xyz">https://grafana.hrmsmrflrii.xyz</a></li>
  <li><a href="https://prometheus.hrmsmrflrii.xyz">https://prometheus.hrmsmrflrii.xyz</a></li>
  <li><a href="https://uptime.hrmsmrflrii.xyz">https://uptime.hrmsmrflrii.xyz</a></li>
</ul>`
  },

  // ============================================
  // SERVICES - GLANCE DASHBOARD
  // ============================================
  {
    title: 'Glance Dashboard Deployed',
    date: new Date('2024-12-20'),
    category: 'service',
    source: 'ansible',
    infrastructureNode: 'docker-lxc-glance',
    tags: JSON.stringify(['glance', 'dashboard', 'homelab', 'monitoring']),
    services: JSON.stringify(['Glance']),
    content: `<h3>Homelab Dashboard</h3>
<p>Deployed Glance as the central homelab dashboard for monitoring services, stocks, RSS feeds, and more.</p>

<h4>Deployment Details</h4>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>Host</td><td>docker-lxc-glance (LXC 200)</td></tr>
  <tr><td>IP Address</td><td>192.168.40.12</td></tr>
  <tr><td>Port</td><td>8080</td></tr>
  <tr><td>Config</td><td>/opt/glance/config/glance.yml</td></tr>
</table>

<h4>Dashboard Features</h4>
<ul>
  <li>Service health monitoring (all Proxmox nodes, K8s cluster)</li>
  <li>Stock market tracking (BTC, MSFT, AAPL, SPY)</li>
  <li>RSS feeds (r/homelab, r/selfhosted)</li>
  <li>Network device status</li>
  <li>Media stack monitoring</li>
  <li><strong>Life Progress Widget</strong> - Year/Month/Day/Life progress bars with daily quotes</li>
  <li>Embedded Grafana dashboards (Container Status, Synology NAS, Omada Network)</li>
</ul>

<h4>Access URL</h4>
<p><a href="https://glance.hrmsmrflrii.xyz">https://glance.hrmsmrflrii.xyz</a></p>`
  },

  // ============================================
  // SERVICES - IMMICH PHOTOS
  // ============================================
  {
    title: 'Immich Photo Management Deployed',
    date: new Date('2024-12-19'),
    category: 'service',
    source: 'ansible',
    infrastructureNode: 'immich-vm01',
    tags: JSON.stringify(['immich', 'photos', 'google-photos', 'ai', 'machine-learning']),
    services: JSON.stringify(['Immich']),
    content: `<h3>Self-Hosted Google Photos Alternative</h3>
<p>Deployed Immich for self-hosted photo and video backup with AI-powered features.</p>

<h4>Deployment Details</h4>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>Host</td><td>immich-vm01</td></tr>
  <tr><td>IP Address</td><td>192.168.40.22</td></tr>
  <tr><td>Port</td><td>2283</td></tr>
</table>

<h4>Features</h4>
<ul>
  <li>Mobile app backup (iOS/Android)</li>
  <li>AI-powered face recognition</li>
  <li>Object detection and smart search</li>
  <li>Timeline view with memories</li>
  <li>Sharing and albums</li>
  <li>Raw photo support</li>
</ul>

<h4>Access URLs</h4>
<ul>
  <li>Web: <a href="https://photos.hrmsmrflrii.xyz">https://photos.hrmsmrflrii.xyz</a></li>
  <li>Mobile API: http://192.168.40.22:2283/api</li>
</ul>`
  },

  // ============================================
  // SERVICES - GITLAB
  // ============================================
  {
    title: 'GitLab CE DevOps Platform Deployed',
    date: new Date('2024-12-19'),
    category: 'service',
    source: 'ansible',
    infrastructureNode: 'gitlab-vm01',
    tags: JSON.stringify(['gitlab', 'devops', 'git', 'ci-cd', 'container-registry']),
    services: JSON.stringify(['GitLab CE']),
    content: `<h3>Self-Hosted DevOps Platform</h3>
<p>Deployed GitLab Community Edition for source control, CI/CD, and container registry.</p>

<h4>Deployment Details</h4>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>Host</td><td>gitlab-vm01</td></tr>
  <tr><td>IP Address</td><td>192.168.40.23</td></tr>
  <tr><td>Web Port</td><td>80/443</td></tr>
  <tr><td>SSH Port</td><td>2222</td></tr>
</table>

<h4>Features</h4>
<ul>
  <li>Git repository hosting</li>
  <li>CI/CD pipelines</li>
  <li>Container registry</li>
  <li>Issue tracking</li>
  <li>Wiki documentation</li>
  <li>Merge requests with code review</li>
</ul>

<h4>Access URLs</h4>
<ul>
  <li>Web: <a href="https://gitlab.hrmsmrflrii.xyz">https://gitlab.hrmsmrflrii.xyz</a></li>
  <li>SSH: ssh://git@192.168.40.23:2222</li>
</ul>`
  },

  // ============================================
  // MIGRATIONS
  // ============================================
  {
    title: 'VM to LXC Migration - Traefik, Authentik, Media',
    date: new Date('2026-01-07'),
    category: 'infrastructure',
    source: 'manual',
    tags: JSON.stringify(['migration', 'lxc', 'optimization', 'docker']),
    services: JSON.stringify(['Traefik', 'Authentik', 'Glance', 'Arr Stack']),
    content: `<h3>Major Infrastructure Migration</h3>
<p>Migrated core services from VMs to LXC containers for improved resource efficiency.</p>

<h4>Migration Summary</h4>
<table>
  <tr><th>Service</th><th>Old Host</th><th>New Host</th><th>LXC ID</th></tr>
  <tr><td>Traefik</td><td>traefik-vm01</td><td>traefik-lxc</td><td>203</td></tr>
  <tr><td>Authentik</td><td>authentik-vm01</td><td>authentik-lxc</td><td>204</td></tr>
  <tr><td>Glance</td><td>docker-vm01</td><td>docker-lxc-glance</td><td>200</td></tr>
  <tr><td>Arr Stack</td><td>docker-vm-media01</td><td>docker-lxc-media</td><td>205</td></tr>
</table>

<h4>Benefits</h4>
<ul>
  <li>Reduced memory overhead (no kernel per container)</li>
  <li>Faster startup times</li>
  <li>Better resource utilization</li>
  <li>Simplified backups</li>
</ul>

<h4>LXC Docker Configuration</h4>
<p>Required features for Docker in unprivileged LXC:</p>
<pre># /etc/pve/lxc/200.conf
features: nesting=1
lxc.apparmor.profile: unconfined</pre>`
  },

  // ============================================
  // NETWORK
  // ============================================
  {
    title: 'VLAN Architecture Implemented',
    date: new Date('2024-09-15'),
    category: 'network',
    source: 'manual',
    tags: JSON.stringify(['vlan', 'network', 'segmentation', 'omada']),
    services: JSON.stringify(['OPNsense', 'Omada Controller']),
    content: `<h3>Network Segmentation with VLANs</h3>
<p>Implemented comprehensive VLAN architecture for network segmentation and security.</p>

<h4>VLAN Configuration</h4>
<table>
  <tr><th>VLAN ID</th><th>Name</th><th>Network</th><th>Purpose</th></tr>
  <tr><td>10</td><td>Internal</td><td>192.168.10.0/24</td><td>Main LAN (workstations)</td></tr>
  <tr><td>20</td><td>Homelab</td><td>192.168.20.0/24</td><td>Proxmox, K8s, VMs</td></tr>
  <tr><td>30</td><td>IoT</td><td>192.168.30.0/24</td><td>IoT devices</td></tr>
  <tr><td>40</td><td>Production</td><td>192.168.40.0/24</td><td>Docker services</td></tr>
  <tr><td>50</td><td>Guest</td><td>192.168.50.0/24</td><td>Guest WiFi</td></tr>
  <tr><td>60</td><td>Sonos</td><td>192.168.60.0/24</td><td>Sonos speakers</td></tr>
  <tr><td>90</td><td>Management</td><td>192.168.90.0/24</td><td>Network devices</td></tr>
  <tr><td>91</td><td>Firewall</td><td>192.168.91.0/24</td><td>OPNsense</td></tr>
</table>

<h4>Key Network Devices</h4>
<ul>
  <li><strong>Core Router:</strong> ER605 v2.20 (192.168.0.1)</li>
  <li><strong>Core Switch:</strong> SG3210 (192.168.90.2)</li>
  <li><strong>Morpheus Switch:</strong> SG2210P (192.168.90.3)</li>
  <li><strong>DNS:</strong> Pi-hole (192.168.90.53) + OPNsense Unbound (192.168.91.30)</li>
</ul>`
  },

  // ============================================
  // STORAGE
  // ============================================
  {
    title: 'Synology NAS NFS Storage Configured',
    date: new Date('2024-10-01'),
    category: 'storage',
    source: 'manual',
    infrastructureNode: 'synology-nas',
    tags: JSON.stringify(['synology', 'nas', 'nfs', 'storage', 'raid']),
    services: JSON.stringify(['Synology DSM', 'Plex']),
    content: `<h3>Central NFS Storage for Homelab</h3>
<p>Configured Synology NAS as the central storage backend for Proxmox and Docker services.</p>

<h4>NAS Details</h4>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>IP Address</td><td>192.168.20.31</td></tr>
  <tr><td>DSM URL</td><td>https://192.168.20.31:5001</td></tr>
  <tr><td>Model</td><td>Synology DS923+</td></tr>
</table>

<h4>NFS Shares</h4>
<table>
  <tr><th>Share</th><th>Path</th><th>Purpose</th></tr>
  <tr><td>VMDisks</td><td>/volume1/VMDisks</td><td>Proxmox VM storage</td></tr>
  <tr><td>Proxmox-Media</td><td>/volume2/Proxmox-Media</td><td>Media files (Movies, Series, Music)</td></tr>
  <tr><td>Backups</td><td>/volume1/Backups</td><td>VM backups</td></tr>
</table>

<h4>Plex Media Server</h4>
<p>Plex runs directly on the Synology for TV apps and remote streaming:</p>
<ul>
  <li>URL: http://192.168.20.31:32400/web</li>
  <li>Media: /volume2/Proxmox-Media/</li>
</ul>`
  },

  // ============================================
  // OBSERVABILITY
  // ============================================
  {
    title: 'OpenTelemetry Observability Stack Deployed',
    date: new Date('2024-12-21'),
    category: 'service',
    source: 'ansible',
    infrastructureNode: 'docker-vm-core-utilities01',
    tags: JSON.stringify(['observability', 'otel', 'jaeger', 'tracing', 'opentelemetry']),
    services: JSON.stringify(['OTEL Collector', 'Jaeger']),
    content: `<h3>Distributed Tracing Infrastructure</h3>
<p>Deployed full OpenTelemetry stack for distributed tracing across all services.</p>

<h4>Components</h4>
<table>
  <tr><th>Service</th><th>Port</th><th>Purpose</th></tr>
  <tr><td>OTEL Collector</td><td>4317 (gRPC), 4318 (HTTP)</td><td>Trace receiver/processor</td></tr>
  <tr><td>Jaeger</td><td>16686</td><td>Distributed tracing UI</td></tr>
</table>

<h4>Trace Flow</h4>
<pre>Traefik → OTEL Collector → Jaeger → Grafana</pre>

<h4>Access URLs</h4>
<ul>
  <li>Jaeger UI: <a href="https://jaeger.hrmsmrflrii.xyz">https://jaeger.hrmsmrflrii.xyz</a></li>
  <li>Grafana (Jaeger datasource): <a href="https://grafana.hrmsmrflrii.xyz">https://grafana.hrmsmrflrii.xyz</a></li>
</ul>`
  },

  // ============================================
  // KUBERNETES
  // ============================================
  {
    title: 'Kubernetes Cluster Deployed - 3 Controllers + 6 Workers',
    date: new Date('2024-11-15'),
    category: 'infrastructure',
    source: 'ansible',
    tags: JSON.stringify(['kubernetes', 'k8s', 'containers', 'orchestration', 'ha']),
    services: JSON.stringify(['Kubernetes']),
    content: `<h3>High-Availability Kubernetes Cluster</h3>
<p>Deployed production-ready Kubernetes cluster with HA control plane.</p>

<h4>Cluster Architecture</h4>
<table>
  <tr><th>Role</th><th>Count</th><th>IP Range</th></tr>
  <tr><td>Control Plane</td><td>3</td><td>192.168.20.32-34</td></tr>
  <tr><td>Worker Nodes</td><td>6</td><td>192.168.20.40-45</td></tr>
</table>

<h4>Control Plane Nodes</h4>
<table>
  <tr><th>Node</th><th>IP</th><th>Purpose</th></tr>
  <tr><td>k8s-controller01</td><td>192.168.20.32</td><td>Primary controller</td></tr>
  <tr><td>k8s-controller02</td><td>192.168.20.33</td><td>HA controller</td></tr>
  <tr><td>k8s-controller03</td><td>192.168.20.34</td><td>HA controller</td></tr>
</table>

<h4>Worker Nodes</h4>
<table>
  <tr><th>Node</th><th>IP</th><th>Specs</th></tr>
  <tr><td>k8s-worker01-06</td><td>192.168.20.40-45</td><td>4 cores, 8GB RAM each</td></tr>
</table>

<h4>CNI & Networking</h4>
<ul>
  <li>CNI: Calico</li>
  <li>Pod Network: 10.244.0.0/16</li>
  <li>Service Network: 10.96.0.0/12</li>
</ul>`
  },

  // ============================================
  // DISCORD BOTS
  // ============================================
  {
    title: 'Sentinel Discord Bot Deployed',
    date: new Date('2025-01-05'),
    category: 'service',
    source: 'ansible',
    infrastructureNode: 'docker-vm-core-utilities01',
    tags: JSON.stringify(['discord', 'bot', 'automation', 'homelab', 'sentinel']),
    services: JSON.stringify(['Sentinel Bot']),
    content: `<h3>Consolidated Homelab Discord Bot</h3>
<p>Deployed Sentinel Bot - a comprehensive Discord bot for homelab management.</p>

<h4>Features</h4>
<ul>
  <li><strong>Infrastructure:</strong> Proxmox cluster status, VM management</li>
  <li><strong>Containers:</strong> Docker container control across hosts</li>
  <li><strong>Media:</strong> Request movies/shows, media library stats</li>
  <li><strong>Updates:</strong> Container update notifications via Watchtower</li>
  <li><strong>Tasks:</strong> Task management and scheduling</li>
</ul>

<h4>Commands</h4>
<table>
  <tr><th>Command</th><th>Description</th></tr>
  <tr><td>/status</td><td>Get Proxmox cluster status</td></tr>
  <tr><td>/vms</td><td>List all VMs with status</td></tr>
  <tr><td>/containers &lt;host&gt;</td><td>List containers on host</td></tr>
  <tr><td>/restart &lt;container&gt;</td><td>Restart Docker container</td></tr>
  <tr><td>/request &lt;type&gt; &lt;title&gt;</td><td>Request movie/show</td></tr>
  <tr><td>/media</td><td>Media library stats</td></tr>
</table>`
  },

  // ============================================
  // ADDITIONAL SERVICES
  // ============================================
  {
    title: 'Paperless-ngx Document Management Deployed',
    date: new Date('2024-12-30'),
    category: 'service',
    source: 'ansible',
    infrastructureNode: 'docker-vm-core-utilities01',
    tags: JSON.stringify(['paperless', 'documents', 'ocr', 'archival']),
    services: JSON.stringify(['Paperless-ngx']),
    content: `<h3>Document Management System</h3>
<p>Deployed Paperless-ngx for automatic document scanning, OCR, and organization.</p>

<h4>Features</h4>
<ul>
  <li>Automatic document scanning and OCR</li>
  <li>Full-text search across all documents</li>
  <li>Tagging and categorization</li>
  <li>Correspondent management</li>
  <li>Email consumption for automatic import</li>
</ul>

<h4>Deployment Details</h4>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>Host</td><td>docker-vm-core-utilities01</td></tr>
  <tr><td>Port</td><td>8000</td></tr>
  <tr><td>URL</td><td>https://paperless.hrmsmrflrii.xyz</td></tr>
</table>`
  },

  {
    title: 'Home Assistant Smart Home Deployed',
    date: new Date('2025-01-02'),
    category: 'service',
    source: 'ansible',
    infrastructureNode: 'homeassistant-lxc',
    tags: JSON.stringify(['home-assistant', 'smart-home', 'automation', 'iot']),
    services: JSON.stringify(['Home Assistant']),
    content: `<h3>Smart Home Automation Platform</h3>
<p>Deployed Home Assistant for smart home device control and automation.</p>

<h4>Deployment Details</h4>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>Host</td><td>homeassistant-lxc (LXC 206)</td></tr>
  <tr><td>IP Address</td><td>192.168.40.25</td></tr>
  <tr><td>Port</td><td>8123</td></tr>
  <tr><td>URL</td><td>https://ha.hrmsmrflrii.xyz</td></tr>
</table>

<h4>Integrations</h4>
<ul>
  <li>Energy monitoring dashboard</li>
  <li>Device tracking</li>
  <li>Automation rules</li>
  <li>Mobile app notifications</li>
</ul>`
  },

  // ============================================
  // MILESTONES
  // ============================================
  {
    title: 'Homelab Chronicle Timeline App Deployed',
    date: new Date('2026-01-12'),
    category: 'milestone',
    source: 'manual',
    infrastructureNode: 'docker-lxc-glance',
    tags: JSON.stringify(['chronicle', 'timeline', 'nextjs', 'documentation']),
    services: JSON.stringify(['Homelab Chronicle']),
    content: `<h3>Visual Timeline for Homelab Journey</h3>
<p>Deployed Homelab Chronicle - a Next.js application for documenting and visualizing the homelab infrastructure journey.</p>

<h4>Features</h4>
<ul>
  <li>Timeline view of all homelab events</li>
  <li>Category filtering (infrastructure, service, network, storage, milestone)</li>
  <li>Search with faceted filters</li>
  <li>Statistics dashboard with charts</li>
  <li>Infrastructure map</li>
  <li>"On This Day" historical view</li>
  <li>Report generation (HTML/Markdown/JSON)</li>
  <li>Event templates</li>
  <li>Import/Export functionality</li>
</ul>

<h4>Tech Stack</h4>
<ul>
  <li>Next.js 14 (App Router)</li>
  <li>Prisma ORM with SQLite</li>
  <li>Tailwind CSS</li>
  <li>shadcn/ui components</li>
  <li>Docker deployment</li>
</ul>

<h4>Access URL</h4>
<p><a href="https://chronicle.hrmsmrflrii.xyz">https://chronicle.hrmsmrflrii.xyz</a></p>`
  },

  {
    title: 'First Blog Post Published - Clustered Thoughts',
    date: new Date('2025-12-27'),
    category: 'milestone',
    source: 'manual',
    tags: JSON.stringify(['blog', 'hugo', 'github-pages', 'writing']),
    services: JSON.stringify(['GitHub Pages']),
    content: `<h3>Homelab Blog Launched</h3>
<p>Launched "Clustered Thoughts" - a personal blog documenting the homelab journey.</p>

<h4>Blog Details</h4>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>URL</td><td>https://herms14.github.io/Clustered-Thoughts/</td></tr>
  <tr><td>Platform</td><td>Hugo (Static Site Generator)</td></tr>
  <tr><td>Theme</td><td>PaperMod</td></tr>
  <tr><td>Hosting</td><td>GitHub Pages</td></tr>
  <tr><td>Deployment</td><td>GitHub Actions (auto on push)</td></tr>
</table>

<h4>Content Focus</h4>
<ul>
  <li>Homelab infrastructure tutorials</li>
  <li>Service deployment guides</li>
  <li>Networking and security topics</li>
  <li>Automation and scripting</li>
</ul>`
  }
]

async function main() {
  console.log('Starting to seed real homelab timeline data...')

  // Clear existing events
  console.log('Clearing existing events...')
  await prisma.event.deleteMany()

  // Insert new events
  for (const event of events) {
    const created = await prisma.event.create({
      data: event
    })
    console.log(`Created: ${created.title} (${created.date.toISOString().split('T')[0]})`)
  }

  console.log(`\n✅ Seeded ${events.length} timeline events successfully!`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
