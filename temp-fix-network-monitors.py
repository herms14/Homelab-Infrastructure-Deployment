#!/usr/bin/env python3
"""
Fix Network tab monitors - replace unreachable HTTP checks
with Prometheus-based status widget.
"""

import yaml

# Custom representer for multiline strings
def str_representer(dumper, data):
    if '\n' in data:
        return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='|')
    return dumper.represent_scalar('tag:yaml.org,2002:str', data)

yaml.add_representer(str, str_representer)

# New widgets to replace broken monitors
NEW_WIDGETS = [
    {
        'type': 'custom-api',
        'title': 'Network Device Status',
        'cache': '1m',
        'url': 'http://192.168.40.10:9090/api/v1/query?query=omada_device_cpu_percentage',
        'template': '''<div style="padding: 8px;">
  <div style="font-size: 11px; color: #888; margin-bottom: 10px;">Status via Omada Controller</div>
  {{ range .JSON.Object "data" | .Array "result" }}
  <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; margin-bottom: 6px; background: rgba(255,255,255,0.05); border-radius: 6px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e;"></span>
      <span style="color: #fff; font-size: 13px;">{{ .Object "metric" | .String "device" }}</span>
    </div>
    <div style="display: flex; gap: 12px; font-size: 11px;">
      <span style="color: #888;">{{ .Object "metric" | .String "device_type" }}</span>
      <span style="color: #3b82f6;">CPU: {{ .Array "value" | index 1 }}%</span>
    </div>
  </div>
  {{ end }}
</div>'''
    },
    {
        'type': 'custom-api',
        'title': 'Latest Speedtest',
        'cache': '5m',
        'url': 'http://192.168.40.10:3000/api/speedtest/latest',
        'template': '''<div style="padding: 8px;">
  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
    <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 10px; padding: 15px; text-align: center;">
      <div style="font-size: 10px; color: rgba(255,255,255,0.8);">Download</div>
      <div style="font-size: 24px; font-weight: bold; color: #fff;">{{ .JSON.Float "data.download" | printf "%.0f" }} Mbps</div>
    </div>
    <div style="background: linear-gradient(135deg, #22c55e, #15803d); border-radius: 10px; padding: 15px; text-align: center;">
      <div style="font-size: 10px; color: rgba(255,255,255,0.8);">Upload</div>
      <div style="font-size: 24px; font-weight: bold; color: #fff;">{{ .JSON.Float "data.upload" | printf "%.0f" }} Mbps</div>
    </div>
  </div>
  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">
    <div style="background: rgba(255,255,255,0.08); border-radius: 8px; padding: 10px; text-align: center;">
      <div style="font-size: 10px; color: #888;">Ping</div>
      <div style="font-size: 18px; color: #f59e0b;">{{ .JSON.Float "data.ping" | printf "%.1f" }} ms</div>
    </div>
    <div style="background: rgba(255,255,255,0.08); border-radius: 8px; padding: 10px; text-align: center;">
      <div style="font-size: 10px; color: #888;">Jitter</div>
      <div style="font-size: 18px; color: #8b5cf6;">{{ .JSON.Float "data.ping_jitter" | printf "%.1f" }} ms</div>
    </div>
  </div>
</div>'''
    }
]

# Read config
with open('/opt/glance/config/glance.yml', 'r') as f:
    config = yaml.safe_load(f)

# Find Network page and update
for page in config['pages']:
    if page.get('name') == 'Network':
        for column in page['columns']:
            # Find the small column with monitors
            if column.get('size') == 'small':
                # Replace the widgets
                new_widgets = []
                for widget in column.get('widgets', []):
                    # Skip the broken monitor widgets
                    if widget.get('type') == 'monitor' and widget.get('title') in ['Network Infrastructure', 'Wireless APs']:
                        print(f"Removing broken monitor: {widget.get('title')}")
                        continue
                    new_widgets.append(widget)

                # Add new device status widget at the beginning
                new_widgets = NEW_WIDGETS[:1] + new_widgets

                # Update speedtest if it exists, otherwise add
                has_speedtest = any(w.get('title') == 'Latest Speedtest' for w in new_widgets)
                if not has_speedtest:
                    new_widgets.append(NEW_WIDGETS[1])

                column['widgets'] = new_widgets
                print("Updated Network page widgets")
        break

# Write config
with open('/opt/glance/config/glance.yml', 'w') as f:
    yaml.dump(config, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

print("Config updated - restart Glance to apply changes")
