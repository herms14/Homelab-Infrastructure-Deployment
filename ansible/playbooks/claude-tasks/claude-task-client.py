#!/usr/bin/env python3
"""
Claude Task Client - CLI for Athena Task Queue

This script allows Claude Code instances to interact with the Athena task queue.
It can be used manually or integrated into Claude Code hooks.

Usage:
    python claude-task-client.py list              # List pending tasks
    python claude-task-client.py next              # Get next task
    python claude-task-client.py claim <id>        # Claim a task
    python claude-task-client.py complete <id>     # Mark task complete
    python claude-task-client.py status            # Show queue status
    python claude-task-client.py add "task desc"   # Add a new task

Environment Variables:
    ATHENA_API_URL   - API URL (default: http://192.168.40.14:5051)
    ATHENA_API_KEY   - API key for authentication
    CLAUDE_INSTANCE  - Instance identifier (default: hostname)

Author: Claude Code
Created: December 2024
"""

import os
import sys
import json
import socket
import argparse
import urllib.request
import urllib.error
from datetime import datetime

# =============================================================================
# Configuration
# =============================================================================

API_URL = os.getenv('ATHENA_API_URL', 'http://192.168.40.14:5051')
API_KEY = os.getenv('ATHENA_API_KEY', 'athena-homelab-key')
INSTANCE_ID = os.getenv('CLAUDE_INSTANCE', socket.gethostname())
INSTANCE_NAME = os.getenv('CLAUDE_INSTANCE_NAME', INSTANCE_ID)

# =============================================================================
# API Client
# =============================================================================

def api_request(endpoint: str, method: str = 'GET', data: dict = None) -> dict:
    """Make an API request to Athena."""
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
        error_body = e.read().decode('utf-8')
        try:
            error_json = json.loads(error_body)
            return {'error': error_json.get('error', str(e)), 'status': e.code}
        except:
            return {'error': str(e), 'status': e.code}
    except urllib.error.URLError as e:
        return {'error': f'Connection failed: {e.reason}', 'status': 0}
    except Exception as e:
        return {'error': str(e), 'status': 0}

# =============================================================================
# Commands
# =============================================================================

def cmd_list(args):
    """List pending tasks."""
    result = api_request('/api/tasks')

    if 'error' in result:
        print(f"Error: {result['error']}")
        return 1

    tasks = result.get('tasks', [])

    if not tasks:
        print("✨ No pending tasks in queue.")
        return 0

    print(f"\n📋 Pending Tasks ({len(tasks)})")
    print("=" * 60)

    priority_icons = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}

    for task in tasks:
        icon = priority_icons.get(task['priority'], '🟡')
        status = '🔄' if task['status'] == 'in_progress' else '⏳'
        instance = f" → {task['instance_name']}" if task.get('instance_name') else ""

        print(f"{status} #{task['id']} {icon} {task['description'][:60]}{instance}")

    print()
    return 0

def cmd_next(args):
    """Get the next available task."""
    result = api_request('/api/tasks/next')

    if 'error' in result:
        print(f"Error: {result['error']}")
        return 1

    task = result.get('task')

    if not task:
        print("✨ No pending tasks. Queue is empty!")
        return 0

    priority_icons = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
    icon = priority_icons.get(task['priority'], '🟡')

    print(f"\n⏭️  Next Task")
    print("=" * 60)
    print(f"ID:          #{task['id']}")
    print(f"Priority:    {icon} {task['priority'].title()}")
    print(f"Description: {task['description']}")
    print(f"Created:     {task['created_at']}")
    print()
    print(f"To claim: python claude-task-client.py claim {task['id']}")
    print()

    return 0

def cmd_claim(args):
    """Claim a task."""
    if not args.task_id:
        print("Error: task_id is required")
        return 1

    result = api_request(f'/api/tasks/{args.task_id}/claim', 'POST', {
        'instance_id': INSTANCE_ID,
        'instance_name': INSTANCE_NAME
    })

    if 'error' in result:
        print(f"Error: {result['error']}")
        return 1

    print(f"✅ Task #{args.task_id} claimed by {INSTANCE_NAME}")
    print(f"\nTo complete: python claude-task-client.py complete {args.task_id}")

    return 0

def cmd_complete(args):
    """Mark a task as complete."""
    if not args.task_id:
        print("Error: task_id is required")
        return 1

    result = api_request(f'/api/tasks/{args.task_id}/complete', 'POST', {
        'instance_id': INSTANCE_ID,
        'instance_name': INSTANCE_NAME,
        'notes': args.notes or ''
    })

    if 'error' in result:
        print(f"Error: {result['error']}")
        return 1

    print(f"✅ Task #{args.task_id} completed!")

    next_task = result.get('next_task')
    if next_task:
        print(f"\n⏭️  Next task: #{next_task['id']} - {next_task['description'][:50]}")
    else:
        print("\n✨ All tasks completed!")

    return 0

