#!/usr/bin/env python3
"""
Athena Bot - Claude Task Queue Orchestrator

A Discord bot that manages a task queue for Claude Code instances.
Features:
- Submit tasks via Discord commands
- REST API for Claude instances to claim/update tasks
- SQLite database for persistent storage
- Multi-instance support with task locking
- Real-time notifications on task completion

Author: Claude Code
Created: December 2024
"""

import os
import sqlite3
import asyncio
import threading
import json
from datetime import datetime, timedelta
from contextlib import contextmanager
from flask import Flask, request, jsonify
from werkzeug.serving import make_server
import discord
from discord import app_commands
from discord.ext import commands, tasks

# =============================================================================
# Configuration
# =============================================================================

DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')
ALLOWED_CHANNELS = os.getenv('ALLOWED_CHANNELS', 'claude-tasks').split(',')
API_PORT = int(os.getenv('API_PORT', '5051'))
API_KEY = os.getenv('API_KEY', 'athena-secret-key')  # For API authentication
DB_PATH = os.getenv('DB_PATH', '/app/data/tasks.db')
NOTIFICATION_CHANNEL = os.getenv('NOTIFICATION_CHANNEL', 'claude-tasks')

# =============================================================================
# Database Setup
# =============================================================================

def init_database():
    """Initialize SQLite database with required tables."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Tasks table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            priority TEXT DEFAULT 'medium',
            instance_id TEXT,
            instance_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            claimed_at TIMESTAMP,
            completed_at TIMESTAMP,
            notes TEXT,
            submitted_by TEXT
        )
    ''')

    # Task history/logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS task_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            action TEXT,
            details TEXT,
            instance_id TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES tasks(id)
        )
    ''')

    # Claude instances registry
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS instances (
            id TEXT PRIMARY KEY,
            name TEXT,
            last_seen TIMESTAMP,
            current_task_id INTEGER,
            status TEXT DEFAULT 'idle'
        )
    ''')

    conn.commit()
    conn.close()
    print(f"[Database] Initialized at {DB_PATH}")

@contextmanager
def get_db():
    """Context manager for database connections with row factory."""
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def log_task_action(task_id: int, action: str, details: str = None, instance_id: str = None):
    """Log an action on a task for audit trail."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO task_logs (task_id, action, details, instance_id)
            VALUES (?, ?, ?, ?)
        ''', (task_id, action, details, instance_id))
        conn.commit()

# =============================================================================
# Discord Bot Setup
# =============================================================================

class AthenaBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        super().__init__(command_prefix='!', intents=intents)
        self.notification_channel = None

    async def setup_hook(self):
        await self.tree.sync()
        print(f"[Discord] Slash commands synced")

    async def on_ready(self):
        print(f"[Discord] Logged in as {self.user} (ID: {self.user.id})")
        print(f"[Discord] Allowed channels: {ALLOWED_CHANNELS}")

        # Find notification channel
        for guild in self.guilds:
            for channel in guild.text_channels:
                # Partial match for channels with emojis
                if NOTIFICATION_CHANNEL.lower() in channel.name.lower() or channel.name.lower() in NOTIFICATION_CHANNEL.lower():
                    self.notification_channel = channel
                    print(f"[Discord] Notification channel: #{channel.name}")
                    break

        # Start background tasks
        self.check_stale_tasks.start()

bot = AthenaBot()

def check_channel(interaction: discord.Interaction) -> bool:
    """Check if command is used in allowed channel (partial match for emoji names)."""
    channel_name = interaction.channel.name.lower()
    for allowed in ALLOWED_CHANNELS:
        if allowed.lower() in channel_name or channel_name in allowed.lower():
            return True
    return False

# =============================================================================
# Discord Commands
# =============================================================================

@bot.tree.command(name="task", description="Submit a new task for Claude to process")
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
    """Submit a new task to the queue."""
    if not check_channel(interaction):
        await interaction.response.send_message(
            f"⚠️ This command only works in allowed channels: {', '.join(ALLOWED_CHANNELS)}",
            ephemeral=True
        )
        return

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO tasks (description, priority, submitted_by)
            VALUES (?, ?, ?)
        ''', (description, priority, str(interaction.user)))
        task_id = cursor.lastrowid
        conn.commit()

    log_task_action(task_id, 'created', f'Priority: {priority}', None)

    priority_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}

    embed = discord.Embed(
        title="📋 Task Queued",
        description=description,
        color=discord.Color.blue()
    )
    embed.add_field(name="Task ID", value=f"#{task_id}", inline=True)
    embed.add_field(name="Priority", value=f"{priority_emoji.get(priority, '🟡')} {priority.title()}", inline=True)
    embed.add_field(name="Status", value="⏳ Pending", inline=True)
    embed.set_footer(text=f"Submitted by {interaction.user.display_name}")

    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="queue", description="View all pending tasks in the queue")
