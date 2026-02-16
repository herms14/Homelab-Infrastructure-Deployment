#!/usr/bin/env python3
"""
Move Gaming PC widget from Home sidebar to Compute page center
"""
import re

# Read current config
with open('/opt/glance/config/glance.yml', 'r') as f:
    content = f.read()

# Step 1: Remove Gaming PC widget from Home sidebar (if exists)
# Find and remove the Gaming PC widget block from sidebar
gaming_widget_pattern = r'    - type: custom-api\n      title: Gaming PC\n      cache: 30s\n      url: http://192\.168\.40\.13:5056/stats\n      template: \|[\s\S]*?(?=    - type:|  - size:|  name:)'

content = re.sub(gaming_widget_pattern, '', content)
print("Removed Gaming PC widget from Home sidebar (if it existed)")

# Step 2: Define the new Gaming PC widget for Compute page (full-width, card-based style)
gaming_compute_widget = '''    - type: custom-api
      title: Gaming PC - AMD Ryzen 7 9800X3D
      cache: 30s
      url: http://192.168.40.13:5056/stats
      template: |
        <div style="padding: 16px;">
          {{ if .JSON.Bool "online" }}
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px;">
            <!-- CPU Card -->
            <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <span style="font-size: 14px; color: #ef4444; font-weight: 700;">🔥 CPU</span>
                <span style="font-size: 11px; background: #22c55e; color: #000; padding: 4px 10px; border-radius: 6px; font-weight: 600;">ONLINE</span>
              </div>
              <div style="font-size: 28px; color: #f87171; font-weight: 700; margin-bottom: 4px;">{{ .JSON.String "cpu.temp" }}</div>
              <div style="display: flex; justify-content: space-between; margin-top: 12px;">
                <div>
                  <div style="font-size: 10px; color: #888; text-transform: uppercase;">Load</div>
                  <div style="font-size: 18px; color: #fff; font-weight: 600;">{{ .JSON.String "cpu.load" }}</div>
                </div>
              </div>
            </div>
            <!-- GPU Card -->
            <div style="background: rgba(74, 222, 128, 0.08); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 12px; padding: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <span style="font-size: 14px; color: #4ade80; font-weight: 700;">🎮 GPU</span>
              </div>
              <div style="font-size: 28px; color: #4ade80; font-weight: 700; margin-bottom: 4px;">{{ .JSON.String "gpu.temp" }}</div>
              <div style="display: flex; justify-content: space-between; margin-top: 12px;">
                <div>
                  <div style="font-size: 10px; color: #888; text-transform: uppercase;">Load</div>
                  <div style="font-size: 18px; color: #fff; font-weight: 600;">{{ .JSON.String "gpu.load" }}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 10px; color: #888; text-transform: uppercase;">VRAM</div>
                  <div style="font-size: 18px; color: #fff; font-weight: 600;">{{ .JSON.String "gpu.vram" }}</div>
                </div>
              </div>
            </div>
            <!-- Memory Card -->
            <div style="background: rgba(96, 165, 250, 0.08); border: 1px solid rgba(96, 165, 250, 0.3); border-radius: 12px; padding: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <span style="font-size: 14px; color: #60a5fa; font-weight: 700;">💾 Memory</span>
              </div>
              <div style="font-size: 28px; color: #60a5fa; font-weight: 700; margin-bottom: 4px;">{{ .JSON.String "memory.load" }}</div>
              <div style="display: flex; justify-content: space-between; margin-top: 12px;">
                <div>
                  <div style="font-size: 10px; color: #888; text-transform: uppercase;">Used</div>
                  <div style="font-size: 16px; color: #fff; font-weight: 600;">{{ .JSON.String "memory.used" }}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 10px; color: #888; text-transform: uppercase;">Available</div>
                  <div style="font-size: 16px; color: #fff; font-weight: 600;">{{ .JSON.String "memory.available" }}</div>
                </div>
              </div>
            </div>
            <!-- Fans Card -->
            <div style="background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 12px; padding: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <span style="font-size: 14px; color: #a855f7; font-weight: 700;">🌀 Fans</span>
              </div>
              {{ if .JSON.Array "fans" }}
              {{ range .JSON.Array "fans" }}
              <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                <span style="font-size: 12px; color: #888;">{{ .String "name" }}</span>
                <span style="font-size: 14px; color: #a855f7; font-weight: 600;">{{ .String "speed" }}</span>
              </div>
              {{ end }}
              {{ else }}
              <div style="font-size: 14px; color: #888;">No fan data</div>
              {{ end }}
            </div>
          </div>
          <!-- Storage Section -->
          {{ if .JSON.Array "storage" }}
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px;">
            {{ range .JSON.Array "storage" }}
            <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 12px; color: #fbbf24; font-weight: 600;">💿 {{ .String "name" }}</div>
                <div style="font-size: 10px; color: #888; margin-top: 2px;">Used: {{ .String "used" }}</div>
              </div>
              <div style="font-size: 16px; color: #fbbf24; font-weight: 600;">{{ .String "temp" }}</div>
            </div>
            {{ end }}
          </div>
          {{ end }}
          {{ else }}
          <div style="text-align: center; padding: 40px; color: #888;">
            <div style="font-size: 48px; margin-bottom: 10px;">💤</div>
            <div style="font-size: 18px; font-weight: 600;">Gaming PC Offline</div>
            <div style="font-size: 12px; margin-top: 5px;">Turn on your PC to see stats</div>
          </div>
          {{ end }}
        </div>
'''

# Step 3: Find the Compute page and insert after the title line
# Look for "name: Compute" and insert the widget at the start of the full column
compute_page_pattern = r'(  name: Compute\n- columns:\n  - size: full\n    widgets:\n)'

if re.search(compute_page_pattern, content):
    # Insert the Gaming PC widget as the first widget in the full column
    content = re.sub(
        compute_page_pattern,
        r'\1' + gaming_compute_widget,
        content
    )
    print("Added Gaming PC widget to Compute page")
else:
    print("ERROR: Could not find Compute page insertion point")
    exit(1)

# Write updated config
with open('/opt/glance/config/glance.yml', 'w') as f:
    f.write(content)

print("Config updated successfully")
