#!/usr/bin/env python3
"""
Add Chess.com stats widget to Glance homepage.
"""

import yaml

# Custom representer to handle multiline strings properly
def str_representer(dumper, data):
    if '\n' in data:
        return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='|')
    return dumper.represent_scalar('tag:yaml.org,2002:str', data)

yaml.add_representer(str, str_representer)

# Chess.com widget template
CHESS_WIDGET = {
    'type': 'custom-api',
    'title': 'Chess.com Stats',
    'cache': '30m',
    'url': 'https://api.chess.com/pub/player/hrmsmrflrii/stats',
    'template': '''<div style="padding: 8px;">
  <a href="https://www.chess.com/member/hrmsmrflrii" target="_blank" style="text-decoration: none; color: inherit;">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
      <img src="https://www.chess.com/bundles/web/images/black_icon.d3c1714e.svg" alt="Chess.com" style="width: 24px; height: 24px; filter: invert(1);">
      <span style="font-weight: 600; color: #a6adc8;">hrmsmrflrii</span>
    </div>
  </a>
  {{ with .JSON.Object "chess_blitz" }}
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 11px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.5px;">Blitz</div>
        <div style="font-size: 28px; font-weight: bold; color: #fff;">{{ .Object "last" | .Int "rating" }}</div>
      </div>
      <div style="text-align: right; font-size: 12px; color: rgba(255,255,255,0.9);">
        <span style="color: #4ade80;">{{ .Object "record" | .Int "win" }}W</span> /
        <span style="color: #f87171;">{{ .Object "record" | .Int "loss" }}L</span> /
        <span style="color: #94a3b8;">{{ .Object "record" | .Int "draw" }}D</span>
      </div>
    </div>
  </div>
  {{ end }}
  {{ with .JSON.Object "chess_rapid" }}
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 8px; padding: 12px;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 11px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.5px;">Rapid</div>
        <div style="font-size: 28px; font-weight: bold; color: #fff;">{{ .Object "last" | .Int "rating" }}</div>
      </div>
      <div style="text-align: right; font-size: 12px; color: rgba(255,255,255,0.9);">
        <span style="color: #4ade80;">{{ .Object "record" | .Int "win" }}W</span> /
        <span style="color: #f87171;">{{ .Object "record" | .Int "loss" }}L</span> /
        <span style="color: #94a3b8;">{{ .Object "record" | .Int "draw" }}D</span>
      </div>
    </div>
  </div>
  {{ end }}
</div>'''
}

# Read current config
with open('/opt/glance/config/glance.yml', 'r') as f:
    config = yaml.safe_load(f)

# Find Home page and right column (index 2, the small column with markets)
for page in config['pages']:
    if page.get('name') == 'Home':
        # Right column is index 2 (third column)
        if len(page['columns']) >= 3:
            right_column = page['columns'][2]
            # Check if Chess widget already exists
            widget_exists = any(
                w.get('title') == 'Chess.com Stats'
                for w in right_column.get('widgets', [])
            )
            if not widget_exists:
                right_column['widgets'].append(CHESS_WIDGET)
                print("Chess.com widget added to Home page right column")
            else:
                # Update existing widget
                for i, w in enumerate(right_column['widgets']):
                    if w.get('title') == 'Chess.com Stats':
                        right_column['widgets'][i] = CHESS_WIDGET
                        print("Chess.com widget updated")
                        break
        break

# Write updated config
with open('/opt/glance/config/glance.yml', 'w') as f:
    yaml.dump(config, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

print("Glance config updated successfully!")