async def view_queue(interaction: discord.Interaction):
    """Display all pending and in-progress tasks."""
    if not check_channel(interaction):
        await interaction.response.send_message(
            f"⚠️ This command only works in allowed channels.",
            ephemeral=True
        )
        return

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, description, status, priority, instance_name, created_at
            FROM tasks
            WHERE status IN ('pending', 'in_progress')
            ORDER BY
                CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                created_at ASC
        ''')
        tasks = cursor.fetchall()

    if not tasks:
        await interaction.response.send_message("✨ Queue is empty! No pending tasks.")
        return

    priority_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
    status_emoji = {'pending': '⏳', 'in_progress': '🔄'}

    embed = discord.Embed(
        title="📋 Claude Task Queue",
        description=f"**{len(tasks)}** tasks in queue",
        color=discord.Color.blue()
    )

    for task in tasks[:10]:  # Limit to 10 tasks in embed
        status = status_emoji.get(task['status'], '❓')
        priority = priority_emoji.get(task['priority'], '🟡')
        instance = f" → {task['instance_name']}" if task['instance_name'] else ""

        embed.add_field(
            name=f"{status} #{task['id']} {priority}{instance}",
            value=task['description'][:100] + ('...' if len(task['description']) > 100 else ''),
            inline=False
        )

    if len(tasks) > 10:
        embed.set_footer(text=f"Showing 10 of {len(tasks)} tasks")

    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="status", description="View Claude instance status and current tasks")
async def instance_status(interaction: discord.Interaction):
    """Show what each Claude instance is working on."""
    if not check_channel(interaction):
        await interaction.response.send_message(
            f"⚠️ This command only works in allowed channels.",
            ephemeral=True
        )
        return

    with get_db() as conn:
        cursor = conn.cursor()

        # Get active instances
        cursor.execute('''
            SELECT i.id, i.name, i.last_seen, i.status, t.id as task_id, t.description
            FROM instances i
            LEFT JOIN tasks t ON i.current_task_id = t.id
            WHERE i.last_seen > datetime('now', '-1 hour')
            ORDER BY i.last_seen DESC
        ''')
        instances = cursor.fetchall()

        # Get queue stats
        cursor.execute('''
            SELECT
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN status = 'completed' AND completed_at > datetime('now', '-24 hours') THEN 1 END) as completed_today
            FROM tasks
        ''')
        stats = cursor.fetchone()

    embed = discord.Embed(
        title="🖥️ Claude Instance Status",
        color=discord.Color.green() if instances else discord.Color.orange()
    )

    # Queue stats
    embed.add_field(
        name="📊 Queue Stats",
        value=f"⏳ Pending: {stats['pending']}\n🔄 In Progress: {stats['in_progress']}\n✅ Done Today: {stats['completed_today']}",
        inline=False
    )

    if instances:
        for inst in instances:
            last_seen = datetime.fromisoformat(inst['last_seen'])
            ago = (datetime.utcnow() - last_seen).seconds // 60

            status_text = "🟢 Active" if ago < 5 else "🟡 Idle"
            task_text = f"Working on #{inst['task_id']}: {inst['description'][:50]}..." if inst['task_id'] else "No active task"

            embed.add_field(
                name=f"{status_text} {inst['name'] or inst['id']}",
                value=f"{task_text}\n*Last seen: {ago}m ago*",
                inline=False
            )
    else:
        embed.add_field(
            name="No Active Instances",
            value="No Claude instances have checked in recently.\nStart Claude Code to begin processing tasks.",
            inline=False
        )

    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="done", description="View recently completed tasks")
@app_commands.describe(limit="Number of tasks to show (default: 5)")
async def completed_tasks(interaction: discord.Interaction, limit: int = 5):
    """Show recently completed tasks."""
    if not check_channel(interaction):
        await interaction.response.send_message(
            f"⚠️ This command only works in allowed channels.",
            ephemeral=True
        )
        return

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, description, instance_name, completed_at, notes
            FROM tasks
            WHERE status = 'completed'
            ORDER BY completed_at DESC
            LIMIT ?
        ''', (min(limit, 20),))
        tasks = cursor.fetchall()

    if not tasks:
        await interaction.response.send_message("No completed tasks yet.")
        return

    embed = discord.Embed(
        title="✅ Recently Completed Tasks",
        color=discord.Color.green()
    )

    for task in tasks:
        completed = datetime.fromisoformat(task['completed_at']) if task['completed_at'] else None
        time_str = completed.strftime("%Y-%m-%d %H:%M") if completed else "Unknown"
        instance = task['instance_name'] or "Unknown instance"

        embed.add_field(
            name=f"#{task['id']} - {time_str}",
            value=f"{task['description'][:80]}\n*Completed by: {instance}*",
            inline=False
        )

    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="cancel", description="Cancel a pending task")
