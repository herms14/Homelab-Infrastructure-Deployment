# Troubleshooting Guide

> Part of the [Proxmox Infrastructure Documentation](../CLAUDE.md)

## Resolved Issues

### Corosync SIGSEGV Crash (Node03)

**Resolved**: December 2025

**Symptoms**:
- `corosync.service` fails to start with `status=11/SEGV`
- Logs stop at: `Initializing transport (Kronosnet)`
- Node cannot join cluster
- Reinstalling corosync alone doesn't fix it

**Root Cause**: Broken or mismatched NSS crypto stack (`libnss3`) caused Corosync to segfault during encrypted cluster transport initialization.

**Why It Happened**:
- Corosync uses kronosnet (knet) for cluster networking
- knet loads a crypto plugin (`crypto_nss`)
- The plugin relies on NSS crypto libraries (`libnss3`)
- Corrupted or mismatched library versions caused the crash

**Diagnosis**:

```bash
# 1. Validate configuration (should pass)
corosync -t

# 2. Install debug tools
apt install systemd-coredump gdb strace

# 3. After crash, analyze core dump
coredumpctl info corosync
```

**Stack trace showed failure in**: `PK11_CipherOp` -> `libnss3.so` -> `crypto_nss.so` -> `libknet.so`

**Resolution**:

Reinstall the entire crypto and transport dependency chain:

```bash
apt install --reinstall -y \
  libnss3 libnss3-tools \
  libknet1t64 libnozzle1t64 \
  corosync libcorosync-common4
```

**Verification**:

```bash
# Start corosync
systemctl start corosync

# Check status
systemctl status corosync

# Verify crypto plugin loaded
journalctl -u corosync | grep crypto_nss

# Check cluster
pvecm status
```

**Expected Output**:
- `crypto_nss.so has been loaded successfully`
- Quorate: Yes
- All nodes visible

**Prevention**:
- Keep all nodes package-consistent: `apt update && apt full-upgrade -y`
- Avoid partial upgrades (crypto libraries are version-sensitive)
- If corosync crashes again, check core dump first

---

### Cloud-init VM Boot Failure - UEFI/BIOS Mismatch

**Resolved**: December 15, 2025

**Symptoms**:
- VM creates successfully via Terraform
- Console stops at: `Btrfs loaded, zoned=yes, fsverity=yes`
- Boot hangs before cloud-init
- VM unreachable via SSH/ping
- Shows "running" but stuck during boot

**Root Cause**: UEFI/BIOS boot mode mismatch between template and Terraform config.

**Template** (tpl-ubuntuv24.04-v1):
- BIOS: `ovmf` (UEFI)
- EFI Disk: Present
- Machine: `q35`
- SCSI: `virtio-scsi-single`

**Terraform** (before fix):
- BIOS: `seabios` (Legacy)
- SCSI: `lsi`

**Resolution**: Updated `modules/linux-vm/main.tf`:

```hcl
bios    = "ovmf"
machine = "q35"

efidisk {
  storage           = var.storage
  efitype           = "4m"
  pre_enrolled_keys = true
}

scsihw = "virtio-scsi-single"
```

**Lesson**: Always verify template boot mode with `qm config <vmid>` before deploying.

---

### Node Showing Question Mark / Unhealthy Status

**Resolved**: December 16, 2025

**Symptoms**:
- Question mark icon in Proxmox web UI
- "NR" (Not Ready) status in cluster membership

**Diagnosis**:

```bash
# Check connectivity
ping 192.168.20.22

# Check SSH access
ssh root@192.168.20.22 "uptime"

# Check cluster status
ssh root@192.168.20.22 "pvecm status"
ssh root@192.168.20.21 "pvecm status"

# Check cluster resources
ssh root@192.168.20.22 "pvesh get /cluster/resources --type node"
```

**What to Look For**:
- "System is going down" = active shutdown
- "NR" in membership vs "A,NV,NMW" for healthy nodes
- Node status should show "online"

**Resolution**:

1. If shutdown in progress: `shutdown -c` (may fail if too late)
2. If shutdown completed: Power on via physical access, IPMI, or WoL
3. Verify cluster rejoin:
   ```bash
   ssh root@192.168.20.22 "pvecm status"
   ssh root@192.168.20.22 "systemctl status corosync pve-cluster"
   ```
4. If "NR" persists:
   ```bash
   ssh root@192.168.20.22 "systemctl restart pve-cluster && systemctl restart corosync"
   ```

