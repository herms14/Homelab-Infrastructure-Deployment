#!/usr/bin/env python3
"""
Homelab Infrastructure Diagram Generator

Generates a comprehensive infrastructure diagram using the 'diagrams' library.
Visualizes: Network, VLANs, Proxmox nodes, Storage, VMs, LXCs, and Applications.

Requirements:
    pip install diagrams

Usage:
    python3 generate-infrastructure-diagram.py

Output:
    homelab-infrastructure.png (in current directory)
"""

from diagrams import Diagram, Cluster, Edge
from diagrams.onprem.compute import Server
from diagrams.onprem.container import Docker, LXC
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.monitoring import Grafana, Prometheus
from diagrams.onprem.network import Nginx, Traefik
from diagrams.onprem.proxmox import ProxmoxVE
from diagrams.onprem.client import Users
from diagrams.generic.network import Firewall, Router, Switch
from diagrams.generic.storage import Storage
from diagrams.generic.compute import Rack
from diagrams.saas.cdn import Cloudflare
from diagrams.k8s.controlplane import APIServer
from diagrams.k8s.compute import Pod
from diagrams.custom import Custom
import os

# Diagram configuration
graph_attr = {
    "fontsize": "24",
    "bgcolor": "white",
    "pad": "0.5",
    "splines": "ortho",
    "nodesep": "0.8",
    "ranksep": "1.2",
}

node_attr = {
    "fontsize": "11",
}

edge_attr = {
    "fontsize": "10",
}

def create_diagram():
    with Diagram(
        "Homelab Infrastructure",
        filename="homelab-infrastructure",
        show=False,
        direction="TB",
        graph_attr=graph_attr,
        node_attr=node_attr,
        edge_attr=edge_attr,
    ):
        # External Access
        internet = Users("Internet")
        tailscale = Router("Tailscale\n(Remote Access)")

        # Network Layer
        with Cluster("Network Layer"):
            opnsense = Firewall("OPNsense\n192.168.91.30")
            omada = Router("Omada Controller\n192.168.0.103")
            core_switch = Switch("Core Switch\nTP-Link TL-SG3210XHP-M2")

        # Connect external to network
        internet >> Edge(label="WAN") >> opnsense
        tailscale >> Edge(label="VPN", style="dashed") >> opnsense
        opnsense >> core_switch
        omada - Edge(style="dotted") - core_switch

        # VLAN 20 - Infrastructure
        with Cluster("VLAN 20 - Infrastructure (192.168.20.0/24)"):
            with Cluster("Proxmox Cluster - MorpheusCluster"):
                node01 = ProxmoxVE("node01\n192.168.20.20\n(Primary)")
                node02 = ProxmoxVE("node02\n192.168.20.21\n(Secondary)")
                qdevice = Server("Qdevice\n192.168.20.51")

                node01 - Edge(label="Corosync", style="dashed") - node02
                node01 - Edge(style="dotted") - qdevice
                node02 - Edge(style="dotted") - qdevice

            with Cluster("Automation"):
                ansible = Server("Ansible Controller\n192.168.20.30\n+ Packer v1.14.3")

            with Cluster("Kubernetes Cluster (v1.28.15)"):
                with Cluster("Control Plane"):
                    k8s_ctrl1 = APIServer("k8s-controller01\n192.168.20.32")
                    k8s_ctrl2 = APIServer("k8s-controller02\n192.168.20.33")
                    k8s_ctrl3 = APIServer("k8s-controller03\n192.168.20.34")

                with Cluster("Workers"):
                    k8s_work1 = Pod("worker01-03\n.35-.37")
                    k8s_work2 = Pod("worker04-06\n.38-.40")

        # VLAN 40 - Services
        with Cluster("VLAN 40 - Services (192.168.40.0/24)"):
            with Cluster("Core Services (VMs)"):
                traefik_vm = Traefik("Traefik\n192.168.40.20\n(Reverse Proxy)")
                authentik = Server("Authentik\n192.168.40.21\n(SSO)")
                gitlab = Server("GitLab\n192.168.40.23")
                immich = Server("Immich\n192.168.40.24\n(Photos)")

            with Cluster("Docker VMs"):
                docker_media = Docker("docker-media\n192.168.40.11\nJellyfin, *arr stack")
                docker_core = Docker("docker-core-utilities\n192.168.40.13\nGrafana, Prometheus")

            with Cluster("LXC Containers"):
                lxc_glance = LXC("LXC 200 - Glance\n192.168.40.12\nDashboard, APIs")
                lxc_bots = LXC("LXC 201 - Bots\n192.168.40.14\nArgus, Chronos")

        # VLAN 90 - Management
        with Cluster("VLAN 90 - Management (192.168.90.0/24)"):
            pihole = Server("Pi-hole v6\n192.168.90.53\n(DNS + Unbound)")

        # Storage
        with Cluster("Storage"):
            synology = Storage("Synology DS923+\n192.168.20.31\n34TB (4 HDDs + 2 NVMe)")

        # Connect VLANs to switch
        core_switch >> Edge(label="VLAN 20") >> node01
        core_switch >> Edge(label="VLAN 20") >> node02
        core_switch >> Edge(label="VLAN 40") >> traefik_vm
        core_switch >> Edge(label="VLAN 90") >> pihole

        # Proxmox hosts VMs
        node01 >> Edge(style="dotted") >> ansible
        node01 >> Edge(style="dotted") >> k8s_ctrl1
        node01 >> Edge(style="dotted") >> lxc_glance
        node01 >> Edge(style="dotted") >> docker_core

        node02 >> Edge(style="dotted") >> traefik_vm
        node02 >> Edge(style="dotted") >> authentik
        node02 >> Edge(style="dotted") >> gitlab
        node02 >> Edge(style="dotted") >> immich
        node02 >> Edge(style="dotted") >> docker_media
        node02 >> Edge(style="dotted") >> lxc_bots

        # Storage connections
        synology >> Edge(label="NFS", style="dashed") >> docker_media
        synology >> Edge(label="NFS", style="dashed") >> immich

        # DNS
        pihole >> Edge(label="DNS", style="dashed") >> opnsense

