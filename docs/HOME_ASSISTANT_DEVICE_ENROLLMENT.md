# Home Assistant Device Enrollment Guide

> Manual enrollment guide for Tapo smart devices in Home Assistant

## Overview

This guide covers enrolling your Tapo smart devices into Home Assistant at https://ha.hrmsmrflrii.xyz

### Device Inventory

| Device | IP Address | Type | Enrollment Method |
|--------|------------|------|-------------------|
| P110M | 192.168.30.73 | Energy Plug (Matter) | Tapo Controller or Matter |
| P110M | 192.168.30.66 | Energy Plug (Matter) | Tapo Controller or Matter |
| P110M | 192.168.30.63 | Energy Plug (Matter) | Tapo Controller or Matter |
| Tapo SmartPlug | 192.168.30.75 | Basic Plug | Tapo Controller |
| C211 | 192.168.30.67 | Camera | RTSP (Already Added) |
| C425 | 192.168.30.54 | Camera | Cloud Only (Tapo App) |
| KC200 | 192.168.30.51 | Camera | Cloud Only (Tapo App) |
| C660 | 192.168.30.59 | Camera | Cloud Only (Tapo App) |
| L530 | Offline | Color Bulb | Tapo Controller |
| L510 | Offline | White Bulb | Tapo Controller |
| LB100 | Offline | Basic Bulb | Tapo Controller |

---

## Method 1: Tapo Controller Integration (Recommended)

Use this method for all Tapo plugs and bulbs.

### Prerequisites

- HACS installed ✅
- Tapo Controller integration installed ✅
- Tapo account credentials

### Step-by-Step Enrollment

#### Step 1: Open Add Integration

1. Go to **https://ha.hrmsmrflrii.xyz**
2. Navigate to **Settings** (gear icon in sidebar)
3. Click **Devices & Services**
4. Click **+ Add Integration** button (bottom right)

#### Step 2: Search for Tapo

1. In the search box, type **"Tapo"**
2. Select **"Tapo Controller"** (NOT "TP-Link Smart Home")

> **Important**: Make sure you select "Tapo Controller" from HACS, not the built-in "TP-Link Smart Home" integration.

#### Step 3: Enter Device Details

Enter the following information:

| Field | Value |
|-------|-------|
| **Host** | IP address of the device (e.g., `192.168.30.73`) |
| **Username** | `herms14@gmail.com` |
| **Password** | Your Tapo account password |

#### Step 4: Complete Setup

1. Click **Submit**
2. Wait for connection test
3. If successful, assign to an area (optional)
4. Click **Finish**

#### Step 5: Repeat for Each Device

Repeat Steps 1-4 for each plug:

| Device | Host IP |
|--------|---------|
| P110M #1 | `192.168.30.73` |
| P110M #2 | `192.168.30.66` |
| P110M #3 | `192.168.30.63` |
| Basic Plug | `192.168.30.75` |

### Troubleshooting Tapo Controller

| Error | Solution |
|-------|----------|
| "Invalid authentication" | Verify email/password in Tapo app first |
| "Connection failed" | Check device is online in Tapo app |
| "Device not found" | Verify IP address, try pinging it |
| "Timeout" | Device may be on different VLAN, check firewall |

---

## Method 2: Matter Commissioning (For P110M)

Your P110M plugs support Matter protocol for local control without cloud dependency.

### Prerequisites

- Matter Server running ✅ (already configured)
- Physical access to each plug (need to scan QR code)

### Step-by-Step Matter Enrollment

#### Step 1: Open Matter Integration

1. Go to **https://ha.hrmsmrflrii.xyz**
2. Navigate to **Settings → Devices & Services**
3. Find **"Matter"** in configured integrations
4. Click **Configure**

#### Step 2: Commission Device

1. Click **Commission device**
2. Select **Commission using QR code**
3. Use your phone camera to scan the QR code on the bottom/back of the P110M plug

> **Note**: The QR code is usually on a sticker on the device or in the manual.

#### Step 3: Complete Pairing

1. Follow on-screen instructions
2. The device will be added to Home Assistant
3. Assign to an area if desired