**Verification**:
```bash
# All nodes should show "online"
ssh root@192.168.20.22 "pvesh get /cluster/resources --type node"

# Should show "Quorate: Yes"
ssh root@192.168.20.22 "pvecm status"

# Should show "Members[3]: 1 2 3"
ssh root@192.168.20.22 "journalctl -u corosync -n 50 | grep -E 'Members|quorum'"
```

---

---

### Watchtower TLS Handshake Error

**Resolved**: December 2025

#### Problem Statement

Watchtower logs show TLS handshake errors when attempting to send webhook notifications:
```
tls: first record does not look like a TLS handshake
```

#### Root Cause

Using `generic://` instead of `generic+http://` in the Shoutrrr webhook URL causes Watchtower to attempt an HTTPS connection to an HTTP endpoint. Shoutrrr defaults to HTTPS unless explicitly told to use HTTP.

#### Fix

Update the `WATCHTOWER_NOTIFICATION_URL` environment variable in `/opt/watchtower/docker-compose.yml`:

```yaml
# Wrong - causes TLS error
WATCHTOWER_NOTIFICATION_URL: "generic://192.168.40.10:5050/webhook"

# Correct - explicitly uses HTTP
WATCHTOWER_NOTIFICATION_URL: "generic+http://192.168.40.10:5050/webhook"
```

Restart Watchtower:
```bash
ssh hermes-admin@192.168.40.11 "cd /opt/watchtower && sudo docker compose restart"
```

#### Verification

```bash
# Trigger update check and verify webhook is sent
ssh hermes-admin@192.168.40.11 "docker exec watchtower /watchtower --run-once"

# Check logs for successful notification
ssh hermes-admin@192.168.40.11 "docker logs watchtower 2>&1 | grep -i notification"
```

#### How to Avoid in the Future

Always use `generic+http://` for HTTP webhook endpoints in Shoutrrr URLs. Only use `generic://` for HTTPS endpoints.

---

### Update Manager SSH Key Not Accessible

**Resolved**: December 2025

#### Problem Statement

After approving a container update in Discord, the bot returns:
```
❌ Update failed for sonarr: Could not find compose directory
```

#### Root Cause

The Update Manager Docker container cannot SSH to target Docker hosts because:
1. SSH private key not present on the utilities host (`192.168.40.10`)
2. SSH key not properly mounted into the container
3. Container not restarted after SSH key was added

#### Fix

1. Copy SSH key to the utilities host:
```bash
scp ~/.ssh/homelab_ed25519 hermes-admin@192.168.40.10:/home/hermes-admin/.ssh/
ssh hermes-admin@192.168.40.10 "chmod 600 /home/hermes-admin/.ssh/homelab_ed25519"
```

2. Restart the Update Manager container to remount the volume:
```bash
ssh hermes-admin@192.168.40.10 "cd /opt/update-manager && sudo docker compose restart"
```

#### Verification

```bash
# Test SSH from inside the container
ssh hermes-admin@192.168.40.10 "docker exec update-manager ssh -i /root/.ssh/homelab_ed25519 -o StrictHostKeyChecking=no hermes-admin@192.168.40.11 hostname"

# Expected output: docker-vm-media01
```

#### How to Avoid in the Future

When deploying the Update Manager, ensure the SSH key exists on the host before starting the container. The volume mount `/home/hermes-admin/.ssh:/root/.ssh:ro` requires the source directory and key to exist.

---

### Discord Bot Code Changes Not Taking Effect

**Resolved**: December 2025

#### Problem Statement

After modifying `update_manager.py` and rebuilding the container, the Discord bot behavior doesn't change (e.g., new commands don't appear in help).

#### Root Cause

Docker caches build layers and may not copy the updated Python file if the Dockerfile hasn't changed. Additionally, using `docker compose build` without `--no-cache` may reuse cached layers.

#### Fix

Force a complete rebuild with no cache:
```bash
ssh hermes-admin@192.168.40.10 "cd /opt/update-manager && sudo docker compose down && sudo docker compose build --no-cache && sudo docker compose up -d"
```

#### Verification

```bash
# Check bot restarted with new code
ssh hermes-admin@192.168.40.10 "docker logs update-manager 2>&1 | tail -5"

# Verify specific code change is present
ssh hermes-admin@192.168.40.10 "docker exec update-manager cat /app/update_manager.py | grep -A5 'handle_help'"
```

