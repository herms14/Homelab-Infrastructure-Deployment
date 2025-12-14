# Troubleshooting Guide

## Node03 VM Deployment Failure - QEMU Exit Code 1

### Problem Summary

**Issue**: VMs would successfully deploy to node02 but consistently fail on node03 with error:
```
Error: start failed: QEMU exited with code 1
```

**Symptoms**:
- ansible-control01 on node02 (192.168.20.21): SUCCESS
- ansible-control02 on node03 (192.168.20.22): FAILURE
- Same configuration, different results on different nodes

### Initial Investigation

#### 1. Storage Investigation (Red Herring)

Initially suspected storage issues because the user reported stale file handles:

```bash
# Check storage status on node03
ssh root@192.168.20.22
pvesm status | grep VMDisks
```

**Output**:
```
VMDisks             nfs     active     11231004032      1004321792     10226682240    8.94%
```

**Finding**: Storage was active and properly configured.

```bash
# Check for stale mounts
df -h | grep VMDisks
```

**Output**:
```
df: /mnt/pve/SynologyISOs: Stale file handle
df: /mnt/pve/Synology-NFS-VLAN20: Stale file handle
df: /mnt/pve/Synology-VMDisks: Stale file handle
192.168.20.31:/volume2/ProxmoxCluster-VMDisks   11T  958G  9.6T   9% /mnt/pve/VMDisks
```

**Attempted Fix**: Cleaned up stale mounts from old storage configuration.

```bash
# Force unmount stale mounts
umount -f -l /mnt/pve/SynologyISOs 2>/dev/null || true
umount -f -l /mnt/pve/Synology-NFS-VLAN20 2>/dev/null || true
umount -f -l /mnt/pve/Synology-VMDisks 2>/dev/null || true

# Remove stale directories
rmdir /mnt/pve/SynologyISOs 2>/dev/null || true
rmdir /mnt/pve/Synology-NFS-VLAN20 2>/dev/null || true
rmdir /mnt/pve/Synology-VMDisks 2>/dev/null || true
```

**Result**: Stale mounts partially cleaned, but deployment still failed.

**Conclusion**: Storage was NOT the root cause.

### Root Cause Analysis

#### 2. Finding the Real Error

Instead of relying on generic error messages from Terraform, investigated the actual Proxmox task logs:

```bash
# Check recent task logs
ssh root@192.168.20.22
tail -50 /var/log/pve/tasks/active
```

**Pattern observed**: Clone, move, and resize operations succeeded, but qmstart (VM start) consistently failed.

```bash
# Find the detailed error log for the failed start
find /var/log/pve/tasks -name '*qmstart*101*' -type f | tail -1 | xargs cat
```

**Critical Error Found**:
```
generating cloud-init ISO
no physical interface on bridge 'vmbr0'
kvm: -netdev type=tap,id=net0,ifname=tap101i0,script=/usr/libexec/qemu-server/pve-bridge,downscript=/usr/libexec/qemu-server/pve-bridgedown,vhost=on: network script /usr/libexec/qemu-server/pve-bridge failed with status 6400
TASK ERROR: start failed: QEMU exited with code 1
```

**Root Cause Identified**: The bridge `vmbr0` on node03 had no physical interface configured, despite appearing to work at the OS level.

### Comparative Analysis

#### 3. Comparing Network Configuration

Checked node02 (working) vs node03 (failing) network configurations:

```bash
# Check node03 network configuration
ssh root@192.168.20.22
cat /etc/network/interfaces
```

**Node03 Configuration (BROKEN)**:
```
auto lo
iface lo inet loopback

iface nic0 inet manual

auto vmbr0
iface vmbr0 inet static
	address 192.168.20.22/24
	gateway 192.168.20.1
	bridge-ports nic0
	bridge-stp off
	bridge-fd 0

iface nic1 inet manual
```

```bash
# Check node02 network configuration
ssh root@192.168.20.21
cat /etc/network/interfaces
```

