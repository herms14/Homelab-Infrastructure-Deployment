# Discord Integration for Homelab Chronicle

This directory contains a Discord cog for the Sentinel bot that enables Chronicle commands.

## Commands

| Command | Description |
|---------|-------------|
| `/chronicle add` | Add a new event to the timeline |
| `/chronicle recent` | Show recent events |
| `/chronicle search` | Search events |
| `/chronicle stats` | Show statistics |
| `/chronicle on-this-day` | See what happened on this day in history |

## Installation

### 1. Copy the cog to Sentinel

```bash
cp chronicle_cog.py /opt/sentinel-bot/cogs/chronicle.py
```

### 2. Update the bot configuration

Add `chronicle` to your cogs list. In your Sentinel bot's `__init__.py` or main file, ensure the cog is loaded:

```python
# In sentinel.py or bot setup
COGS = [
    'cogs.homelab',
    'cogs.media',
    'cogs.updates',
    'cogs.tasks',
    'cogs.chronicle',  # Add this line
]
```

### 3. Restart Sentinel

```bash
docker restart sentinel-bot
```

Or if running directly:
```bash
systemctl restart sentinel-bot
```

## Usage Examples

### Add an event
```
/chronicle add title:Deployed new service category:Service content:Set up monitoring for PBS node:docker-utils tags:monitoring,prometheus
```

### View recent events
```
/chronicle recent limit:5
```

### Search for events
```
/chronicle search query:traefik category:Network
```

### View statistics
```
/chronicle stats period:month
```

## Configuration

The cog uses the `CHRONICLE_API_URL` environment variable. Default: `https://chronicle.hrmsmrflrii.xyz`

To use a different URL, set in your bot's `.env` file:
```
CHRONICLE_API_URL=https://your-chronicle-url.com
```

## Permissions

The cog uses Discord slash commands and doesn't require special permissions beyond the bot's existing permissions.

For authenticated writes (when Chronicle requires auth), you may need to configure an API key in the cog.