#### How to Avoid in the Future

Always use `--no-cache` when rebuilding after code changes:
```bash
sudo docker compose build --no-cache && sudo docker compose up -d
```

---

### Authentik ForwardAuth "Not Found" Error

**Resolved**: December 21, 2025

#### Problem Statement

When accessing services protected by Authentik ForwardAuth (e.g., Grafana, Prometheus, Jaeger), users receive a "not found" error instead of being redirected to the Authentik login page.

Example services affected:
- https://grafana.hrmsmrflrii.xyz
- https://prometheus.hrmsmrflrii.xyz
- https://uptime.hrmsmrflrii.xyz

#### Root Cause

The Authentik **Embedded Outpost had no providers assigned**. Although the proxy providers and applications were created correctly, they were never bound to the outpost. The outpost is responsible for handling ForwardAuth requests from Traefik.

Verification showed:
```python
# Empty provider list in outpost
[('authentik Embedded Outpost', 'proxy', [])]
```

#### Fix

Add all proxy providers to the Embedded Outpost via the Authentik shell:

```bash
ssh hermes-admin@192.168.40.21 "sudo docker exec authentik-server ak shell -c \"
from authentik.providers.proxy.models import ProxyProvider
from authentik.outposts.models import Outpost

# Get all proxy providers
providers = list(ProxyProvider.objects.all())

# Get the embedded outpost
outpost = Outpost.objects.get(name='authentik Embedded Outpost')

# Add all providers to the outpost
for p in providers:
    outpost.providers.add(p)
outpost.save()

print(f'Added {len(providers)} providers to outpost')
\""
```

#### Verification

```bash
# Check providers are assigned
ssh hermes-admin@192.168.40.21 "sudo docker exec authentik-server ak shell -c \"
from authentik.outposts.models import Outpost
outpost = Outpost.objects.get(name='authentik Embedded Outpost')
print(f'Outpost has {outpost.providers.count()} providers')
\""

# Test ForwardAuth - should return 302 (redirect to login)
curl -s -k -o /dev/null -w "%{http_code}" https://grafana.hrmsmrflrii.xyz
# Expected: 302
```

#### How to Avoid in the Future

When creating new Authentik proxy providers via blueprints or the UI:

1. **Always assign to the Embedded Outpost** - In the Authentik Admin UI, go to Applications > Outposts > authentik Embedded Outpost > Edit and ensure all proxy providers are selected
2. **Blueprint automation** - Include outpost assignment in blueprints:
   ```yaml
   - model: authentik_outposts.outpost
     identifiers:
       name: authentik Embedded Outpost
     attrs:
       providers:
         - !Find [authentik_providers_proxy.proxyprovider, [name, my-provider]]
   ```
3. **Verification step** - After creating providers, always verify the outpost has them assigned before testing

---

### Kubernetes kubectl Connection Refused

**Resolved**: December 20, 2025

#### Problem Statement

When running `kubectl` commands on non-primary Kubernetes controller nodes (controller02, controller03):

```
E1220 15:24:01.489681    5376 memcache.go:265] couldn't get current server API group list: Get "http://localhost:8080/api?timeout=32s": dial tcp [::1]:8080: connect: connection refused
The connection to the server localhost:8080 was refused - did you specify the right host or port?
```

#### Root Cause

The kubeconfig file (`~/.kube/config`) was not set up for the `hermes-admin` user on non-primary controller nodes. When `kubeadm init` is run on the primary controller, it only sets up the admin kubeconfig on that node.

#### Fix

Copy the kubeconfig from the primary controller to secondary controllers:

```bash
ssh hermes-admin@192.168.20.32 "cat ~/.kube/config" | ssh hermes-admin@192.168.20.33 "mkdir -p ~/.kube && cat > ~/.kube/config && chmod 600 ~/.kube/config"
ssh hermes-admin@192.168.20.32 "cat ~/.kube/config" | ssh hermes-admin@192.168.20.34 "mkdir -p ~/.kube && cat > ~/.kube/config && chmod 600 ~/.kube/config"
```

#### Verification

```bash
for ip in 192.168.20.32 192.168.20.33 192.168.20.34; do
  echo "=== $ip ==="
  ssh hermes-admin@$ip "kubectl get nodes --no-headers | head -3"
done
```

#### How to Avoid in the Future

