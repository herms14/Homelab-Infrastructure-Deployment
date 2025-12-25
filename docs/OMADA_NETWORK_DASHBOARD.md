# Omada Network Dashboard Setup Guide

This guide explains how to set up the comprehensive Omada Network dashboard for Glance.

## Overview

The Omada Network Dashboard combines metrics from:
- **TP-Link Omada SDN** - Devices, clients, traffic, APs, switches, PoE
- **OPNsense Firewall** - Gateway status, firewall rules, connections
- **Speedtest Tracker** - Internet speed tests (download, upload, ping)

## Dashboard Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 📊 OVERVIEW                                                                   │
├───────┬───────┬───────┬───────┬───────┬───────┬───────┬───────────────────────┤
│Total  │Wired  │Wireless│Uptime │Storage│Upgrade│      WiFi Mode Pie Chart     │
│Clients│ Blue  │  Pink  │Purple │ Gauge │Needed │           (Donut)            │
├───────┴───────┴───────┴───────┴───────┴───────┴───────────────────────────────┤
│ 🖥️ DEVICE HEALTH                                                              │
├─────────────────┬─────────────────┬─────────────────────┬─────────────────────┤
│  Gateway CPU    │ Gateway Memory  │   Switch CPU Usage  │    AP CPU Usage     │
│    (Gauge)      │    (Gauge)      │    (Bar Gauge)      │    (Bar Gauge)      │
├─────────────────┴─────────────────┼─────────────────────┴─────────────────────┤
│         Device Uptimes (Stat - all devices)                                   │
├───────────────────────────────────────────────────────────────────────────────┤
│ 📶 WIFI SIGNAL QUALITY                                                        │
├───────────────────────────────────┬───────────────────────────────────────────┤
│  Client Signal Strength (RSSI)    │    Signal-to-Noise Ratio (SNR)            │
│  Top 15 clients, -100 to -20 dBm  │    Top 15 clients, 0 to 60 dB             │
├───────────────────────────────────┴───────────────────────────────────────────┤
│                    WiFi Signal Over Time (Time Series)                        │
├───────────────────────────────────────────────────────────────────────────────┤
│ 🔌 SWITCH PORT STATUS                                                         │
├───────────────────────────────────────────────────────────────────────────────┤
│              Port Link Status (UP/DOWN for all ports)                         │
├───────────────────────────────────┬───────────────────────────────────────────┤
│      Port Link Speeds (Mbps)      │     Port Traffic RX/TX (Time Series)      │
├───────────────────────────────────┴───────────────────────────────────────────┤
│ ⚡ POE POWER USAGE                                                            │
├─────────────────┬─────────────────┬───────────────────────────────────────────┤
│  Total PoE Power│  PoE Remaining  │         PoE Power Per Port                │
│    (Gauge)      │   (Stat+Area)   │         (Bar Gauge)                       │
├─────────────────┴─────────────────┴───────────────────────────────────────────┤
│ 📈 TRAFFIC ANALYSIS                                                           │
├───────────────────────────────────┬───────────────────────────────────────────┤
│   Client Connection Trend         │   Top 10 Clients by Traffic (Bar Gauge)   │
│   (Total/Wired/Wireless)          │                                           │
├───────────────────────────────────┼───────────────────────────────────────────┤
│   Device Download Traffic         │   Device Upload Traffic                   │
│   (Time Series)                   │   (Time Series)                           │
├───────────────────────────────────┼───────────────────────────────────────────┤
│   Client TX Rate (Bar Gauge)      │   Client RX Rate (Bar Gauge)              │
├───────────────────────────────────┴───────────────────────────────────────────┤
│ 📋 CLIENT DETAILS                                                             │
├───────────────────────────────────────────────────────────────────────────────┤
│              All Connected Clients (Table)                                    │
│  Client | IP | MAC | VLAN | Port | Mode | SSID | AP | Vendor | WiFi | Activity│
└───────────────────────────────────────────────────────────────────────────────┘
```

**Grafana UID**: `omada-network`
**Glance Iframe Height**: 1900px
**Dashboard JSON**: `temp-omada-full-dashboard.json`

## Prerequisites

| Component | Status | Port | Host |
|-----------|--------|------|------|
| Omada Controller | OC300 | 443 | 192.168.0.103 |
| OPNsense Firewall | Active | 9198 | 192.168.91.30 |
| Speedtest Tracker | Active | 3000 | 192.168.40.10 |
| Prometheus | Active | 9090 | 192.168.40.10 |
| Grafana | Active | 3030 | 192.168.40.10 |

## Step 1: Create Omada Viewer User

1. Log into Omada Controller at https://192.168.0.103
2. Go to **Settings > Admin** (or Global Settings > Admins)
3. Click **Add Admin**
4. Configure:
   - **Username**: `claude-reader`
   - **Password**: `&FtwLsK#6PGDbJyA`
   - **Role**: **Viewer** (read-only access)
