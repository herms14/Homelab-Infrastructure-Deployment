#!/usr/bin/env python3
"""
Homelab Chronicle Ansible Callback Plugin

This callback plugin sends playbook execution information to the Chronicle
timeline app, automatically documenting Ansible runs.

Installation:
1. Copy this file to your callback_plugins/ directory
2. Enable the callback in ansible.cfg:
   [defaults]
   callback_plugins = ./callback_plugins
   callback_whitelist = chronicle

3. Set environment variables:
   export CHRONICLE_API_URL=https://chronicle.hrmsmrflrii.xyz
   export CHRONICLE_API_KEY=your-api-key  # Optional, for authenticated writes

Usage:
The plugin automatically sends data at playbook start, completion, and failure.
"""

from __future__ import absolute_import, division, print_function
__metaclass__ = type

DOCUMENTATION = '''
    name: chronicle
    type: notification
    short_description: Sends playbook execution data to Homelab Chronicle
    description:
        - This callback plugin logs playbook runs to the Chronicle timeline app
        - Tracks playbook start, completion, and failures
        - Records host results and task statistics
    requirements:
        - requests library
        - CHRONICLE_API_URL environment variable
'''

import os
import json
import time
from datetime import datetime

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

from ansible.plugins.callback import CallbackBase
from ansible.module_utils._text import to_text


class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'chronicle'
    CALLBACK_NEEDS_WHITELIST = True

    def __init__(self):
        super(CallbackModule, self).__init__()

        self.api_url = os.environ.get('CHRONICLE_API_URL', 'https://chronicle.hrmsmrflrii.xyz')
        self.api_key = os.environ.get('CHRONICLE_API_KEY', '')

        self.playbook_name = None
        self.playbook_path = None
        self.start_time = None
        self.host_results = {}
        self.failed_tasks = []
        self.task_count = 0
        self.changed_count = 0
        self.failed_count = 0
        self.skipped_count = 0
        self.tags = []
        self.user = os.environ.get('USER', 'unknown')
        self.controller = os.environ.get('HOSTNAME', 'unknown')

        if not HAS_REQUESTS:
            self._display.warning('chronicle callback requires the requests library')
            self.disabled = True

    def _send_to_chronicle(self, payload):
        """Send payload to Chronicle API."""
        if self.disabled:
            return

        url = f"{self.api_url}/api/webhooks/ansible"
        headers = {'Content-Type': 'application/json'}

        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            if response.status_code != 200:
                self._display.warning(f'Chronicle API returned {response.status_code}: {response.text}')
        except Exception as e:
            self._display.warning(f'Failed to send to Chronicle: {str(e)}')

    def v2_playbook_on_start(self, playbook):
        """Called when playbook starts."""
        self.playbook_path = playbook._file_name
        self.playbook_name = os.path.basename(self.playbook_path)
        self.start_time = datetime.utcnow()

        # Send start event
        self._send_to_chronicle({
            'playbook': self.playbook_name,
            'playbook_path': self.playbook_path,
            'started': self.start_time.isoformat() + 'Z',
            'status': 'started',
            'user': self.user,
            'controller': self.controller,
        })

    def v2_playbook_on_play_start(self, play):
        """Called when a play starts."""
        self.tags = list(play.only_tags) if play.only_tags else []

    def v2_runner_on_ok(self, result, **kwargs):
        """Called when a task succeeds."""
        host = result._host.get_name()
        if host not in self.host_results:
            self.host_results[host] = {'ok': 0, 'changed': 0, 'failed': 0, 'skipped': 0, 'unreachable': False}

        self.host_results[host]['ok'] += 1
        self.task_count += 1

        if result._result.get('changed', False):
            self.host_results[host]['changed'] += 1
            self.changed_count += 1

    def v2_runner_on_failed(self, result, ignore_errors=False):
        """Called when a task fails."""
        host = result._host.get_name()
        if host not in self.host_results:
            self.host_results[host] = {'ok': 0, 'changed': 0, 'failed': 0, 'skipped': 0, 'unreachable': False}

        if not ignore_errors:
            self.host_results[host]['failed'] += 1
            self.failed_count += 1

            # Record failed task details
            task_name = result._task.get_name()
            msg = result._result.get('msg', str(result._result))
            self.failed_tasks.append({
                'host': host,
                'task': task_name,
                'msg': to_text(msg)[:500]  # Limit message length
            })

        self.task_count += 1

    def v2_runner_on_skipped(self, result):
        """Called when a task is skipped."""
        host = result._host.get_name()
        if host not in self.host_results:
            self.host_results[host] = {'ok': 0, 'changed': 0, 'failed': 0, 'skipped': 0, 'unreachable': False}

        self.host_results[host]['skipped'] += 1
        self.skipped_count += 1

    def v2_runner_on_unreachable(self, result):
        """Called when a host is unreachable."""
        host = result._host.get_name()
        if host not in self.host_results:
            self.host_results[host] = {'ok': 0, 'changed': 0, 'failed': 0, 'skipped': 0, 'unreachable': False}

        self.host_results[host]['unreachable'] = True
        self.failed_count += 1

    def v2_playbook_on_stats(self, stats):
        """Called when playbook ends with stats."""
        end_time = datetime.utcnow()
        duration = (end_time - self.start_time).total_seconds() if self.start_time else 0

        status = 'completed' if self.failed_count == 0 else 'failed'

        self._send_to_chronicle({
            'playbook': self.playbook_name,
            'playbook_path': self.playbook_path,
            'started': self.start_time.isoformat() + 'Z' if self.start_time else None,
            'ended': end_time.isoformat() + 'Z',
            'duration': duration,
            'status': status,
            'host_count': len(self.host_results),
            'task_count': self.task_count,
            'changed_count': self.changed_count,
            'failed_count': self.failed_count,
            'skipped_count': self.skipped_count,
            'hosts': self.host_results,
            'failed_tasks': self.failed_tasks,
            'tags': self.tags,
            'user': self.user,
            'controller': self.controller,
        })
