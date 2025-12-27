# Discord Bot Deployment Tutorial

A comprehensive guide to creating, deploying, and managing Discord bots in Docker containers on Proxmox infrastructure. This tutorial covers the complete workflow from Discord application creation to production deployment in LXC containers.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Part 1: Creating a Discord Application](#part-1-creating-a-discord-application)
4. [Part 2: Writing a Python Discord Bot](#part-2-writing-a-python-discord-bot)
5. [Part 3: Containerizing with Docker](#part-3-containerizing-with-docker)
6. [Part 4: Deploying on a VM](#part-4-deploying-on-a-vm)
7. [Part 5: Migrating to LXC Containers](#part-5-migrating-to-lxc-containers)
8. [Part 6: Production Deployment](#part-6-production-deployment)
9. [Troubleshooting](#troubleshooting)
10. [Command Reference](#command-reference)

---

## Architecture Overview

### What We're Building

```
┌─────────────────────────────────────────────────────────────────┐
│                      Proxmox Cluster                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LXC 201: docker-lxc-bots (192.168.40.14)              │   │
│  │                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐                      │   │
│  │  │  Argus Bot  │  │ Chronos Bot │                      │   │
│  │  │ (Container  │  │  (Project   │                      │   │
│  │  │  Updates)   │  │ Management) │                      │   │
│  │  └─────────────┘  └─────────────┘                      │   │
│  │         │                │                              │   │
│  │         └────────┬───────┘                              │   │
│  │                  ↓                                      │   │
│  │            Docker Engine                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  VM: docker-vm-media01 (192.168.40.11)                 │   │
│  │                                                         │   │
│  │  ┌───────────────┐  ┌─────────┐  ┌─────────┐           │   │
│  │  │ Mnemosyne Bot │  │ Radarr  │  │ Sonarr  │           │   │
│  │  │    (Media     │  │         │  │         │           │   │
│  │  │  Downloads)   │  └─────────┘  └─────────┘           │   │
│  │  └───────────────┘                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
                    ┌─────────────────┐
                    │  Discord API    │
                    │  (Cloud)        │
                    └─────────────────┘
```

### Key Concepts

| Term | Definition |
|------|------------|
| **Discord Bot** | An automated program that connects to Discord's API to perform actions |
| **Bot Token** | A secret key that authenticates your bot with Discord |
| **Slash Commands** | Modern Discord commands that start with `/` |
| **Docker Container** | An isolated environment to run your bot |
| **LXC Container** | A lightweight Linux container (like a VM but shares the kernel) |
| **Proxmox** | Virtualization platform that runs VMs and LXC containers |

### Why LXC Instead of VM?

| Aspect | VM | LXC |
|--------|-----|-----|
| **RAM Usage** | 2-4 GB minimum | 512 MB - 2 GB |
| **Disk Space** | 20+ GB | 5-10 GB |
| **Boot Time** | 30-60 seconds | 2-5 seconds |
| **Overhead** | Full OS kernel | Shares host kernel |
| **Isolation** | Complete | Process-level |
| **Docker Support** | Native | Requires configuration |

**Verdict**: LXC is ideal for lightweight services like Discord bots, but requires special configuration for Docker.

---

## Prerequisites

Before starting, ensure you have:

### Infrastructure
- Proxmox VE server (tested on 9.1.2)
- Network access to your Proxmox nodes
- SSH access configured with keys

### Software/Accounts
- Discord account
- Python 3.10+ knowledge (basic)
- Terminal/command line familiarity

### Network Requirements
| Resource | IP (Example) | Purpose |
|----------|--------------|---------|
| Proxmox Node | 192.168.20.20 | Creates containers |
| Bot LXC | 192.168.40.14 | Runs Discord bots |
| DNS Server | 192.168.91.30 | Resolves domain names |

---

## Part 1: Creating a Discord Application

### Step 1.1: Access Discord Developer Portal

1. Go to [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Log in with your Discord account
3. Click **"New Application"** (top-right)

### Step 1.2: Configure Your Application

1. Enter a name (e.g., "Argus - Container Monitor")
2. Accept the Terms of Service
3. Click **Create**

### Step 1.3: Create the Bot

1. In the left sidebar, click **"Bot"**
2. Click **"Add Bot"** → **"Yes, do it!"**
3. Under **"Token"**, click **"Reset Token"**
4. **COPY AND SAVE THIS TOKEN IMMEDIATELY** - you cannot see it again!

```
Example Token Format:
YOUR_BOT_TOKEN_HERE (never share your actual token!)
```

### Step 1.4: Configure Bot Permissions

Under the **Bot** section, enable these **Privileged Gateway Intents**:
- [ ] Presence Intent (optional)
- [ ] Server Members Intent (optional)
- [ ] Message Content Intent (if using text commands)

### Step 1.5: Generate Invite Link

1. Go to **OAuth2** → **URL Generator**
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Use Slash Commands
   - Embed Links
   - Read Message History
4. Copy the generated URL and open it in a browser
5. Select your server and authorize the bot

---

## Part 2: Writing a Python Discord Bot

### Step 2.1: Project Structure

```
my-discord-bot/
├── bot.py              # Main bot code
├── requirements.txt    # Python dependencies
├── Dockerfile         # Container build instructions
└── docker-compose.yml # Container orchestration
```

### Step 2.2: Create requirements.txt

```txt
discord.py>=2.3.0
aiohttp>=3.8.0
```

**Explanation:**
- `discord.py` - Official Discord library for Python
- `aiohttp` - Async HTTP client (for API calls)

### Step 2.3: Create a Basic Bot (bot.py)

```python
#!/usr/bin/env python3
"""
Basic Discord Bot Template
"""
import os
import discord
from discord import app_commands
from discord.ext import commands
import logging

# === Configuration ===
# Read token from environment variable (never hardcode!)
DISCORD_TOKEN = os.environ.get('DISCORD_TOKEN', '')

# Optional: Restrict to specific channels
ALLOWED_CHANNELS = os.environ.get('ALLOWED_CHANNELS', 'general')

# === Logging Setup ===
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# === Bot Setup ===
# Intents control what events the bot can receive
intents = discord.Intents.default()
# intents.message_content = True  # Enable if using text commands

# Create bot instance
bot = commands.Bot(command_prefix='!', intents=intents)


# === Channel Restriction (Optional) ===
def parse_allowed_channels(channels_str: str) -> list:
    """Parse comma-separated channel names/IDs into a list."""
    channels = []
    for ch in channels_str.split(","):
        ch = ch.strip()
        if ch.isdigit():
            channels.append(int(ch))  # Channel ID
        else:
            channels.append(ch.lower())  # Channel name
    return channels

ALLOWED_CHANNEL_LIST = parse_allowed_channels(ALLOWED_CHANNELS)


def is_allowed_channel():
    """Decorator to restrict commands to allowed channels."""
    async def predicate(interaction: discord.Interaction) -> bool:
        channel = interaction.channel
        channel_name = getattr(channel, 'name', '').lower()
        channel_id = getattr(channel, 'id', 0)

        # Check by ID first, then by name
        if channel_id in ALLOWED_CHANNEL_LIST:
            return True
        if channel_name in ALLOWED_CHANNEL_LIST:
            return True

        # Not allowed - send ephemeral error
        await interaction.response.send_message(
            f"This command can only be used in: **#{', #'.join(str(c) for c in ALLOWED_CHANNEL_LIST)}**",
            ephemeral=True  # Only visible to the user
        )
        return False
    return app_commands.check(predicate)


# === Slash Commands ===

@bot.tree.command(name="hello", description="Say hello!")
@is_allowed_channel()  # Remove this line to allow in all channels
async def hello(interaction: discord.Interaction):
    """A simple hello command."""
    await interaction.response.send_message(f"Hello, {interaction.user.name}!")


@bot.tree.command(name="status", description="Show bot status")
@is_allowed_channel()
async def status(interaction: discord.Interaction):
    """Show bot status with an embed."""
    embed = discord.Embed(
        title="Bot Status",
        description="I'm online and working!",
        color=0x00ff00  # Green
    )
    embed.add_field(name="Latency", value=f"{round(bot.latency * 1000)}ms", inline=True)
    embed.add_field(name="Servers", value=str(len(bot.guilds)), inline=True)

    await interaction.response.send_message(embed=embed)


# === Events ===

@bot.event
async def on_ready():
    """Called when the bot successfully connects to Discord."""
    logger.info(f'Logged in as {bot.user} (ID: {bot.user.id})')

    # Sync slash commands with Discord
    try:
        synced = await bot.tree.sync()
        logger.info(f'Synced {len(synced)} slash commands')
    except Exception as e:
        logger.error(f'Failed to sync commands: {e}')


# === Main Entry Point ===

def main():
    if not DISCORD_TOKEN:
        logger.error("DISCORD_TOKEN environment variable not set!")
        return

    logger.info("Starting bot...")
    bot.run(DISCORD_TOKEN)


if __name__ == '__main__':
    main()
```

**Key Concepts Explained:**

| Code | Purpose |
|------|---------|
| `os.environ.get('DISCORD_TOKEN')` | Read token from environment (secure) |
| `intents = discord.Intents.default()` | Permissions for events the bot can see |
| `@bot.tree.command()` | Decorator to create a slash command |
| `@is_allowed_channel()` | Custom decorator to restrict to specific channels |
| `interaction.response.send_message()` | Reply to a slash command |
| `ephemeral=True` | Message only visible to the command user |
| `discord.Embed()` | Rich formatted message with fields |
| `await bot.tree.sync()` | Register commands with Discord |

---

## Part 3: Containerizing with Docker

### What is Docker?

Docker packages your bot and all its dependencies into a **container** - a portable, isolated environment that runs the same everywhere.

```
Without Docker:                    With Docker:
┌──────────────────┐              ┌──────────────────┐
│ Your Computer    │              │ Docker Container │
├──────────────────┤              ├──────────────────┤
│ Python 3.9       │              │ Python 3.12     │
│ discord.py 1.x   │   →→→→→→    │ discord.py 2.x  │
│ Other stuff...   │              │ Only what's     │
│ Conflicts!       │              │ needed - clean! │
└──────────────────┘              └──────────────────┘
```

### Step 3.1: Create Dockerfile

```dockerfile
# Use official Python image as base
FROM python:3.12-slim

# Set working directory inside container
WORKDIR /app

# Copy requirements first (for layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy bot code
COPY bot.py .

# Run the bot
CMD ["python", "-u", "bot.py"]
```

**Line-by-Line Explanation:**

| Line | Meaning |
|------|---------|
| `FROM python:3.12-slim` | Start with a minimal Python 3.12 image |
| `WORKDIR /app` | Create and switch to /app directory |
| `COPY requirements.txt .` | Copy requirements into container |
| `RUN pip install ...` | Install Python packages |
| `--no-cache-dir` | Don't cache pip downloads (smaller image) |
| `COPY bot.py .` | Copy your bot code |
| `CMD ["python", "-u", "bot.py"]` | Command to run when container starts |
| `-u` flag | Unbuffered output (see logs immediately) |

### Step 3.2: Create docker-compose.yml

```yaml
services:
  my-bot:
    build: .                    # Build from Dockerfile in current directory
    container_name: my-bot      # Name for the running container
    restart: unless-stopped     # Auto-restart if it crashes
    environment:
      - DISCORD_TOKEN=your_token_here
      - ALLOWED_CHANNELS=general,bot-commands
      - TZ=America/New_York     # Timezone for logs
    logging:
      driver: json-file
      options:
        max-size: "10m"         # Max log file size
        max-file: "3"           # Keep 3 rotated log files
```

**Key Options Explained:**

| Option | Purpose |
|--------|---------|
| `build: .` | Build image from local Dockerfile |
| `restart: unless-stopped` | Auto-restart on crash, not on manual stop |
| `environment:` | Pass environment variables to container |
| `logging:` | Configure log rotation to prevent disk fill |

### Step 3.3: Build and Run Locally

```bash
# Build the Docker image
docker compose build

# Start the container
docker compose up -d

# View logs
docker logs my-bot -f

# Stop the container
docker compose down
```

**Command Breakdown:**

| Command | What It Does |
|---------|--------------|
| `docker compose build` | Creates the image from Dockerfile |
| `docker compose up -d` | Starts container in background (`-d` = detached) |
| `docker logs my-bot -f` | Follow live logs (`-f` = follow) |
| `docker compose down` | Stops and removes container |

---

## Part 4: Deploying on a VM

### Step 4.1: Prepare the VM

SSH into your VM and create the bot directory:

```bash
# SSH to the VM
ssh hermes-admin@192.168.40.11

# Create directory for the bot
sudo mkdir -p /opt/my-bot
sudo chown $USER:$USER /opt/my-bot
```

### Step 4.2: Transfer Files

From your local machine:

```bash
# Copy files to VM
scp -i ~/.ssh/homelab_ed25519 bot.py requirements.txt Dockerfile docker-compose.yml \
    hermes-admin@192.168.40.11:/opt/my-bot/
```

**SCP Command Explained:**

| Part | Meaning |
|------|---------|
| `scp` | Secure copy over SSH |
| `-i ~/.ssh/homelab_ed25519` | Use this SSH key |
| `bot.py requirements.txt ...` | Files to copy |
| `hermes-admin@192.168.40.11` | User@Host |
| `:/opt/my-bot/` | Destination path |

### Step 4.3: Build and Run on VM

```bash
# SSH to VM
ssh hermes-admin@192.168.40.11

# Navigate to bot directory
cd /opt/my-bot

# Build and start
sudo docker compose up -d --build

# Check status
docker ps

# View logs
docker logs my-bot -f
```

---

## Part 5: Migrating to LXC Containers

### Why LXC?

LXC containers use less resources than VMs. A single LXC can run multiple Discord bots while using only 2GB RAM total vs 2GB per VM.

### The Challenge: Docker in LXC

Docker requires certain kernel features. By default, LXC containers don't have access to all of them.

**Solutions:**
1. Enable `nesting` feature (allows containers inside containers)
2. Enable `fuse` and `keyctl` features
3. Use `apparmor=unconfined` for Docker containers

### Step 5.1: Create LXC Container on Proxmox

SSH to your Proxmox node:

```bash
ssh root@192.168.20.20
```

Create the LXC container:

```bash
pct create 201 /var/lib/vz/template/cache/ubuntu-24.04-standard_24.04-2_amd64.tar.zst \
  --hostname docker-lxc-bots \
  --memory 2048 \
  --cores 2 \
  --rootfs local-lvm:8 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.40.14/24,gw=192.168.40.1,tag=40 \
  --nameserver 192.168.91.30 \
  --features nesting=1,fuse=1,keyctl=1 \
  --unprivileged 1 \
  --onboot 1 \
  --start 1
```

**Command Parameter Breakdown:**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `pct create 201` | Container ID | Unique identifier |
| Template path | `ubuntu-24.04-...` | Base OS template |
| `--hostname` | `docker-lxc-bots` | Container name |
| `--memory` | `2048` | RAM in MB |
| `--cores` | `2` | CPU cores |
| `--rootfs` | `local-lvm:8` | 8GB storage |
| `--net0` | Network config | IP, gateway, VLAN |
| `--features nesting=1` | Enable nesting | Required for Docker |
| `--features fuse=1` | Enable FUSE | Required for overlayfs |
| `--features keyctl=1` | Enable keyctl | Required for Docker |
| `--unprivileged 1` | Unprivileged | Security best practice |
| `--onboot 1` | Auto-start | Start on Proxmox boot |
| `--start 1` | Start now | Don't wait |

### Step 5.2: Install Docker in LXC

Execute commands inside the LXC:

```bash
# Method 1: Using pct exec (from Proxmox host)
pct exec 201 -- bash -c 'apt-get update && apt-get install -y ca-certificates curl gnupg'

# Add Docker's GPG key
pct exec 201 -- bash -c 'install -m 0755 -d /etc/apt/keyrings && \
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
  chmod a+r /etc/apt/keyrings/docker.gpg'

# Add Docker repository
pct exec 201 -- bash -c 'echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu noble stable" > /etc/apt/sources.list.d/docker.list'

# Install Docker
pct exec 201 -- bash -c 'apt-get update && \
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin'
```

**Alternative Method (SSH into LXC):**

```bash
# SSH directly to LXC (if SSH is configured)
ssh root@192.168.40.14

# Then run standard Docker install commands
apt-get update
apt-get install -y ca-certificates curl gnupg
# ... etc
```

### Step 5.3: Deploy Bot in LXC

Create bot directory and files:

```bash
# From Proxmox host
pct exec 201 -- mkdir -p /opt/my-bot
```

Copy bot files to LXC:

```bash
# Method 1: Using pct push
pct push 201 /local/path/bot.py /opt/my-bot/bot.py

# Method 2: Using cat through pct exec
cat bot.py | ssh root@192.168.20.20 "pct exec 201 -- bash -c 'cat > /opt/my-bot/bot.py'"
```

Create docker-compose.yml with AppArmor fix:

```yaml
services:
  my-bot:
    image: python:3.12-slim
    container_name: my-bot
    restart: unless-stopped
    working_dir: /app
    command: >
      bash -c "pip install --no-cache-dir discord.py aiohttp && python -u bot.py"
    environment:
      - DISCORD_TOKEN=your_token_here
      - ALLOWED_CHANNELS=general
      - TZ=America/New_York
    volumes:
      - ./bot.py:/app/bot.py:ro    # Mount script as read-only
    security_opt:
      - apparmor=unconfined        # REQUIRED for Docker in LXC!
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

**Key Differences for LXC:**

| Setting | Why |
|---------|-----|
| `security_opt: apparmor=unconfined` | AppArmor restrictions break Docker in LXC |
| `volumes: ./bot.py:/app/bot.py:ro` | Mount script instead of building (builds can fail in LXC) |
| Using pre-built `python:3.12-slim` | Avoid building images in LXC |
| `pip install` in command | Install at runtime instead of build time |

### Step 5.4: Start the Bot

```bash
# From Proxmox host
pct exec 201 -- bash -c 'cd /opt/my-bot && docker compose up -d'

# Check if running
pct exec 201 -- docker ps

# View logs
pct exec 201 -- docker logs my-bot --tail 20
```

---

## Part 6: Production Deployment

### What We Deployed

| Bot | Location | IP | Purpose |
|-----|----------|-----|---------|
| **Argus** | LXC 201 | 192.168.40.14 | Container update notifications |
| **Chronos** | LXC 201 | 192.168.40.14 | GitLab project management |
| **Mnemosyne** | VM | 192.168.40.11 | Media download tracking |

### Directory Structure on LXC

```
/opt/
├── argus-bot/
│   ├── argus-bot.py
│   └── docker-compose.yml
└── chronos-bot/
    ├── chronos-bot.py
    └── docker-compose.yml
```

### Managing Multiple Bots

```bash
# Check all running containers
docker ps

# Restart a specific bot
cd /opt/argus-bot && docker compose restart

# View logs for all bots
docker logs argus-bot --tail 50
docker logs chronos-bot --tail 50

# Update a bot
cd /opt/argus-bot
docker compose down
# Update bot.py
docker compose up -d
```

### SSH Key Setup for Bot (Argus)

Argus needs to SSH to other hosts to manage containers:

```bash
# Create SSH directory in LXC
pct exec 201 -- mkdir -p /root/.ssh
pct exec 201 -- chmod 700 /root/.ssh

# Copy SSH key to LXC
scp -i ~/.ssh/homelab_ed25519 ~/.ssh/homelab_ed25519 root@192.168.20.20:/tmp/key
ssh root@192.168.20.20 "pct push 201 /tmp/key /root/.ssh/homelab_ed25519 && rm /tmp/key"
pct exec 201 -- chmod 600 /root/.ssh/homelab_ed25519
```

Then mount the key in docker-compose.yml:

```yaml
volumes:
  - /root/.ssh:/root/.ssh:ro
```

---

## Troubleshooting

### Bot Won't Start

```bash
# Check container status
docker ps -a

# View detailed logs
docker logs my-bot

# Check if container is being recreated in a loop
docker ps -a | grep my-bot
```

### "Improper token has been passed"

- Token is wrong or expired
- Go to Discord Developer Portal → Bot → Reset Token
- Update docker-compose.yml with new token
- Restart: `docker compose down && docker compose up -d`

### "Slash commands not appearing"

- Takes up to 1 hour for global commands
- Use `await bot.tree.sync()` in on_ready
- Check bot has `applications.commands` scope

### Docker Build Fails in LXC

Use pre-built images with volume mounts instead:

```yaml
# Instead of:
build: .

# Use:
image: python:3.12-slim
volumes:
  - ./bot.py:/app/bot.py:ro
command: bash -c "pip install ... && python bot.py"
```

### "Permission denied" errors

```bash
# Check ownership
ls -la /opt/my-bot/

# Fix permissions
sudo chown -R $USER:$USER /opt/my-bot/
```

---

## Command Reference

### Docker Commands

| Command | Purpose |
|---------|---------|
| `docker compose up -d` | Start containers in background |
| `docker compose down` | Stop and remove containers |
| `docker compose restart` | Restart containers |
| `docker compose logs -f` | Follow container logs |
| `docker ps` | List running containers |
| `docker ps -a` | List all containers (including stopped) |
| `docker exec -it container bash` | Shell into running container |
| `docker system prune` | Clean unused resources |

### Proxmox LXC Commands

| Command | Purpose |
|---------|---------|
| `pct list` | List all LXC containers |
| `pct status 201` | Check container 201 status |
| `pct start 201` | Start container |
| `pct stop 201` | Stop container |
| `pct exec 201 -- command` | Run command in container |
| `pct push 201 src dest` | Copy file into container |
| `pct set 201 --option value` | Modify container config |

### SSH/SCP Commands

| Command | Purpose |
|---------|---------|
| `ssh user@host` | Connect to remote host |
| `ssh -i key user@host` | Connect using specific key |
| `scp file user@host:path` | Copy file to remote |
| `scp user@host:file local` | Copy file from remote |

---

## Summary

### What We Learned

1. **Discord bots** are Python programs that connect to Discord's API
2. **Docker** packages bots into portable containers
3. **LXC containers** are lightweight alternatives to VMs
4. **Docker in LXC** requires `nesting`, `fuse`, `keyctl` features + `apparmor=unconfined`
5. **Production deployment** uses docker-compose for orchestration

### Files Created

- `bot.py` - The bot's Python code
- `requirements.txt` - Python dependencies
- `Dockerfile` - Build instructions (for VMs)
- `docker-compose.yml` - Container configuration

### Key Commands

```bash
# Create LXC on Proxmox
pct create 201 template.tar.zst --features nesting=1,fuse=1,keyctl=1 ...

# Install Docker in LXC
pct exec 201 -- apt-get install -y docker-ce docker-compose-plugin

# Deploy bot
pct exec 201 -- bash -c 'cd /opt/my-bot && docker compose up -d'

# Check logs
pct exec 201 -- docker logs my-bot --tail 50
```

---

## Appendix: Bot-Specific Configurations

### Argus (Container Updates)

```yaml
environment:
  - DISCORD_TOKEN=xxx
  - WEBHOOK_PORT=5000
  - SSH_KEY_PATH=/root/.ssh/homelab_ed25519
  - ALLOWED_CHANNELS=container-updates
volumes:
  - ./argus-bot.py:/app/argus-bot.py:ro
  - /root/.ssh:/root/.ssh:ro
ports:
  - "5050:5000"
```

### Chronos (Project Management)

```yaml
environment:
  - DISCORD_TOKEN=xxx
  - GITLAB_URL=https://gitlab.hrmsmrflrii.xyz
  - GITLAB_TOKEN=glpat-xxx
  - GITLAB_PROJECT_ID=2
  - ALLOWED_CHANNELS=project-management
```

### Mnemosyne (Media Downloads)

```yaml
environment:
  - DISCORD_TOKEN=xxx
  - RADARR_URL=http://localhost:7878
  - RADARR_API_KEY=xxx
  - SONARR_URL=http://localhost:8989
  - SONARR_API_KEY=xxx
  - ALLOWED_CHANNELS=media-downloads
```

---

*Last Updated: December 2024*
*Created by Claude Code*
