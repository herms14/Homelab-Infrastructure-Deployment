#!/usr/bin/env python3
"""
Move Gaming PC widget to Compute page right sidebar
"""
import re

# Read current config
with open('/opt/glance/config/glance.yml', 'r') as f:
    content = f.read()

# Step 1: Remove the Gaming PC widget from wherever it is currently
# This pattern matches the full Gaming PC widget block
gaming_widget_pattern = r'    - type: custom-api\n      title: Gaming PC - AMD Ryzen 7 9800X3D\n      cache: 30s\n      url: http://192\.168\.40\.13:5056/stats\n      template: \|[\s\S]*?(?=    - |  - size:|  name:)'

content = re.sub(gaming_widget_pattern, '', content)
print("Removed existing Gaming PC widget")

# Step 2: Define a compact Gaming PC widget for sidebar
gaming_sidebar_widget = '''    - type: custom-api
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

# Step 3: Find Compute page small column and insert at the beginning
# Pattern: Find "name: Compute" then find the "- size: small" after the full column
# The structure is: name: Compute -> columns: -> size: full -> widgets -> size: small -> widgets

# Find the position after "name: Compute" section's "- size: small"
# We need to insert after "- size: small\n    widgets:\n" in the Compute section

# First, let's find where Compute page ends (before Storage page)
compute_section = re.search(r'(  name: Compute\n[\s\S]*?)(  name: Storage)', content)

if compute_section:
    compute_content = compute_section.group(1)

    # Find the small column widgets section in Compute
    small_section_pattern = r'(  - size: small\n    widgets:\n)'
    small_match = re.search(small_section_pattern, compute_content)

    if small_match:
        # Get the position in the original content
        compute_start = compute_section.start(1)
        small_pos_in_compute = small_match.end()
        insert_pos = compute_start + small_pos_in_compute

        # Insert the widget
        content = content[:insert_pos] + gaming_sidebar_widget + content[insert_pos:]
        print("Added Gaming PC widget to Compute page sidebar")
    else:
        print("ERROR: Could not find small column in Compute page")
        exit(1)
else:
    print("ERROR: Could not find Compute page")
    exit(1)

# Write updated config
with open('/opt/glance/config/glance.yml', 'w') as f:
    f.write(content)

print("Config updated successfully")
