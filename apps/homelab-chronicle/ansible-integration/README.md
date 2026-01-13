# Ansible Integration for Homelab Chronicle

This directory contains the Ansible callback plugin that automatically logs playbook runs to the Chronicle timeline app.

## Installation

### 1. Copy the callback plugin

Copy `chronicle_callback.py` to your Ansible callback plugins directory:

```bash
# Create callback_plugins directory if it doesn't exist
mkdir -p ~/ansible/callback_plugins

# Copy the plugin
cp chronicle_callback.py ~/ansible/callback_plugins/
```

### 2. Configure Ansible

Add to your `ansible.cfg`:

```ini
[defaults]
callback_plugins = ./callback_plugins
callback_whitelist = chronicle
```

Or enable globally in `/etc/ansible/ansible.cfg`.

### 3. Set environment variables

```bash
# Required: Chronicle API URL
export CHRONICLE_API_URL=https://chronicle.hrmsmrflrii.xyz

# Optional: API key for authenticated writes (if auth is required)
export CHRONICLE_API_KEY=your-api-key
```

You can add these to your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
echo 'export CHRONICLE_API_URL=https://chronicle.hrmsmrflrii.xyz' >> ~/.bashrc
```

## Usage

Once installed, the plugin automatically sends data to Chronicle:

1. **At playbook start**: Logs that a playbook has begun
2. **At playbook end**: Logs completion with full statistics
3. **On failure**: Records failed task details

Example output in Chronicle:

```
Playbook Completed: deploy-homelab-chronicle.yml (5 changed)
---
Status: COMPLETED
Playbook: deploy-homelab-chronicle.yml
Path: /home/hermes-admin/ansible/services/deploy-homelab-chronicle.yml
Duration: 2m 15s

Host Results:
| Host | OK | Changed | Failed | Skipped |
|------|-----|---------|--------|---------|
| docker-lxc-chronicle | 12 | 5 | 0 | 2 |

Task Summary:
- Total: 14
- Changed: 5
- Failed: 0
- Skipped: 2
```

## Dependencies

The plugin requires the `requests` Python library:

```bash
pip install requests
```

## Troubleshooting

### Plugin not loading

1. Check that `callback_whitelist = chronicle` is in your `ansible.cfg`
2. Verify the plugin file is in the correct directory
3. Check file permissions: `chmod 644 chronicle_callback.py`

### Connection errors

1. Verify `CHRONICLE_API_URL` is set correctly
2. Test connectivity: `curl -I https://chronicle.hrmsmrflrii.xyz/api/webhooks/ansible`
3. Check if the Chronicle container is running

### Missing data

The plugin only sends data for playbooks, not ad-hoc commands. For ad-hoc commands, you'll need to log manually.

## Customization

You can modify the callback plugin to:

- Add custom tags based on playbook path
- Filter which playbooks get logged
- Add additional metadata

See the plugin source code for available hooks and customization options.
