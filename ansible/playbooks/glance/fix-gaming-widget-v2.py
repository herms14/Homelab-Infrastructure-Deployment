#!/usr/bin/env python3
"""
Fix Gaming PC widget location - move to actual Compute page sidebar
The YAML structure is: - columns: ... name: PageName
So content BEFORE 'name: Compute' belongs to Compute page
"""
import re

# Read current config
with open('/opt/glance/config/glance.yml', 'r') as f:
    lines = f.readlines()

# Step 1: Find and remove the Gaming PC widget wherever it is
new_lines = []
skip_until_next_widget = False
in_gaming_widget = False

i = 0
while i < len(lines):
    line = lines[i]

    # Check if this is the start of Gaming PC widget
    if 'title: Gaming PC' in line and not in_gaming_widget:
        # Found the widget, skip it and all its content
        in_gaming_widget = True
        # Go back to remove the "- type: custom-api" line before title
        if new_lines and '- type: custom-api' in new_lines[-1]:
            new_lines.pop()
        i += 1
        continue

    if in_gaming_widget:
        # Keep skipping until we hit the next widget or section
        if line.strip().startswith('- type:') or line.strip().startswith('- cache:') or line.strip().startswith('- groups:') or line.strip().startswith('- height:'):
            if '- type: custom-api' not in lines[i-1] if i > 0 else True:
                in_gaming_widget = False
                new_lines.append(line)
        elif line.strip().startswith('name:') or line.strip().startswith('- columns:'):
            in_gaming_widget = False
            new_lines.append(line)
        # else skip the line (part of gaming widget)
        i += 1
        continue

    new_lines.append(line)
    i += 1

print("Removed Gaming PC widget from current location")

# Step 2: Find where to insert on Compute page
# Compute page: starts after "name: Home" line, ends at "name: Compute" line
# We want to add to the small column (sidebar) of Compute page

content = ''.join(new_lines)

# The Compute page structure should be:
# name: Home
# - columns:    <- Compute page starts here
#   - size: full
#     widgets: ...
#   - size: small  <- We want to add here
#     widgets:
# name: Compute

# Find the Compute page section (between "name: Home" and "name: Compute")
home_end = content.find('  name: Home\n')
compute_end = content.find('  name: Compute\n')

if home_end == -1 or compute_end == -1:
    print("ERROR: Could not find Home or Compute page markers")
    exit(1)

compute_section = content[home_end:compute_end]

# Find "- size: small" followed by "widgets:" in the Compute section
small_widget_pattern = r'(  - size: small\n    widgets:\n)'
match = re.search(small_widget_pattern, compute_section)

if not match:
    print("ERROR: Could not find small column in Compute page")
    print("Compute section preview:")
    print(compute_section[:500])
    exit(1)

# Calculate insertion position in full content
insert_pos = home_end + match.end()

# Gaming PC widget for sidebar
gaming_widget = '''    - type: custom-api
      title: Gaming PC
      cache: 30s
      url: http://192.168.40.13:5056/stats
      template: |
        <div style="padding: 8px;">
          {{ if .JSON.Bool "online" }}
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #22c55e;"></span>
            <span style="font-size: 12px; color: #22c55e; font-weight: 600;">Online</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div style="background: rgba(239,68,68,0.15); padding: 10px; border-radius: 8px; text-align: center;">
              <div style="font-size: 9px; color: #ef4444; text-transform: uppercase;">CPU</div>
              <div style="font-size: 18px; font-weight: 600; color: #f87171;">{{ .JSON.String "cpu.temp" }}</div>
              <div style="font-size: 10px; color: #888;">{{ .JSON.String "cpu.load" }}</div>
            </div>
            <div style="background: rgba(74,222,128,0.15); padding: 10px; border-radius: 8px; text-align: center;">
              <div style="font-size: 9px; color: #4ade80; text-transform: uppercase;">GPU</div>
              <div style="font-size: 18px; font-weight: 600; color: #4ade80;">{{ .JSON.String "gpu.temp" }}</div>
              <div style="font-size: 10px; color: #888;">{{ .JSON.String "gpu.load" }}</div>
            </div>
          </div>
          <div style="background: rgba(96,165,250,0.15); padding: 10px; border-radius: 8px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 9px; color: #60a5fa; text-transform: uppercase;">Memory</span>
              <span style="font-size: 14px; font-weight: 600; color: #fff;">{{ .JSON.String "memory.load" }}</span>
            </div>
            <div style="font-size: 10px; color: #888; margin-top: 4px;">{{ .JSON.String "memory.used" }} used</div>
          </div>
          {{ if .JSON.Array "storage" }}
          <div style="font-size: 9px; color: #888; text-transform: uppercase; margin-bottom: 6px;">Storage</div>
          {{ range .JSON.Array "storage" }}
          <div style="display: flex; justify-content: space-between; padding: 6px 8px; background: rgba(251,191,36,0.1); border-radius: 6px; margin-bottom: 4px;">
            <span style="font-size: 10px; color: #fbbf24; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">{{ .String "name" }}</span>
            <span style="font-size: 10px; color: #fff;">{{ .String "temp" }}</span>
          </div>
          {{ end }}
          {{ end }}
          {{ else }}
          <div style="text-align: center; padding: 20px; color: #888;">
            <div style="font-size: 24px; margin-bottom: 5px;">💤</div>
            <div style="font-size: 11px;">PC Offline</div>
          </div>
          {{ end }}
        </div>
'''

# Insert the widget
new_content = content[:insert_pos] + gaming_widget + content[insert_pos:]

# Write the updated config
with open('/opt/glance/config/glance.yml', 'w') as f:
    f.write(new_content)

print("Added Gaming PC widget to Compute page sidebar")
print("Config updated successfully")
