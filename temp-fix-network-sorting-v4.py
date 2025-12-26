#!/usr/bin/env python3
"""
Fix sorting on network dashboard - convert to barchart with proper sorting.
Uses the same pattern as the container dashboard.
"""

import json
import requests
from requests.auth import HTTPBasicAuth

GRAFANA_URL = "http://localhost:3030"
AUTH = HTTPBasicAuth('admin', 'admin')

# Get the dashboard
response = requests.get(f"{GRAFANA_URL}/api/dashboards/uid/omada-network", auth=AUTH)
dashboard_data = response.json()
dashboard = dashboard_data['dashboard']

# Panel fixes
panel_fixes = {
    51: {
        "title": "Top 10 Clients by Traffic",
        "expr": "topk(10, omada_client_traffic_down_bytes + omada_client_traffic_up_bytes)",
        "unit": "bytes",
        "color_scheme": "continuous-GrYlRd"
    },
    54: {
        "title": "Client TX Rate",
        "expr": "topk(10, omada_client_tx_rate * 1000000)",
        "unit": "bps",
        "color_scheme": "continuous-BlPu"
    },
    55: {
        "title": "Client RX Rate",
        "expr": "topk(10, omada_client_rx_rate * 1000000)",
        "unit": "bps",
        "color_scheme": "continuous-GrYlRd"
    }
}

# Update each panel
for panel in dashboard['panels']:
    panel_id = panel.get('id')
    if panel_id in panel_fixes:
        fix = panel_fixes[panel_id]
        print(f"Fixing panel {panel_id}: {fix['title']}")

        # Change type from bargauge to barchart
        panel['type'] = 'barchart'
        print(f"  Changed type to: barchart")

        # Update the query
        if 'targets' in panel:
            for target in panel['targets']:
                target['expr'] = fix['expr']
                print(f"  Query: {fix['expr']}")

        # Add transformations for sorting (same as container dashboard)
        panel['transformations'] = [
            {
                "id": "reduce",
                "options": {
                    "reducers": ["lastNotNull"]
                }
            },
            {
                "id": "sortBy",
                "options": {
                    "fields": {},
                    "sort": [
                        {
                            "desc": True,
                            "field": "Last *"
                        }
                    ]
                }
            }
        ]

        # Update field config
        panel['fieldConfig'] = {
            "defaults": {
                "color": {
                    "mode": fix['color_scheme']
                },
                "unit": fix['unit'],
                "thresholds": {
                    "mode": "absolute",
                    "steps": [
                        {"color": "green", "value": None}
                    ]
                }
            },
            "overrides": []
        }

        # Update options for barchart
        panel['options'] = {
            "barRadius": 0.1,
            "barWidth": 0.8,
            "fullHighlight": False,
            "groupWidth": 0.7,
            "legend": {
                "displayMode": "hidden",
                "placement": "right",
                "showLegend": False
            },
            "orientation": "horizontal",
            "showValue": "always",
            "stacking": "none",
            "tooltip": {
                "mode": "single",
                "sort": "none"
            },
            "xTickLabelRotation": 0,
            "xTickLabelSpacing": 0
        }

# Increment version
dashboard['version'] = dashboard.get('version', 1) + 1

# Save
save_data = {
    "dashboard": dashboard,
    "overwrite": True,
    "message": "Convert to barchart with proper sorting (like container dashboard)"
}

response = requests.post(
    f"{GRAFANA_URL}/api/dashboards/db",
    json=save_data,
    headers={"Content-Type": "application/json"},
    auth=AUTH
)

if response.status_code == 200:
    print("\nDashboard updated successfully!")
    print(f"Version: {response.json().get('version')}")
else:
    print(f"Error: {response.status_code}")
    print(response.text)