def create_services_diagram():
    """Creates a detailed services diagram"""
    with Diagram(
        "Homelab Services",
        filename="homelab-services",
        show=False,
        direction="LR",
        graph_attr=graph_attr,
    ):
        traefik = Traefik("Traefik\nReverse Proxy")

        with Cluster("Media Stack (docker-media)"):
            jellyfin = Server("Jellyfin")
            radarr = Server("Radarr")
            sonarr = Server("Sonarr")
            prowlarr = Server("Prowlarr")
            jellyseerr = Server("Jellyseerr")
            deluge = Server("Deluge")
            sabnzbd = Server("SABnzbd")

        with Cluster("Monitoring (docker-core)"):
            grafana = Grafana("Grafana")
            prometheus = Prometheus("Prometheus")
            uptime = Server("Uptime Kuma")

        with Cluster("Productivity"):
            n8n = Server("n8n")
            gitlab = Server("GitLab")
            immich = Server("Immich")

        with Cluster("Dashboard (LXC 200)"):
            glance = Server("Glance")
            media_api = Server("Media Stats API")
            nba_api = Server("NBA Stats API")

        with Cluster("Discord Bots (LXC 201)"):
            argus = Server("Argus")
            chronos = Server("Chronos")

        # All services behind Traefik
        traefik >> jellyfin
        traefik >> grafana
        traefik >> gitlab
        traefik >> immich
        traefik >> glance
        traefik >> n8n

def create_network_diagram():
    """Creates a network-focused diagram"""
    with Diagram(
        "Homelab Network Architecture",
        filename="homelab-network",
        show=False,
        direction="TB",
        graph_attr=graph_attr,
    ):
        internet = Users("Internet")

        with Cluster("Edge"):
            isp = Router("ISP Router")
            opnsense = Firewall("OPNsense\nFirewall/Router")

        with Cluster("Core Network"):
            core_sw = Switch("Core Switch\nTL-SG3210XHP-M2")
            omada = Router("Omada OC300\nController")

        with Cluster("Wireless"):
            ap_living = Router("AP Living Room")
            ap_outdoor = Router("AP Outdoor")
            ap_computer = Router("AP Computer Room")

        with Cluster("VLANs"):
            vlan20 = Switch("VLAN 20\nInfrastructure")
            vlan40 = Switch("VLAN 40\nServices")
            vlan90 = Switch("VLAN 90\nManagement")

        internet >> isp >> opnsense >> core_sw
        core_sw >> vlan20
        core_sw >> vlan40
        core_sw >> vlan90
        core_sw >> ap_living
        core_sw >> ap_outdoor
        core_sw >> ap_computer
        omada - Edge(style="dotted", label="manages") - ap_living

if __name__ == "__main__":
    print("Generating Homelab Infrastructure Diagrams...")
    print("-" * 50)

    # Generate main infrastructure diagram
    print("1. Creating main infrastructure diagram...")
    create_diagram()
    print("   ✓ homelab-infrastructure.png")

    # Generate services diagram
    print("2. Creating services diagram...")
    create_services_diagram()
    print("   ✓ homelab-services.png")

    # Generate network diagram
    print("3. Creating network diagram...")
    create_network_diagram()
    print("   ✓ homelab-network.png")

    print("-" * 50)
    print("Done! Diagrams generated in current directory.")
    print("\nTo view: open homelab-infrastructure.png")