@app_commands.describe(task_id="The task ID to cancel")
async def cancel_task(interaction: discord.Interaction, task_id: int):
    """Cancel a pending task."""
    if not check_channel(interaction):
        await interaction.response.send_message(
            f"⚠️ This command only works in allowed channels.",
            ephemeral=True
        )
        return

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT status, description FROM tasks WHERE id = ?', (task_id,))
        task = cursor.fetchone()

        if not task:
            await interaction.response.send_message(f"❌ Task #{task_id} not found.", ephemeral=True)
            return

        if task['status'] != 'pending':
            await interaction.response.send_message(
                f"❌ Cannot cancel task #{task_id} - status is '{task['status']}'",
                ephemeral=True
            )
            return

        cursor.execute('UPDATE tasks SET status = ? WHERE id = ?', ('cancelled', task_id))
        conn.commit()

    log_task_action(task_id, 'cancelled', f'Cancelled by {interaction.user}', None)

    await interaction.response.send_message(
        f"🗑️ Task #{task_id} cancelled: {task['description'][:50]}..."
    )

@bot.tree.command(name="priority", description="Change task priority")
@app_commands.describe(
    task_id="The task ID to update",
    priority="New priority level"
)
@app_commands.choices(priority=[
    app_commands.Choice(name="🔴 High", value="high"),
    app_commands.Choice(name="🟡 Medium", value="medium"),
    app_commands.Choice(name="🟢 Low", value="low")
])
async def change_priority(interaction: discord.Interaction, task_id: int, priority: str):
    """Change the priority of a pending task."""
    if not check_channel(interaction):
        await interaction.response.send_message(
            f"⚠️ This command only works in allowed channels.",
            ephemeral=True
        )
        return

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT status FROM tasks WHERE id = ?', (task_id,))
        task = cursor.fetchone()

        if not task:
            await interaction.response.send_message(f"❌ Task #{task_id} not found.", ephemeral=True)
            return

        if task['status'] not in ('pending', 'in_progress'):
            await interaction.response.send_message(
                f"❌ Cannot change priority of {task['status']} task",
                ephemeral=True
            )
            return

        cursor.execute('UPDATE tasks SET priority = ? WHERE id = ?', (priority, task_id))
        conn.commit()

    log_task_action(task_id, 'priority_changed', f'Changed to {priority}', None)

    priority_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
    await interaction.response.send_message(
        f"✅ Task #{task_id} priority changed to {priority_emoji.get(priority)} {priority.title()}"
    )

