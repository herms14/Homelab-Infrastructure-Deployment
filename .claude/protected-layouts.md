# Protected Dashboard Layouts

> Reference for dashboard structures. Only read when modifying dashboards.

## Container Status History (`container-status`)

**Glance Iframe Height**: 1500px

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Total Containers] [Running]    [Total Memory]   [Total CPU Gauge]      │  Row 1: h=4
├─────────────────────────────────────────────────────────────────────────┤
│ [Utilities VM]  [Utilities Stable] [Media VM]      [Media Stable]       │  Row 2: h=3
├──────────────────────────────────┬──────────────────────────────────────┤
│  Top 5 Memory - Utilities VM     │    Top 5 Memory - Media VM           │  Row 3: h=8
├──────────────────────────────────┼──────────────────────────────────────┤
│ State Timeline - Utilities VM    │ State Timeline - Media VM            │  Row 4: h=14
├──────────────────────────────────┴──────────────────────────────────────┤
│ Container Issues (Last 15 min) - Table                                  │  Row 5: h=8
└─────────────────────────────────────────────────────────────────────────┘
```

**Files**: `dashboards/container-status.json`, `ansible-playbooks/monitoring/deploy-container-status-dashboard.yml`

## Synology NAS Storage (`synology-nas-modern`)

**Glance Iframe Height**: 1350px

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [RAID Status] [SSD Cache] [Uptime] [Total] [Used] [Storage %]           │  Row 1: h=4
├─────────────────────────────────────────────────────────────────────────┤
│ [Drive 1 HDD] [Drive 2 HDD] [Drive 3 HDD] [Drive 4 HDD] [M.2 1] [M.2 2] │  Row 2: h=4
├──────────────────────────────────┬──────────────────────────────────────┤
│ Disk Temperatures (bargauge)     │ [Sys Temp] [Healthy] [CPU Gauge]    │  Row 3: h=6
├──────────────────────────────────┼──────────────────────────────────────┤
│ CPU Gauge        Memory Gauge    │ [Total RAM]  [Available RAM]        │  Row 4: h=5
├──────────────────────────────────┼──────────────────────────────────────┤
│ CPU Usage Over Time (4 cores)    │ Memory Usage Over Time              │  Row 5: h=8
├──────────────────────────────────┴──────────────────────────────────────┤
│ Storage Consumption Over Time (7-day window)                            │  Row 6: h=8
└─────────────────────────────────────────────────────────────────────────┘
```

**RAID Status Values**: 1=Normal, 2=Repairing, 7=Syncing, 11=Degraded, 12=Crashed
**Files**: `dashboards/synology-nas.json`, `ansible-playbooks/monitoring/deploy-synology-nas-dashboard.yml`

## Omada Network Overview (`omada-network`)

**Glance Iframe Height**: 2200px

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ OVERVIEW: [Total Clients] [Wired] [Wireless] [Uptime] [Storage] [WiFi Pie]  │
├──────────────────────────────────────────────────────────────────────────────┤
│ DEVICE HEALTH: [Gateway] [Core Switch] [Switch 2] [Living AP] [Outdoor AP]  │
├──────────────────────────────────────────────────────────────────────────────┤
│ WIFI SIGNAL: [Client RSSI] [SNR Bar] [Signal Over Time]                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ SWITCH PORTS: [Port Status Table] [Link Speeds] [Port Traffic]               │
├──────────────────────────────────────────────────────────────────────────────┤
│ POE: [Total PoE Gauge] [PoE Remaining] [PoE Per Port]                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ TRAFFIC: [Connection Trend] [Top 10 Clients] [Device Traffic]                │
├──────────────────────────────────────────────────────────────────────────────┤
│ CLIENTS: [All Connected Clients Table]                                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Data Source**: Omada Exporter (192.168.20.30:9202)
**Files**: `dashboards/omada-network.json`, `ansible-playbooks/monitoring/deploy-omada-full-dashboard.yml`

## Glance Tab Order

Home | Compute | Storage | Network | Media | Web | Reddit

## Key File Locations

| Purpose | Path |
|---------|------|
| Glance Config | 192.168.40.12:/opt/glance/config/glance.yml |
| Grafana Dashboards | 192.168.40.13:/opt/monitoring/grafana/dashboards/ |
| Traefik Dynamic | 192.168.40.20:/opt/traefik/config/dynamic/services.yml |