Add kubeconfig distribution to the Kubernetes Ansible playbook post-deployment tasks.

---

### GitLab Unsupported Config Value (grafana)

**Resolved**: December 20, 2025

#### Problem Statement

GitLab container enters a restart loop with:
```
FATAL: Mixlib::Config::UnknownConfigOptionError: Reading unsupported config value grafana.
```

#### Root Cause

GitLab removed bundled Grafana support. The deprecated `grafana['enable'] = false` line causes configuration failure.

#### Fix

Remove `grafana['enable'] = false` from GITLAB_OMNIBUS_CONFIG in `/opt/gitlab/docker-compose.yml`, then restart:

```bash
cd /opt/gitlab && sudo docker compose down && sudo docker compose up -d
```

#### Verification

```bash
docker ps --filter name=gitlab
docker exec gitlab gitlab-ctl status
```

---

## Common Issues

### Connection Refused Errors

**Symptom**: `dial tcp 192.168.20.21:8006: connectex: No connection could be made`

**Cause**: Proxmox API temporarily unavailable during heavy operations

**Solution**: Wait and retry, or check Proxmox node status:
```bash
ssh root@192.168.20.21 "systemctl status pveproxy"
```

---

### Template Not Found (LXC)

**Symptom**: `template 'local:vztmpl/...' does not exist`

**Solution**: Download template on target node:
```bash
ssh root@<node> "pveam update && pveam download local ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
```

---

### Tainted Resources

**Symptom**: Resources marked as tainted, requiring replacement

**Solution**: Run `terraform apply` to recreate properly

---

### State Lock

**Symptom**: Terraform state is locked

**Solution**:
1. Ensure no other terraform operations running
2. Force unlock if needed (caution):
   ```bash
   terraform force-unlock <lock-id>
   ```

---

### VLAN-Aware Bridge Missing

**Symptom**: `QEMU exited with code 1` on VM deployment

**Cause**: Node missing VLAN-aware bridge configuration

**Solution**: Configure `/etc/network/interfaces`:
```bash
auto vmbr0
iface vmbr0 inet static
    address 192.168.20.XX/24
    gateway 192.168.20.1
    bridge-ports nic0
    bridge-stp off
    bridge-fd 0
    bridge-vlan-aware yes
    bridge-vids 2-4094
```

Then reload:
```bash
ifreload -a
# or reboot
```

Verify:
```bash
ip -d link show vmbr0 | grep vlan_filtering
# Should show "vlan_filtering 1"
```

---

### NFS Mount Failures

**Symptom**: Mount fails or is stale

**Diagnosis**:
```bash
# Check NFS exports from NAS
showmount -e 192.168.20.31

# Check current mounts
df -h | grep nfs

# Test mount manually
mount -t nfs 192.168.20.31:/volume2/ProxmoxCluster-VMDisks /mnt/test
```

**Common Fixes**:
- Ensure NFS service running on NAS
- Check firewall rules (NFS ports 111, 2049)
- Verify export permissions include Proxmox node IPs
- For stale mounts: `umount -l /mnt/stale && mount -a`

---

## Diagnostic Commands

### Terraform

```bash
# Check state
terraform state list

# Show specific resource
terraform state show module.vms["k8s-controlplane01"].proxmox_vm_qemu.linux_vm

# Refresh state
terraform refresh

# Validate configuration
terraform validate

# Format files
terraform fmt
```

### Proxmox

```bash
# Cluster status
pvecm status

# Node resources
pvesh get /cluster/resources --type node

# VM config
qm config <vmid>

# LXC config
pct config <ctid>

# Service status
systemctl status pve-cluster corosync pveproxy

# Corosync logs
journalctl -xeu corosync

# Core dump analysis
coredumpctl info corosync
```

### Ansible

```bash
# Test connectivity
ansible all -m ping

# Check specific host
ansible docker-vm-media01 -m setup
```

### Network

```bash
# Check VLAN filtering
ip -d link show vmbr0 | grep vlan_filtering

# Check bridge ports
bridge link show

# Check routes
ip route show
```

## Related Documentation

- [Proxmox](./PROXMOX.md) - Cluster configuration
- [Networking](./NETWORKING.md) - Network configuration
- [Terraform](./TERRAFORM.md) - Deployment configuration
- [legacy/TROUBLESHOOTING.md](./legacy/TROUBLESHOOTING.md) - Extended troubleshooting