@bot.tree.command(name="athena", description="Display Athena bot help and info")
async def athena_help(interaction: discord.Interaction):
    """Display help information."""
    embed = discord.Embed(
        title="🦉 Athena - Claude Task Queue",
        description="I manage tasks for Claude Code instances. Submit tasks here and Claude will process them!",
        color=discord.Color.purple()
    )

    embed.add_field(
        name="📋 Task Management",
        value="`/task` - Submit a new task\n`/queue` - View pending tasks\n`/status` - See Claude instances\n`/done` - View completed tasks",
        inline=False
    )

    embed.add_field(
        name="⚙️ Task Control",
        value="`/priority` - Change task priority\n`/cancel` - Cancel a pending task",
        inline=False
    )

    embed.add_field(
        name="🔗 API Endpoint",
        value=f"Claude instances connect to:\n`http://192.168.40.14:{API_PORT}/api/`",
        inline=False
    )

    embed.set_footer(text="Athena - Goddess of Wisdom and Strategic Warfare")

    await interaction.response.send_message(embed=embed)

# =============================================================================
# Background Tasks
# =============================================================================

@tasks.loop(minutes=30)
async def check_stale_tasks():
    """Check for tasks that have been in_progress too long."""
    with get_db() as conn:
        cursor = conn.cursor()
        # Find tasks in_progress for more than 2 hours
        cursor.execute('''
            SELECT id, description, instance_name, claimed_at
            FROM tasks
            WHERE status = 'in_progress'
            AND claimed_at < datetime('now', '-2 hours')
        ''')
        stale_tasks = cursor.fetchall()

        for task in stale_tasks:
            # Reset to pending
            cursor.execute('''
                UPDATE tasks
                SET status = 'pending', instance_id = NULL, instance_name = NULL, claimed_at = NULL
                WHERE id = ?
            ''', (task['id'],))
            log_task_action(task['id'], 'reset', 'Task was stale (>2 hours)', None)

        conn.commit()

    if stale_tasks and bot.notification_channel:
        await bot.notification_channel.send(
            f"⚠️ Reset {len(stale_tasks)} stale task(s) to pending status."
        )

# =============================================================================
# Flask REST API
# =============================================================================

api = Flask(__name__)

def require_api_key(f):
    """Decorator to require API key for endpoints."""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        key = request.headers.get('X-API-Key') or request.args.get('api_key')
        if key != API_KEY:
            return jsonify({'error': 'Invalid or missing API key'}), 401
        return f(*args, **kwargs)
    return decorated

@api.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'service': 'athena-bot'})

@api.route('/api/tasks', methods=['GET'])
@require_api_key
def list_tasks():
    """List all pending tasks."""
    status_filter = request.args.get('status', 'pending')

    with get_db() as conn:
        cursor = conn.cursor()
        if status_filter == 'all':
            cursor.execute('''
                SELECT * FROM tasks ORDER BY created_at DESC LIMIT 50
            ''')
        else:
            cursor.execute('''
                SELECT * FROM tasks WHERE status = ?
                ORDER BY
                    CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                    created_at ASC
            ''', (status_filter,))
        tasks = [dict(row) for row in cursor.fetchall()]

    return jsonify({'tasks': tasks, 'count': len(tasks)})