5. Save the user

## Step 2: Deploy Omada Exporter

SSH to the Ansible controller and run:

```bash
# Set the Omada password
export OMADA_PASSWORD='&FtwLsK#6PGDbJyA'

# Deploy the exporter
cd ~/ansible
ansible-playbook monitoring/deploy-omada-exporter.yml
```

Or deploy manually on docker-vm-utilities01:

```bash
ssh hermes-admin@192.168.40.10

# Create directory
sudo mkdir -p /opt/omada-exporter
cd /opt/omada-exporter

# Create docker-compose.yml
sudo tee docker-compose.yml << 'EOF'
services:
  omada-exporter:
    image: ghcr.io/charlie-haley/omada_exporter:latest
    container_name: omada-exporter
    restart: unless-stopped
    ports:
      - "9202:9202"
    environment:
      OMADA_HOST: "https://192.168.0.103"
      OMADA_USER: "claude-reader"
      OMADA_PASS: "&FtwLsK#6PGDbJyA"
      OMADA_SITE: "Default"
      OMADA_INSECURE: "true"
      LOG_LEVEL: "warn"
EOF

# Deploy
sudo docker compose up -d

# Verify metrics are being exported
curl http://localhost:9202/metrics | head -50
```

## Step 3: Update Prometheus Configuration

Add the Omada scrape job to Prometheus:

```bash
ssh hermes-admin@192.168.40.10

# Edit prometheus config
sudo nano /opt/monitoring/prometheus/prometheus.yml
```

Add to `scrape_configs`:

```yaml
  - job_name: 'omada'
    static_configs:
      - targets: ['192.168.40.10:9202']
        labels:
          site: 'Default'

  - job_name: 'speedtest'
    metrics_path: /api/speedtest/latest/prometheus
    static_configs:
      - targets: ['192.168.40.10:3000']
    scrape_interval: 5m
```

Reload Prometheus:

```bash
curl -X POST http://localhost:9090/-/reload
```

## Step 4: Deploy Grafana Dashboard

```bash
# Set Grafana API key
export GRAFANA_API_KEY='your_grafana_api_key'

# Deploy COMPREHENSIVE dashboard (recommended)
cd ~/ansible
ansible-playbook monitoring/deploy-omada-full-dashboard.yml

# OR deploy simpler version
ansible-playbook monitoring/deploy-omada-network-dashboard.yml
```

### Comprehensive Dashboard Includes:
- **Device Health**: Gateway/Switch/AP CPU and Memory gauges
- **WiFi Signal Quality**: RSSI and SNR bar gauges, signal over time
- **Switch Port Status**: Link status, speeds, RX/TX traffic
- **PoE Power Usage**: Total power, remaining, per-port usage
- **Traffic Analysis**: Client trends, top clients, TX/RX rates
- **Client Details**: Full table with all client information

## Step 5: Update Glance Network Tab

The Network tab will embed the new dashboard. You can update it automatically:

```bash
# Automatic update via Ansible
cd ~/ansible
ansible-playbook monitoring/update-glance-network-tab.yml
```

Or manually update the Glance configuration to point to the new dashboard URL:

```
https://grafana.hrmsmrflrii.xyz/d/omada-network/omada-network-overview?orgId=1&kiosk&theme=transparent&refresh=30s&from=now-1h&to=now
```

**Recommended Iframe Height**: 1900px (comprehensive dashboard is tall)

## Dashboard Panels

