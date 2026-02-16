#!/usr/bin/env python3
"""
Add Steam and Gaming PC widgets to Glance sidebar
Uses string manipulation to preserve original YAML formatting
"""
import re

# Read current config
with open('/opt/glance/config/glance.yml', 'r') as f:
    content = f.read()

# Check if widgets already exist
if 'Steam Top Played' in content and 'Gaming PC' in content:
    print("Widgets already exist, skipping")
    exit(0)

# Define the Steam widget YAML (properly indented for sidebar)
steam_widget = '''    - type: custom-api
      title: Steam Top Played
      cache: 1h
      url: http://192.168.40.13:5055/stats
      template: |
        <div style="padding: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            {{ if .JSON.String "profile.avatar" }}
            <img src="{{ .JSON.String "profile.avatar" }}" style="width: 28px; height: 28px; border-radius: 6px;">
            {{ end }}
            <div>
              <div style="font-weight: 600; font-size: 12px; color: #66c0f4;">{{ .JSON.String "profile.name" }}</div>
              <div style="font-size: 10px; color: #888;">{{ .JSON.Int "total_games" }} games</div>
            </div>
          </div>
          {{ range .JSON.Array "top_played" }}
          <div style="display: flex; align-items: center; gap: 8px; padding: 6px; margin-bottom: 4px; background: rgba(102,192,244,0.08); border-radius: 6px;">
            <img src="{{ .String "thumbnail" }}" style="width: 46px; height: 22px; border-radius: 3px; object-fit: cover;">
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 10px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ .String "name" }}</div>
              <div style="font-size: 9px; color: #66c0f4;">{{ .String "playtime" }}</div>
            </div>
          </div>
          {{ end }}
        </div>
'''

# Define the Gaming PC widget YAML
gaming_widget = '''    - type: custom-api
      title: Gaming PC
      cache: 30s
      url: http://192.168.40.13:5056/stats
      template: |
        <div style="padding: 8px;">
          {{ if .JSON.Bool "online" }}
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <div style="background: rgba(239,68,68,0.15); padding: 8px; border-radius: 6px; text-align: center;">
              <div style="font-size: 9px; color: #ef4444; text-transform: uppercase;">CPU</div>
              <div style="font-size: 16px; font-weight: 600; color: #f87171;">{{ .JSON.String "cpu.temp" }}</div>
              <div style="font-size: 9px; color: #888;">{{ .JSON.String "cpu.load" }}</div>
            </div>
            <div style="background: rgba(74,222,128,0.15); padding: 8px; border-radius: 6px; text-align: center;">
              <div style="font-size: 9px; color: #4ade80; text-transform: uppercase;">GPU</div>
              <div style="font-size: 16px; font-weight: 600; color: #4ade80;">{{ .JSON.String "gpu.temp" }}</div>
              <div style="font-size: 9px; color: #888;">{{ .JSON.String "gpu.load" }}</div>
            </div>
          </div>
          <div style="margin-top: 6px; background: rgba(96,165,250,0.15); padding: 8px; border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 9px; color: #60a5fa; text-transform: uppercase;">Memory</span>
              <span style="font-size: 12px; font-weight: 600; color: #fff;">{{ .JSON.String "memory.load" }}</span>
            </div>
          </div>
          {{ else }}
          <div style="text-align: center; padding: 15px; color: #888;">
            <div style="font-size: 20px; margin-bottom: 5px;">💤</div>
            <div style="font-size: 11px;">PC Offline</div>
          </div>
          {{ end }}
        </div>
'''

# Find insertion point - after "type: calendar" widget in first column
# Look for the calendar widget and insert after it
calendar_pattern = r'(    - first-day-of-week: monday\n      type: calendar\n)'
match = re.search(calendar_pattern, content)

if match:
    insert_pos = match.end()
    widgets_to_insert = ""

    if 'Steam Top Played' not in content:
        widgets_to_insert += steam_widget
        print("Adding Steam Top Played widget")

    if 'Gaming PC' not in content:
        widgets_to_insert += gaming_widget
        print("Adding Gaming PC widget")

    if widgets_to_insert:
        new_content = content[:insert_pos] + widgets_to_insert + content[insert_pos:]

        with open('/opt/glance/config/glance.yml', 'w') as f:
            f.write(new_content)

        print("Config updated successfully")
    else:
        print("No widgets to add")
else:
    print("ERROR: Could not find calendar widget insertion point")
    exit(1)