@api.route('/api/tasks', methods=['POST'])
@require_api_key
def create_task():
    """Create a new task via API."""
    data = request.get_json()
    if not data or 'description' not in data:
        return jsonify({'error': 'description is required'}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO tasks (description, priority, submitted_by)
            VALUES (?, ?, ?)
        ''', (
            data['description'],
            data.get('priority', 'medium'),
            data.get('submitted_by', 'API')
        ))
        task_id = cursor.lastrowid
        conn.commit()

    log_task_action(task_id, 'created', 'Created via API', None)

    # Notify Discord
    asyncio.run_coroutine_threadsafe(
        notify_task_created(task_id, data['description']),
        bot.loop
    )

    return jsonify({'task_id': task_id, 'status': 'pending'}), 201

@api.route('/api/tasks/next', methods=['GET'])
@require_api_key
def get_next_task():
    """Get the next available task (highest priority, oldest)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM tasks
            WHERE status = 'pending'
            ORDER BY
                CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                created_at ASC
            LIMIT 1
        ''')
        task = cursor.fetchone()

    if task:
        return jsonify({'task': dict(task)})
    return jsonify({'task': None, 'message': 'No pending tasks'})

@api.route('/api/tasks/<int:task_id>/claim', methods=['POST'])
@require_api_key
def claim_task(task_id):
    """Claim a task for processing."""
    data = request.get_json() or {}
    instance_id = data.get('instance_id', 'unknown')
    instance_name = data.get('instance_name', instance_id)

    with get_db() as conn:
        cursor = conn.cursor()

        # Check task exists and is pending
        cursor.execute('SELECT status FROM tasks WHERE id = ?', (task_id,))
        task = cursor.fetchone()

        if not task:
            return jsonify({'error': 'Task not found'}), 404

        if task['status'] != 'pending':
            return jsonify({'error': f'Task is {task["status"]}, cannot claim'}), 409

        # Claim the task
        cursor.execute('''
            UPDATE tasks
            SET status = 'in_progress', instance_id = ?, instance_name = ?, claimed_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'pending'
        ''', (instance_id, instance_name, task_id))

        if cursor.rowcount == 0:
            return jsonify({'error': 'Task was claimed by another instance'}), 409

        # Update instance registry
        cursor.execute('''
            INSERT OR REPLACE INTO instances (id, name, last_seen, current_task_id, status)
            VALUES (?, ?, CURRENT_TIMESTAMP, ?, 'working')
        ''', (instance_id, instance_name, task_id))

        conn.commit()

    log_task_action(task_id, 'claimed', f'Claimed by {instance_name}', instance_id)

    # Notify Discord
    asyncio.run_coroutine_threadsafe(
        notify_task_claimed(task_id, instance_name),
        bot.loop
    )

    return jsonify({'status': 'claimed', 'task_id': task_id})

@api.route('/api/tasks/<int:task_id>/status', methods=['PUT'])
@require_api_key
def update_task_status(task_id):
    """Update task status/notes."""
    data = request.get_json() or {}
    instance_id = data.get('instance_id', 'unknown')

    with get_db() as conn:
        cursor = conn.cursor()

        updates = []
        params = []

        if 'notes' in data:
            updates.append('notes = ?')
            params.append(data['notes'])

        if 'status' in data:
            updates.append('status = ?')
            params.append(data['status'])

        if not updates:
            return jsonify({'error': 'No updates provided'}), 400

        params.append(task_id)
        cursor.execute(f'''
            UPDATE tasks SET {', '.join(updates)} WHERE id = ?
        ''', params)

        conn.commit()

    log_task_action(task_id, 'updated', json.dumps(data), instance_id)

    return jsonify({'status': 'updated', 'task_id': task_id})