### Row 1: Device Summary
| Panel | Metric | Color |
|-------|--------|-------|
| Total Devices | `count(omada_device_uptime_seconds)` | Blue |
| Gateway | Device count by type=gateway | Green |
| Switches | Device count by type=switch | Purple |
| Access Points | Device count by type=ap | Cyan |
| Total Clients | `omada_client_connected_total` | Green |
| Wired Clients | Clients with connection_mode=wired | Amber |
| Wireless Clients | Clients with connection_mode=wireless | Pink |
| Total Traffic | Sum of all client traffic | Blue |

### Row 2: Gateway & ISP
| Panel | Metric |
|-------|--------|
| Gateway CPU | `omada_device_cpu_percentage{device_type="gateway"}` |
| Gateway Memory | `omada_device_mem_percentage{device_type="gateway"}` |
| Gateway Utilization | Time series of CPU and Memory |

### Row 3: Client Connection Trend
| Panel | Metric |
|-------|--------|
| Client Trend | Time series of total, wired, wireless clients |
| Download Speed | Speedtest download (Mbps) |
| Upload Speed | Speedtest upload (Mbps) |
| Ping | Speedtest latency (ms) |
| Jitter | Speedtest jitter (ms) |

### Row 4: Traffic & Switches
| Panel | Metric |
|-------|--------|
| Network Traffic (WAN) | OPNsense WAN interface rx/tx |
| Switch Traffic (Top 5) | Top switches by traffic |
| PoE Power Usage | PoE watts per switch |

### Row 5: APs & WiFi
| Panel | Metric |
|-------|--------|
| Top APs by Client Count | Clients per AP |
| Top APs by Traffic | Traffic per AP |
| Clients by SSID | Pie chart of SSID distribution |

### Row 6: OPNsense Firewall
| Panel | Metric |
|-------|--------|
| OPNsense Gateway | Gateway status |
| Services Running | Running service count |
| Firewall Blocked | Blocked packet count |
| Firewall Pass/Block Rate | Time series |
| TCP Connections | Established connections |
| DNS Queries | Unbound queries (30m) |
| DNS Blocked | Blocked DNS queries (30m) |

## Metrics Not Available

Due to Omada API limitations, these metrics from the Omada UI are NOT available via the exporter:

| Feature | Reason |
|---------|--------|
| ISP Load (latency/throughput) | Not exposed by Omada API |
| Gateway Alerts (errors/warnings) | Not exposed by Omada API |
| Application/DPI Categories | Deep Packet Inspection not exposed |
| Top 20 Applications by traffic | DPI data not exposed |

For DPI/Application data, continue using the native Omada Controller UI.

## Troubleshooting

### Exporter not returning metrics

```bash
# Check container logs
docker logs omada-exporter

# Test connectivity to Omada
curl -k https://192.168.0.103

# Verify credentials work
# Try logging into Omada web UI with claude-reader
```

### Prometheus not scraping

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.job=="omada")'

# Check for scrape errors
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.job=="omada") | .lastError'
```

### Missing client metrics

Some Omada Controller versions have API changes. Check the exporter GitHub for known issues:
https://github.com/charlie-haley/omada_exporter/issues

## File Locations

| File | Location |
|------|----------|
| Omada Exporter | `/opt/omada-exporter/docker-compose.yml` (on ansible-controller01) |
| Prometheus Config | `/opt/monitoring/prometheus/prometheus.yml` |
| Dashboard JSON | `temp-omada-full-dashboard.json` |
| Dashboard Ansible (Full) | `ansible-playbooks/monitoring/deploy-omada-full-dashboard.yml` |
| Dashboard Ansible (Simple) | `ansible-playbooks/monitoring/deploy-omada-network-dashboard.yml` |
| Glance Update Ansible | `ansible-playbooks/monitoring/update-glance-network-tab.yml` |
| Exporter Ansible | `ansible-playbooks/monitoring/deploy-omada-exporter.yml` |

## References

- [omada_exporter GitHub](https://github.com/charlie-haley/omada_exporter)
- [Grafana Dashboard ID 20854](https://grafana.com/grafana/dashboards/20854-omada-overview/)
- [Omada SDN API](https://www.tp-link.com/us/support/faq/3231/)