#### Step 4: Repeat for Each P110M

Repeat for all three P110M plugs:
- P110M at 192.168.30.73
- P110M at 192.168.30.66
- P110M at 192.168.30.63

### Matter vs Tapo Controller

| Feature | Matter | Tapo Controller |
|---------|--------|-----------------|
| Cloud dependency | No (local only) | Yes (needs cloud auth) |
| Setup method | QR code scan | IP + credentials |
| Speed | Faster (local) | Slightly slower |
| Works offline | Yes | No |

---

## Method 3: RTSP Camera (Generic Camera)

For cameras that support RTSP streaming (C211).

### Already Configured

The C211 camera is already added via RTSP:
- **Entity**: `camera.192_168_30_67`
- **Stream URL**: `rtsp://herms14:c%40llimachus14@192.168.30.67:554/stream1`

### Adding Additional RTSP Cameras

If you have other cameras that support RTSP:

1. **Settings → Devices & Services → Add Integration**
2. Search **"Generic Camera"**
3. Enter:
   - **Still Image URL**: Leave blank
   - **Stream Source**: `rtsp://USERNAME:PASSWORD@IP:554/stream1`
   - **RTSP Transport**: TCP

### RTSP URL Format

```
rtsp://[username]:[password]@[ip]:554/stream1
```

| Parameter | Value |
|-----------|-------|
| Username | Your Tapo camera username |
| Password | URL-encoded password (`@` becomes `%40`) |
| Port | 554 (standard RTSP) |
| Path | `/stream1` (main stream) or `/stream2` (sub stream) |

---

## Method 4: Cloud-Only Cameras

These cameras don't support local RTSP and only work via cloud:
- C425 (192.168.30.54)
- KC200 (192.168.30.51)
- C660 (192.168.30.59)

### Options

1. **Use Tapo App** - View cameras directly in Tapo app
2. **Wait for Integration Update** - Future Tapo Controller updates may add cloud camera support
3. **Third-party services** - Some services can bridge Tapo cloud to RTSP

---

## Adding Smart Bulbs

When your offline bulbs (L530, L510, LB100) come online:

1. Power on the bulb
2. Wait for it to appear in Tapo app
3. Note the IP address from your router/Omada
4. Add via Tapo Controller (Method 1)

### Bulb Features

| Model | Features |
|-------|----------|
| L530 | Color, brightness, color temperature |
| L510 | Brightness, color temperature |
| LB100 | Brightness only |

---

## Post-Enrollment: Dashboard Setup

After adding devices, they'll appear in the **Smart Home** dashboard:

1. Go to **https://ha.hrmsmrflrii.xyz**
2. Click **Smart Home** in the sidebar
3. View all devices organized by type

### Entity Naming

Devices will be named based on their Tapo app names. To rename:

1. **Settings → Devices & Services**
2. Find the device
3. Click the device name
4. Click the pencil icon to edit

---

## Verification Checklist

After enrollment, verify each device:

- [ ] Device appears in Home Assistant
- [ ] Can toggle on/off from dashboard
- [ ] Power monitoring shows values (P110M)
- [ ] Device responds within 1-2 seconds

---

## Quick Reference

### URLs

| Resource | URL |
|----------|-----|
| Home Assistant | https://ha.hrmsmrflrii.xyz |
| Tapo Controller Docs | https://github.com/petretiandrea/home-assistant-tapo-p100 |
| Matter Docs | https://www.home-assistant.io/integrations/matter/ |

### Credentials

| Service | Username |
|---------|----------|
| Tapo Account | herms14@gmail.com |
| Camera RTSP | herms14 |

### IP Addresses (VLAN 30 - IoT)

| Device | IP |
|--------|-----|
| P110M #1 | 192.168.30.73 |
| P110M #2 | 192.168.30.66 |
| P110M #3 | 192.168.30.63 |
| Basic Plug | 192.168.30.75 |
| C211 Camera | 192.168.30.67 |

---

*Created: January 7, 2026*
*Home Assistant: https://ha.hrmsmrflrii.xyz*
