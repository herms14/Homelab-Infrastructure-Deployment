# Claude Task Queue System

This document describes the Athena-powered task queue system for Claude Code instances.

## Overview

The Claude Task Queue System allows you to:
- Submit tasks to Claude via Discord
- Track task progress across multiple Claude instances
- Receive notifications when tasks are completed
- Manage task priorities and queue status

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Discord Server                               │
│  ┌─────────────────┐                                                │
│  │ #claude-tasks   │◄──── User: /task "Deploy new service"         │
│  │                 │───── Athena: "Task #12 queued"                 │
│  │                 │◄──── Athena: "Task #12 completed!"             │
│  └─────────────────┘                                                │
└─────────────────────────────────────────────────────────────────────┘
            │                           ▲
            ▼                           │
┌─────────────────────────────────────────────────────────────────────┐
│  LXC 201: docker-lxc-bots (192.168.40.14)                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Athena Bot (Port 5051)                                      │  │
│  │  ├── Discord Bot (commands + notifications)                  │  │
│  │  ├── REST API (for Claude instances)                         │  │
│  │  └── SQLite Database (task storage)                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
            │                           ▲
            │         REST API          │
            ▼                           │
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│ Claude Instance 1 │  │ Claude Instance 2 │  │ Claude Instance 3 │
│ (MacBook)         │  │ (Windows PC)      │  │ (Server)          │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

## Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **Athena Bot** | LXC 201 (192.168.40.14:5051) | Discord bot + REST API + SQLite |
| **Claude Task Client** | Any machine with Python | CLI for Claude instances |
| **Discord Channel** | #claude-tasks | Task submission and notifications |

## Discord Commands

| Command | Description |
|---------|-------------|
| `/task <description>` | Submit a new task to the queue |
| `/queue` | View all pending and in-progress tasks |
| `/status` | Show Claude instance status and queue stats |
| `/done` | View recently completed tasks |
| `/priority <id> <level>` | Change task priority (high/medium/low) |
| `/cancel <id>` | Cancel a pending task |
| `/athena` | Display help and bot info |

## CLI Commands (claude-task-client.py)

| Command | Description |
|---------|-------------|
| `python claude-task-client.py check` | Startup check for pending tasks |
| `python claude-task-client.py list` | List all pending tasks |
| `python claude-task-client.py next` | Get the next available task |
| `python claude-task-client.py claim <id>` | Claim a task for processing |
| `python claude-task-client.py complete <id>` | Mark task as completed |
| `python claude-task-client.py add "description"` | Add a new task |
| `python claude-task-client.py status` | Show queue statistics |

## REST API Endpoints

Base URL: `http://192.168.40.14:5051`

All endpoints require `X-API-Key: athena-homelab-key` header.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check (no auth required) |
| `/api/tasks` | GET | List pending tasks |
| `/api/tasks` | POST | Create a new task |
| `/api/tasks/next` | GET | Get next available task |
| `/api/tasks/<id>/claim` | POST | Claim a task |
| `/api/tasks/<id>/status` | PUT | Update task status/notes |
| `/api/tasks/<id>/complete` | POST | Mark task as completed |
| `/api/stats` | GET | Get queue statistics |
| `/api/instance/heartbeat` | POST | Register Claude instance |

## Task Workflow

```
1. User submits task via Discord: /task "Deploy new monitoring stack"
   └── Athena adds to queue with status: pending

2. Claude instance starts and checks queue
   └── CLI: python claude-task-client.py check
   └── Shows: "1 task(s) pending - Next: #5 Deploy new monitoring stack"

3. Claude claims the task
   └── CLI: python claude-task-client.py claim 5
   └── Status changes to: in_progress
   └── Discord notified: "Task #5 claimed by MacBook-Claude"

4. Claude works on the task (normal interaction)

5. Claude completes the task
   └── CLI: python claude-task-client.py complete 5 -n "Deployed Prometheus stack"
   └── Status changes to: completed
   └── Discord notified: "✅ Task #5 Completed!"
```

## Setup for Claude Instances

### Environment Variables

```bash
# Required for CLI
export ATHENA_API_URL="http://192.168.40.14:5051"
export ATHENA_API_KEY="athena-homelab-key"

# Optional - instance identification
export CLAUDE_INSTANCE="macbook-pro"
export CLAUDE_INSTANCE_NAME="MacBook Pro - Claude Code"
```

### Quick Start

```bash
# Check for pending tasks
python claude-task-client.py check

# Claim and work on a task
python claude-task-client.py claim 1

# When done
python claude-task-client.py complete 1 -n "Task completed successfully"
```

## Multi-Instance Support

The system supports multiple Claude instances running simultaneously:

- **Task Locking**: When a task is claimed, it's locked to that instance
- **Instance Registry**: Each instance registers with a heartbeat
- **Stale Task Recovery**: Tasks in_progress for >2 hours are reset to pending
- **Concurrent Access**: SQLite with proper locking prevents race conditions

## File Locations

```
LXC 201 (192.168.40.14):
├── /opt/athena-bot/
│   ├── athena-bot.py
│   ├── docker-compose.yml
│   └── data/
│       └── tasks.db

Local Repository:
├── ansible-playbooks/claude-tasks/
│   ├── athena-bot.py
│   ├── claude-task-client.py
│   └── deploy-athena-bot.yml
```

## Troubleshooting

### Bot not responding
```bash
# Check container status
ssh root@192.168.40.14 "docker logs athena-bot --tail 50"

# Restart bot
ssh root@192.168.40.14 "cd /opt/athena-bot && docker compose restart"
```

### API connection failed
```bash
# Test health endpoint
curl http://192.168.40.14:5051/health

# Test with API key
curl -H "X-API-Key: athena-homelab-key" http://192.168.40.14:5051/api/stats
```

### Task stuck in_progress
Tasks are automatically reset after 2 hours. To manually reset:
```bash
# Via Discord
/cancel <task_id>

# Or recreate the task
/task "Original task description"
```

---

## Related Documentation

- [DISCORD_BOTS.md](./DISCORD_BOTS.md) - All Discord bots overview
- [ATHENA_BOT_TUTORIAL.md](./ATHENA_BOT_TUTORIAL.md) - Step-by-step setup tutorial

---

*Last Updated: December 2024*
*Bot: Athena the Orchestrator*
*Host: LXC 201 (192.168.40.14)*
