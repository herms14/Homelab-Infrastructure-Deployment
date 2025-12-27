# Athena Bot Tutorial: Building a Claude Task Queue System

This tutorial explains how to build and deploy Athena, a Discord bot that manages a task queue for Claude Code instances. You'll learn how to create a bot that combines Discord interactions, a REST API, and SQLite database into a single service.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Part 1: Understanding the System Design](#part-1-understanding-the-system-design)
4. [Part 2: Creating the Discord Application](#part-2-creating-the-discord-application)
5. [Part 3: Building the Bot](#part-3-building-the-bot)
6. [Part 4: The REST API Layer](#part-4-the-rest-api-layer)
7. [Part 5: Database Design](#part-5-database-design)
8. [Part 6: Docker Deployment](#part-6-docker-deployment)
9. [Part 7: Building the CLI Client](#part-7-building-the-cli-client)
10. [Part 8: Testing and Verification](#part-8-testing-and-verification)
11. [Command Reference](#command-reference)
12. [Troubleshooting](#troubleshooting)
13. [Appendix: Complete Code](#appendix-complete-code)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              DISCORD                                      │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  #claude-tasks channel                                             │  │
│  │                                                                    │  │
│  │  User: /task "Deploy monitoring stack"                             │  │
│  │  Athena: 📋 Task #5 Queued - Priority: Medium                      │  │
│  │  Athena: 🔄 Task #5 claimed by MacBook-Claude                      │  │
│  │  Athena: ✅ Task #5 Completed!                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                    Discord Gateway │ WebSocket
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  ATHENA BOT (LXC Container - 192.168.40.14:5051)                        │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐  │
│  │   Discord.py Bot    │  │    Flask REST API   │  │  SQLite Database│  │
│  │                     │  │                     │  │                 │  │
│  │  • Slash Commands   │  │  • GET /api/tasks   │  │  • tasks table  │  │
│  │  • Notifications    │◄─┤  • POST /api/claim  │◄─┤  • task_logs    │  │
│  │  • Embeds           │  │  • POST /complete   │  │  • instances    │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘  │
│           │                        ▲                                     │
│           │ asyncio                │ threading                           │
│           └────────────────────────┘                                     │
└──────────────────────────────────────────────────────────────────────────┘
                                    ▲
                         HTTP/REST  │
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  Claude Instance 1  │  │  Claude Instance 2  │  │  Claude Instance 3  │
│  (MacBook)          │  │  (Windows PC)       │  │  (Server)           │
│                     │  │                     │  │                     │
│  claude-task-client │  │  claude-task-client │  │  claude-task-client │
│  python CLI         │  │  python CLI         │  │  python CLI         │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### Key Concepts Explained

| Concept | Definition | Why We Need It |
|---------|------------|----------------|
| **Discord.py** | Python library for Discord bots | Handles Discord API, slash commands, and real-time events |
| **Flask** | Lightweight Python web framework | Provides REST API for Claude instances to interact |
| **SQLite** | File-based SQL database | Stores tasks persistently without external database server |
| **Threading** | Running code in parallel | Flask and Discord.py need to run simultaneously |
| **Asyncio** | Python async/await framework | Discord.py is async; we bridge it with threading |
| **Slash Commands** | Discord's modern command system | `/task`, `/queue`, etc. with autocomplete |
| **REST API** | HTTP-based service interface | Stateless, universal way for Claude instances to communicate |

---

## 2. Prerequisites

### Infrastructure Requirements

| Component | Requirement | Purpose |
|-----------|-------------|---------|
| **LXC Container** | 2GB RAM, 2 vCPU, 8GB disk | Host for Athena bot |
| **Docker** | Installed in LXC | Container runtime |
| **Network** | Access to 192.168.40.0/24 | Claude instances need to reach the API |
| **Tailscale** | Optional but recommended | Remote access from outside network |

### Software/Accounts Needed

| Item | Where to Get It |
|------|-----------------|
| Discord Account | https://discord.com |
| Discord Server | Create one or use existing |
| Discord Developer Account | https://discord.com/developers |
| Python 3.12+ | Included in Docker image |

### Network Requirements

| From | To | Port | Protocol |
|------|----|------|----------|
| Discord | Internet | 443 | HTTPS/WSS |
| Claude Instances | LXC (192.168.40.14) | 5051 | HTTP |
| Tailscale Clients | LXC | 5051 | HTTP |

---

## Part 1: Understanding the System Design

### 1.1 Why This Architecture?

The system needs to solve several challenges:

1. **Multi-Instance Coordination**: Multiple Claude Code sessions might run simultaneously
2. **Task Persistence**: Tasks should survive bot restarts
3. **User-Friendly Interface**: Discord provides a familiar interface for task submission
4. **Programmatic Access**: Claude instances need an API to check/claim/complete tasks

### 1.2 The Three Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        ATHENA BOT                                │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │  DISCORD BOT │   │   REST API   │   │   DATABASE   │        │
│  │              │   │              │   │              │        │
│  │  User-facing │   │  Machine-to- │   │  Persistent  │        │
│  │  interface   │   │  machine     │   │  storage     │        │
│  │              │   │  interface   │   │              │        │
│  │  /task       │   │  POST /claim │   │  SQLite      │        │
│  │  /queue      │   │  GET /tasks  │   │  tasks.db    │        │
│  │  /status     │   │  POST /done  │   │              │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                    Shared State (Database)                       │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Data Flow

```
SUBMIT TASK:
User Discord ──► Discord API ──► Athena Bot ──► SQLite ──► Notification

CHECK TASKS:
Claude CLI ──► REST API ──► SQLite ──► JSON Response ──► CLI Output

CLAIM TASK:
Claude CLI ──► REST API ──► SQLite (lock) ──► Discord Notification

COMPLETE TASK:
Claude CLI ──► REST API ──► SQLite ──► Discord Notification (with next task)
```

---

## Part 2: Creating the Discord Application

### Step 2.1: Create Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Name: `Athena` (or any name you prefer)
4. Click **"Create"**

### Step 2.2: Configure Bot

1. In left sidebar, click **"Bot"**
2. Click **"Reset Token"** and copy the token (save it securely!)
3. Enable **Privileged Gateway Intents**:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent

> **Note:** These intents are required for the bot to see channel names and process commands properly.

### Step 2.3: Generate Invite URL

1. Go to **"OAuth2"** → **"URL Generator"**
2. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Select bot permissions:
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Use Slash Commands
4. Copy the generated URL and open it in browser
5. Select your Discord server and authorize

### Step 2.4: Create Channel

1. In your Discord server, create a new text channel
2. Name it `claude-tasks` (or configure a different name in the bot)
3. Optionally add a description: "Task queue for Claude Code"

---

## Part 3: Building the Bot

### Step 3.1: Project Structure

```
athena-bot/
├── athena-bot.py          # Main bot script
├── docker-compose.yml     # Container configuration
└── data/
    └── tasks.db          # SQLite database (created automatically)
```

### Step 3.2: Bot Initialization

The bot uses Discord.py with application commands (slash commands):

```python
import discord
from discord import app_commands
from discord.ext import commands

class AthenaBot(commands.Bot):
    def __init__(self):
        # Intents define what events the bot receives
        intents = discord.Intents.default()
        intents.message_content = True  # Required for message processing

        super().__init__(command_prefix='!', intents=intents)

    async def setup_hook(self):
        # Sync slash commands with Discord
        await self.tree.sync()
        print("[Discord] Slash commands synced")

    async def on_ready(self):
        print(f"[Discord] Logged in as {self.user}")
```

**Line-by-Line Explanation:**

| Line | Purpose |
|------|---------|
| `intents = discord.Intents.default()` | Request default Discord events |
| `intents.message_content = True` | Enable reading message content |
| `command_prefix='!'` | Legacy prefix (not used with slash commands) |
| `await self.tree.sync()` | Register slash commands with Discord |

### Step 3.3: Slash Commands

Slash commands use decorators to define their behavior:

```python
@bot.tree.command(name="task", description="Submit a new task for Claude")
@app_commands.describe(
    description="What task should Claude work on?",
    priority="Task priority level"
)
@app_commands.choices(priority=[
    app_commands.Choice(name="🔴 High", value="high"),
    app_commands.Choice(name="🟡 Medium", value="medium"),
    app_commands.Choice(name="🟢 Low", value="low")
])
async def submit_task(
    interaction: discord.Interaction,
    description: str,
    priority: str = "medium"
):
    # Insert task into database
    # Send confirmation embed
    pass
```

**Decorator Explanation:**

| Decorator | Purpose |
|-----------|---------|
| `@bot.tree.command()` | Define a slash command |
| `@app_commands.describe()` | Add parameter descriptions |
| `@app_commands.choices()` | Create dropdown options |
| `async def` | Discord.py is async, all handlers must be async |
| `interaction` | Represents the user's command invocation |

### Step 3.4: Channel Restriction

To restrict commands to specific channels:

```python
ALLOWED_CHANNELS = ['claude-tasks']

def check_channel(interaction: discord.Interaction) -> bool:
    """Check if command is used in allowed channel."""
    return interaction.channel.name in ALLOWED_CHANNELS

# In command handler:
async def some_command(interaction):
    if not check_channel(interaction):
        await interaction.response.send_message(
            "⚠️ This command only works in #claude-tasks",
            ephemeral=True  # Only visible to user
        )
        return
    # Continue with command...
```

### Step 3.5: Discord Embeds

Embeds provide rich formatting:

```python
embed = discord.Embed(
    title="📋 Task Queued",
    description="Deploy new monitoring stack",
    color=discord.Color.blue()
)
embed.add_field(name="Task ID", value="#5", inline=True)
embed.add_field(name="Priority", value="🟡 Medium", inline=True)
embed.set_footer(text="Submitted by @hermes")

await interaction.response.send_message(embed=embed)
```

---

## Part 4: The REST API Layer

### Step 4.1: Flask Setup

Flask runs in a separate thread alongside the Discord bot:

```python
from flask import Flask, request, jsonify
import threading

api = Flask(__name__)

@api.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

def run_flask():
    """Run Flask in background thread."""
    from werkzeug.serving import make_server
    server = make_server('0.0.0.0', 5051, api, threaded=True)
    server.serve_forever()

# In main():
flask_thread = threading.Thread(target=run_flask, daemon=True)
flask_thread.start()
```

**Why Threading?**

Discord.py uses asyncio (async/await), while Flask is synchronous. We run Flask in a daemon thread so both can operate simultaneously:

```
Main Thread (asyncio event loop)     Background Thread
├── Discord.py Bot                   └── Flask API Server
│   ├── Handle slash commands            ├── GET /api/tasks
│   ├── Send notifications               ├── POST /api/claim
│   └── Background tasks                 └── POST /api/complete
```

### Step 4.2: API Authentication

Simple API key authentication:

```python
API_KEY = os.getenv('API_KEY', 'athena-homelab-key')

def require_api_key(f):
    """Decorator to require API key."""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        key = request.headers.get('X-API-Key')
        if key != API_KEY:
            return jsonify({'error': 'Invalid API key'}), 401
        return f(*args, **kwargs)
    return decorated

@api.route('/api/tasks', methods=['GET'])
@require_api_key
def list_tasks():
    # Only accessible with valid API key
    pass
```

### Step 4.3: Bridging Flask and Discord

When the API needs to notify Discord (e.g., task claimed), we bridge the threads:

```python
import asyncio

# Reference to the Discord bot's event loop
bot_loop = None  # Set when bot starts

async def notify_discord(message):
    """Send notification to Discord channel."""
    if bot.notification_channel:
        await bot.notification_channel.send(message)

# In Flask endpoint:
@api.route('/api/tasks/<int:task_id>/complete', methods=['POST'])
@require_api_key
def complete_task(task_id):
    # Update database...

    # Notify Discord (from Flask thread to asyncio)
    asyncio.run_coroutine_threadsafe(
        notify_discord(f"Task #{task_id} completed!"),
        bot.loop  # Discord bot's event loop
    )

    return jsonify({'status': 'completed'})
```

**Key Concept:** `run_coroutine_threadsafe` safely schedules an async function to run on the Discord bot's event loop from a different thread.

---

## Part 5: Database Design

### Step 5.1: Schema

```sql
-- Tasks table: stores all tasks
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending',      -- pending, in_progress, completed, cancelled
    priority TEXT DEFAULT 'medium',      -- high, medium, low
    instance_id TEXT,                    -- which Claude claimed it
    instance_name TEXT,                  -- human-readable instance name
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    claimed_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    submitted_by TEXT
);

-- Task logs: audit trail
CREATE TABLE task_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    action TEXT,                         -- created, claimed, completed, cancelled
    details TEXT,
    instance_id TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Instances: track Claude instances
CREATE TABLE instances (
    id TEXT PRIMARY KEY,
    name TEXT,
    last_seen TIMESTAMP,
    current_task_id INTEGER,
    status TEXT DEFAULT 'idle'           -- idle, working
);
```

### Step 5.2: Thread-Safe Database Access

SQLite requires careful handling in multi-threaded environments:

```python
from contextlib import contextmanager
import sqlite3

@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = sqlite3.connect(DB_PATH, timeout=30)  # Wait up to 30s for lock
    conn.row_factory = sqlite3.Row  # Return dict-like rows
    try:
        yield conn
    finally:
        conn.close()

# Usage:
with get_db() as conn:
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks WHERE status = ?', ('pending',))
    tasks = cursor.fetchall()
```

**Why Context Manager?**
- Ensures connection is always closed
- Handles exceptions gracefully
- `timeout=30` prevents deadlocks in multi-threaded access

### Step 5.3: Task Claiming (Race Condition Prevention)

When multiple instances try to claim the same task:

```python
def claim_task(task_id, instance_id):
    with get_db() as conn:
        cursor = conn.cursor()

        # Atomic update: only succeeds if task is still pending
        cursor.execute('''
            UPDATE tasks
            SET status = 'in_progress',
                instance_id = ?,
                claimed_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'pending'
        ''', (instance_id, task_id))

        # Check if we got it
        if cursor.rowcount == 0:
            return False  # Someone else claimed it

        conn.commit()
        return True
```

The `WHERE status = 'pending'` ensures only one instance can claim a task.

---

## Part 6: Docker Deployment

### Step 6.1: Docker Compose Configuration

```yaml
services:
  athena-bot:
    image: python:3.12-slim
    container_name: athena-bot
    restart: unless-stopped
    working_dir: /app
    command: >
      bash -c "pip install --no-cache-dir discord.py flask aiohttp && python -u athena-bot.py"
    ports:
      - "5051:5051"
    environment:
      - DISCORD_TOKEN=your_token_here
      - API_PORT=5051
      - API_KEY=athena-homelab-key
      - DB_PATH=/app/data/tasks.db
      - ALLOWED_CHANNELS=claude-tasks
      - TZ=Asia/Manila
    volumes:
      - ./athena-bot.py:/app/athena-bot.py:ro
      - ./data:/app/data
    security_opt:
      - apparmor=unconfined  # Required for Docker-in-LXC
```

**Configuration Explained:**

| Setting | Purpose |
|---------|---------|
| `image: python:3.12-slim` | Base Python image (small footprint) |
| `command: bash -c "pip install..."` | Install deps at runtime (no Dockerfile needed) |
| `ports: "5051:5051"` | Expose API port |
| `volumes: ./athena-bot.py:/app/...` | Mount script (changes reflect immediately) |
| `volumes: ./data:/app/data` | Persist SQLite database |
| `security_opt: apparmor=unconfined` | Required for Docker inside LXC containers |

### Step 6.2: LXC-Specific Considerations

When running Docker inside an LXC container:

```bash
# LXC features required (set in Proxmox)
features: nesting=1,fuse=1,keyctl=1

# In docker-compose.yml:
security_opt:
  - apparmor=unconfined
```

> **Note:** Docker builds often fail in LXC due to AppArmor restrictions. Using pre-built images with volume mounts is more reliable.

### Step 6.3: Deployment Commands

```bash
# Create directory
mkdir -p /opt/athena-bot/data

# Copy files
scp athena-bot.py root@192.168.40.14:/opt/athena-bot/
scp docker-compose.yml root@192.168.40.14:/opt/athena-bot/

# Start container
ssh root@192.168.40.14 "cd /opt/athena-bot && docker compose up -d"

# Check logs
ssh root@192.168.40.14 "docker logs athena-bot --tail 50"
```

---

## Part 7: Building the CLI Client

### Step 7.1: Client Architecture

The CLI client is a standalone Python script that calls the REST API:

```
claude-task-client.py
├── API Client (urllib)
├── Commands
│   ├── list    - Show pending tasks
│   ├── next    - Get next task
│   ├── claim   - Claim a task
│   ├── complete - Mark done
│   ├── add     - Submit task
│   └── status  - Queue stats
└── Configuration (env vars)
```

### Step 7.2: API Client Implementation

Using only Python standard library (no dependencies):

```python
import urllib.request
import urllib.error
import json

API_URL = os.getenv('ATHENA_API_URL', 'http://192.168.40.14:5051')
API_KEY = os.getenv('ATHENA_API_KEY', 'athena-homelab-key')

def api_request(endpoint, method='GET', data=None):
    """Make API request to Athena."""
    url = f"{API_URL}{endpoint}"

    headers = {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
    }

    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return {'error': str(e), 'status': e.code}
```

### Step 7.3: Command Implementation

```python
def cmd_claim(args):
    """Claim a task."""
    result = api_request(f'/api/tasks/{args.task_id}/claim', 'POST', {
        'instance_id': socket.gethostname(),
        'instance_name': os.getenv('CLAUDE_INSTANCE_NAME', socket.gethostname())
    })

    if 'error' in result:
        print(f"Error: {result['error']}")
        return 1

    print(f"✅ Task #{args.task_id} claimed!")
    return 0
```

### Step 7.4: Argument Parsing

```python
import argparse

def main():
    parser = argparse.ArgumentParser(description='Claude Task Client')
    subparsers = parser.add_subparsers(dest='command')

    # claim command
    claim_parser = subparsers.add_parser('claim', help='Claim a task')
    claim_parser.add_argument('task_id', type=int, help='Task ID')

    # complete command
    complete_parser = subparsers.add_parser('complete', help='Complete a task')
    complete_parser.add_argument('task_id', type=int)
    complete_parser.add_argument('-n', '--notes', help='Completion notes')

    args = parser.parse_args()

    commands = {
        'claim': cmd_claim,
        'complete': cmd_complete,
        # ...
    }

    return commands[args.command](args)
```

---

## Part 8: Testing and Verification

### Step 8.1: Verify Bot Connection

```bash
# Check container is running
docker ps | grep athena

# Check logs for successful login
docker logs athena-bot --tail 20
# Should see: [Discord] Logged in as Athena#1234
```

### Step 8.2: Test API Endpoints

```bash
# Health check (no auth)
curl http://192.168.40.14:5051/health
# {"status":"healthy","service":"athena-bot"}

# Get stats (with auth)
curl -H "X-API-Key: athena-homelab-key" \
     http://192.168.40.14:5051/api/stats
# {"pending":0,"in_progress":0,"completed":1,...}

# Create task via API
curl -X POST -H "X-API-Key: athena-homelab-key" \
     -H "Content-Type: application/json" \
     -d '{"description":"Test task","priority":"low"}' \
     http://192.168.40.14:5051/api/tasks
# {"task_id":1,"status":"pending"}
```

### Step 8.3: Test Discord Commands

In `#claude-tasks` channel:
1. Type `/task Test from Discord` → Should see embed confirmation
2. Type `/queue` → Should show the task
3. Type `/status` → Should show queue stats

### Step 8.4: Test CLI Client

```bash
# Check for tasks
python claude-task-client.py check
# 📋 1 task(s) pending

# Claim task
python claude-task-client.py claim 1
# ✅ Task #1 claimed

# Complete task
python claude-task-client.py complete 1 -n "Done!"
# ✅ Task #1 completed
```

---

## Command Reference

### Discord Commands

| Command | Parameters | Description |
|---------|------------|-------------|
| `/task` | description, priority | Submit new task |
| `/queue` | - | View pending tasks |
| `/status` | - | Instance and queue stats |
| `/done` | limit | Recently completed tasks |
| `/priority` | task_id, level | Change priority |
| `/cancel` | task_id | Cancel pending task |
| `/athena` | - | Help information |

### CLI Commands

| Command | Parameters | Description |
|---------|------------|-------------|
| `check` | - | Startup summary |
| `list` | - | All pending tasks |
| `next` | - | Next available task |
| `claim` | task_id | Claim for processing |
| `complete` | task_id, -n notes | Mark completed |
| `add` | description, -p priority | Create task |
| `status` | - | Queue statistics |

### API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/api/tasks` | GET | Yes | List tasks |
| `/api/tasks` | POST | Yes | Create task |
| `/api/tasks/next` | GET | Yes | Get next task |
| `/api/tasks/<id>/claim` | POST | Yes | Claim task |
| `/api/tasks/<id>/complete` | POST | Yes | Complete task |
| `/api/stats` | GET | Yes | Queue stats |

---

## Troubleshooting

### Bot Not Responding to Commands

| Symptom | Cause | Solution |
|---------|-------|----------|
| Commands don't appear | Not synced | Restart bot, check "Slash commands synced" log |
| "Not authorized" | Wrong channel | Use command in #claude-tasks |
| No response at all | Bot offline | Check `docker logs athena-bot` |

### API Connection Failed

```bash
# Test connectivity
curl http://192.168.40.14:5051/health

# If connection refused:
# 1. Check container is running
docker ps | grep athena

# 2. Check port is exposed
docker port athena-bot

# 3. Check firewall
iptables -L -n | grep 5051
```

### Database Locked

If you see "database is locked" errors:

```bash
# Stop all containers accessing the database
docker compose down

# Check for stale processes
lsof /opt/athena-bot/data/tasks.db

# Restart
docker compose up -d
```

### Task Stuck in in_progress

Tasks are automatically reset after 2 hours. To manually fix:

```bash
# Connect to SQLite
sqlite3 /opt/athena-bot/data/tasks.db

# Reset stuck tasks
UPDATE tasks SET status='pending', instance_id=NULL WHERE status='in_progress';
```

---

## Appendix: Complete Code

The complete source files are located at:

```
ansible-playbooks/claude-tasks/
├── athena-bot.py           # Main bot (~600 lines)
├── claude-task-client.py   # CLI client (~250 lines)
└── deploy-athena-bot.yml   # Ansible playbook
```

### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DISCORD_TOKEN` | (required) | Bot token from Discord |
| `API_PORT` | 5051 | REST API port |
| `API_KEY` | athena-homelab-key | API authentication key |
| `DB_PATH` | /app/data/tasks.db | SQLite database path |
| `ALLOWED_CHANNELS` | claude-tasks | Comma-separated channel list |
| `NOTIFICATION_CHANNEL` | claude-tasks | Channel for notifications |
| `TZ` | UTC | Timezone for timestamps |

### CLI Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ATHENA_API_URL` | http://192.168.40.14:5051 | API base URL |
| `ATHENA_API_KEY` | athena-homelab-key | API key |
| `CLAUDE_INSTANCE` | hostname | Instance identifier |
| `CLAUDE_INSTANCE_NAME` | hostname | Human-readable name |

---

## Summary

In this tutorial, you learned how to:

1. **Design a multi-component system** combining Discord bot, REST API, and SQLite
2. **Create Discord slash commands** with decorators and interactions
3. **Run Flask and Discord.py together** using threading
4. **Bridge async and sync code** with `run_coroutine_threadsafe`
5. **Deploy in Docker** with LXC-specific workarounds
6. **Build a CLI client** for programmatic access
7. **Handle concurrent access** with proper database locking

The Athena bot now provides a complete task queue system for coordinating work across multiple Claude Code instances, with real-time Discord notifications and a REST API for automation.

---

*Tutorial created: December 2024*
*Bot: Athena the Orchestrator*
*Author: Claude Code*