@api.route('/api/tasks/<int:task_id>/complete', methods=['POST'])
@require_api_key
def complete_task(task_id):
    """Mark a task as completed."""
    data = request.get_json() or {}
    instance_id = data.get('instance_id', 'unknown')
    instance_name = data.get('instance_name', instance_id)
    notes = data.get('notes', '')

    with get_db() as conn:
        cursor = conn.cursor()

        # Get task info
        cursor.execute('SELECT description FROM tasks WHERE id = ?', (task_id,))
        task = cursor.fetchone()

        if not task:
            return jsonify({'error': 'Task not found'}), 404

        # Complete the task
        cursor.execute('''
            UPDATE tasks
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP, notes = ?
            WHERE id = ?
        ''', (notes, task_id))

        # Update instance registry
        cursor.execute('''
            UPDATE instances SET current_task_id = NULL, status = 'idle', last_seen = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (instance_id,))

        # Get next task
        cursor.execute('''
            SELECT id, description, priority FROM tasks
            WHERE status = 'pending'
            ORDER BY
                CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                created_at ASC
            LIMIT 1
        ''')
        next_task = cursor.fetchone()

        conn.commit()

    log_task_action(task_id, 'completed', notes, instance_id)

    # Notify Discord
    asyncio.run_coroutine_threadsafe(
        notify_task_completed(task_id, task['description'], instance_name, next_task),
        bot.loop
    )

    response = {'status': 'completed', 'task_id': task_id}
    if next_task:
        response['next_task'] = dict(next_task)

    return jsonify(response)

@api.route('/api/instance/heartbeat', methods=['POST'])
@require_api_key
def instance_heartbeat():
    """Register/update a Claude instance."""
    data = request.get_json() or {}
    instance_id = data.get('instance_id', 'unknown')
    instance_name = data.get('instance_name', instance_id)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO instances (id, name, last_seen, status)
            VALUES (?, ?, CURRENT_TIMESTAMP, 'idle')
        ''', (instance_id, instance_name))
        conn.commit()

    return jsonify({'status': 'ok', 'instance_id': instance_id})

@api.route('/api/stats', methods=['GET'])
@require_api_key
def get_stats():
    """Get queue statistics."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
            FROM tasks
        ''')
        stats = dict(cursor.fetchone())

        cursor.execute('''
            SELECT COUNT(*) as count FROM instances
            WHERE last_seen > datetime('now', '-1 hour')
        ''')
        stats['active_instances'] = cursor.fetchone()['count']

    return jsonify(stats)

# =============================================================================
# Discord Notification Helpers
# =============================================================================

async def notify_task_created(task_id: int, description: str):
    """Notify Discord when a task is created via API."""
    if bot.notification_channel:
        await bot.notification_channel.send(
            f"📋 **New Task #{task_id}** (via API)\n{description[:200]}"
        )

async def notify_task_claimed(task_id: int, instance_name: str):
    """Notify Discord when a task is claimed."""
    if bot.notification_channel:
        await bot.notification_channel.send(
            f"🔄 **Task #{task_id}** claimed by `{instance_name}`"
        )

async def notify_task_completed(task_id: int, description: str, instance_name: str, next_task):
    """Notify Discord when a task is completed."""
    if bot.notification_channel:
        embed = discord.Embed(
            title=f"✅ Task #{task_id} Completed!",
            description=description[:200],
            color=discord.Color.green()
        )
        embed.add_field(name="Completed By", value=instance_name, inline=True)

        if next_task:
            priority_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
            embed.add_field(
                name="⏭️ Next Task",
                value=f"#{next_task['id']} {priority_emoji.get(next_task['priority'], '🟡')} {next_task['description'][:100]}",
                inline=False
            )
        else:
            embed.add_field(name="Queue Status", value="✨ All tasks completed!", inline=False)

        await bot.notification_channel.send(embed=embed)

# =============================================================================
# Main Entry Point
# =============================================================================

def run_flask():
    """Run Flask API server in separate thread."""
    server = make_server('0.0.0.0', API_PORT, api, threaded=True)
    print(f"[API] Server starting on port {API_PORT}")
    server.serve_forever()

async def main():
    """Main entry point."""
    print("=" * 60)
    print("  Athena Bot - Claude Task Queue Orchestrator")
    print("=" * 60)

    # Initialize database
    init_database()

    # Start Flask API in background thread
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    print(f"[API] REST API available at http://0.0.0.0:{API_PORT}/api/")

    # Start Discord bot
    if not DISCORD_TOKEN:
        print("[ERROR] DISCORD_TOKEN environment variable not set!")
        return

    await bot.start(DISCORD_TOKEN)

if __name__ == '__main__':
    asyncio.run(main())