def cmd_add(args):
    """Add a new task."""
    if not args.description:
        print("Error: description is required")
        return 1

    result = api_request('/api/tasks', 'POST', {
        'description': args.description,
        'priority': args.priority or 'medium',
        'submitted_by': f'CLI ({INSTANCE_NAME})'
    })

    if 'error' in result:
        print(f"Error: {result['error']}")
        return 1

    print(f"✅ Task #{result['task_id']} created")
    return 0

def cmd_status(args):
    """Show queue statistics."""
    result = api_request('/api/stats')

    if 'error' in result:
        print(f"Error: {result['error']}")
        return 1

    print(f"\n📊 Queue Status")
    print("=" * 40)
    print(f"⏳ Pending:      {result.get('pending', 0)}")
    print(f"🔄 In Progress:  {result.get('in_progress', 0)}")
    print(f"✅ Completed:    {result.get('completed', 0)}")
    print(f"🗑️  Cancelled:    {result.get('cancelled', 0)}")
    print(f"🖥️  Active Instances: {result.get('active_instances', 0)}")
    print()

    return 0

def cmd_heartbeat(args):
    """Send a heartbeat to register this instance."""
    result = api_request('/api/instance/heartbeat', 'POST', {
        'instance_id': INSTANCE_ID,
        'instance_name': INSTANCE_NAME
    })

    if 'error' in result:
        print(f"Error: {result['error']}")
        return 1

    print(f"💓 Heartbeat sent for {INSTANCE_NAME}")
    return 0

def cmd_check(args):
    """Check for tasks and display summary (for startup hook)."""
    # Send heartbeat first
    api_request('/api/instance/heartbeat', 'POST', {
        'instance_id': INSTANCE_ID,
        'instance_name': INSTANCE_NAME
    })

    # Get stats
    stats = api_request('/api/stats')
    if 'error' in stats:
        print(f"⚠️  Could not connect to Athena: {stats['error']}")
        return 1

    pending = stats.get('pending', 0)
    in_progress = stats.get('in_progress', 0)

    if pending == 0 and in_progress == 0:
        print("✨ No pending tasks in queue.")
        return 0

    print(f"\n🦉 Athena Task Queue")
    print("=" * 50)

    if pending > 0:
        # Get next task
        next_result = api_request('/api/tasks/next')
        next_task = next_result.get('task')

        print(f"📋 {pending} task(s) pending")

        if next_task:
            priority_icons = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
            icon = priority_icons.get(next_task['priority'], '🟡')
            print(f"\n⏭️  Next: #{next_task['id']} {icon}")
            print(f"   {next_task['description']}")

    if in_progress > 0:
        print(f"\n🔄 {in_progress} task(s) in progress")

    print()
    return 0

# =============================================================================
# Main
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Claude Task Client - Interact with Athena Task Queue',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    %(prog)s list                     List all pending tasks
    %(prog)s next                     Get the next task to work on
    %(prog)s claim 5                  Claim task #5
    %(prog)s complete 5               Mark task #5 as done
    %(prog)s complete 5 -n "notes"    Complete with notes
    %(prog)s add "Deploy new service" Add a new task
    %(prog)s add "Fix bug" -p high    Add high priority task
    %(prog)s status                   Show queue statistics
    %(prog)s check                    Startup check (for hooks)
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # list
    subparsers.add_parser('list', help='List pending tasks')

    # next
    subparsers.add_parser('next', help='Get next available task')

    # claim
    claim_parser = subparsers.add_parser('claim', help='Claim a task')
    claim_parser.add_argument('task_id', type=int, help='Task ID to claim')

    # complete
    complete_parser = subparsers.add_parser('complete', help='Complete a task')
    complete_parser.add_argument('task_id', type=int, help='Task ID to complete')
    complete_parser.add_argument('-n', '--notes', help='Completion notes')

    # add
    add_parser = subparsers.add_parser('add', help='Add a new task')
    add_parser.add_argument('description', help='Task description')
    add_parser.add_argument('-p', '--priority', choices=['high', 'medium', 'low'],
                            default='medium', help='Task priority')

    # status
    subparsers.add_parser('status', help='Show queue statistics')

    # heartbeat
    subparsers.add_parser('heartbeat', help='Send instance heartbeat')

    # check (for startup)
    subparsers.add_parser('check', help='Startup check for pending tasks')

    args = parser.parse_args()

    if not args.command:
        # Default to check if no command given
        args.command = 'check'

    commands = {
        'list': cmd_list,
        'next': cmd_next,
        'claim': cmd_claim,
        'complete': cmd_complete,
        'add': cmd_add,
        'status': cmd_status,
        'heartbeat': cmd_heartbeat,
        'check': cmd_check
    }

    cmd_func = commands.get(args.command)
    if cmd_func:
        return cmd_func(args)
    else:
        parser.print_help()
        return 1

if __name__ == '__main__':
    sys.exit(main())