**Node02 Configuration (WORKING)**:
```
auto lo
iface lo inet loopback

auto nic0
iface nic0 inet manual

iface nic1 inet manual

iface wlp3s0 inet manual

auto vmbr0
iface vmbr0 inet static
	address 192.168.20.21/24
	gateway 192.168.20.1
	bridge-ports nic0
	bridge-stp off
	bridge-fd 0
	bridge-vlan-aware yes
	bridge-vids 2-4094

source /etc/network/interfaces.d/*
```

#### Key Differences Found:

1. **Missing `auto nic0`**: Node03 didn't auto-start the physical interface
2. **Missing `bridge-vlan-aware yes`**: Node03 bridge wasn't VLAN-aware
3. **Missing `bridge-vids 2-4094`**: Node03 didn't define allowed VLAN range

### Solution

#### 4. Fixing the Network Configuration

Updated node03's `/etc/network/interfaces` to match node02's working configuration:

```bash
ssh root@192.168.20.22
cat > /etc/network/interfaces << 'EOF'
auto lo
iface lo inet loopback

auto nic0
iface nic0 inet manual

iface nic1 inet manual

auto vmbr0
iface vmbr0 inet static
	address 192.168.20.22/24
	gateway 192.168.20.1
	bridge-ports nic0
	bridge-stp off
	bridge-fd 0
	bridge-vlan-aware yes
	bridge-vids 2-4094

source /etc/network/interfaces.d/*
EOF
```

**Changes Made**:
- Added `auto nic0` to ensure physical interface starts on boot
- Added `bridge-vlan-aware yes` to enable VLAN filtering on the bridge
- Added `bridge-vids 2-4094` to allow all VLAN tags (2-4094)

#### 5. Applying the Configuration

Rebooted node03 to ensure clean network configuration reload:

```bash
ssh root@192.168.20.22
reboot
```

**Why reboot instead of `ifreload`**:
- More reliable for critical network changes
- Ensures all network services restart cleanly
- Avoids potential connection loss during reload

#### 6. Verification

After reboot, verified VLAN filtering was active:

```bash
ssh root@192.168.20.22
ip -d link show vmbr0 | grep -i vlan
```

**Expected Output**:
```
... vlan_filtering 1 vlan_protocol 802.1Q ... vlan_default_pvid 1 ...
```

**Key indicator**: `vlan_filtering 1` confirms VLAN support is active.

### Result

After the network configuration fix:
- ✅ ansible-control01 deployed successfully on node02
- ✅ ansible-control02 deployed successfully on node03
- ✅ Both VMs received correct IP addresses and started properly

### Lessons Learned

1. **Don't assume storage issues first**: Error messages can be misleading. QEMU failures aren't always storage-related.

2. **Check Proxmox task logs directly**: The detailed logs in `/var/log/pve/tasks/` contain the actual error messages, not just generic "exit code 1" errors.

3. **Compare working vs non-working nodes**: When one node works and another doesn't, compare their configurations systematically.

4. **VLAN-aware bridges are critical**: Even if VMs aren't using VLANs explicitly (vlan_tag = null in Terraform = VLAN 1), the bridge must be VLAN-aware for proper operation in Proxmox VE 9.x.

5. **Network configuration matters**: The `auto` directive on physical interfaces ensures they're brought up before bridges that depend on them.

### Prevention

When adding new Proxmox nodes to the cluster:

1. **Template the network configuration**: Use node02's `/etc/network/interfaces` as a template for new nodes.

2. **Verify VLAN filtering**: Always check that `vlan_filtering 1` is set on vmbr0:
   ```bash
   ip -d link show vmbr0 | grep vlan_filtering
   ```

3. **Test VM deployment**: Deploy a test VM to new nodes before production workloads.

4. **Document node-specific settings**: Keep track of which settings must be identical across all nodes vs node-specific (like IP addresses).

### Related Configuration

This issue affected VM deployments but would have also impacted:
- LXC containers on node03
- Any workload requiring network connectivity through vmbr0
- VLAN-tagged traffic (VLAN 20, VLAN 40, etc.)

### References

- Proxmox VE 9.1.2 Network Configuration: https://pve.proxmox.com/wiki/Network_Configuration
- Linux Bridge VLAN Filtering: https://developers.redhat.com/blog/2017/09/14/vlan-filter-support-on-bridge
- Error location: `/usr/libexec/qemu-server/pve-bridge` (Proxmox network setup script)
