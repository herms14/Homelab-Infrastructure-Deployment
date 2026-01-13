# Homelab Chronicle

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A beautiful, self-hosted timeline app to document your homelab journey**

[Features](#features) | [Quick Start](#quick-start) | [Screenshots](#screenshots) | [Integrations](#integrations) | [API](#api-reference) | [Contributing](#contributing)

</div>

---

## Why Homelab Chronicle?

Every homelabber has a story. Servers added at 2 AM, network rewires that "should have been simple," and that one migration that took three weekends. **Homelab Chronicle** helps you document it all with a beautiful, searchable timeline.

Inspired by the timeline view in [Immich](https://github.com/immich-app/immich), Chronicle provides a vertical timeline grouped by year and month, making it easy to see how your infrastructure evolved over time.

## Features

### Core Features

- **Timeline View** - Immich-inspired vertical timeline grouped by year/month with smooth animations
- **Rich Text Editor** - TipTap-powered WYSIWYG editor with code blocks, images, and formatting
- **Image Attachments** - Upload screenshots and diagrams with before/after comparison support
- **Categories** - Color-coded event types (Infrastructure, Service, Milestone, Fix, Documentation, Network, Storage)
- **Tags & Search** - Full-text search with tag filtering
- **Event Linking** - Connect related events (e.g., "Fixed by", "Caused by", "Continuation of")

### Automation & Integrations

- **GitHub Sync** - Automatically import commits from your infrastructure repo
- **GitLab Webhooks** - Track pushes to your self-hosted GitLab
- **Prometheus Alerts** - Create timeline events from firing alerts
- **Watchtower Updates** - Log container updates automatically
- **Ansible Callbacks** - Document playbook runs with full output

### Advanced Features

- **Event Templates** - Pre-built templates for common events (New VM, Docker Deploy, Network Change)
- **Version History** - Track changes to events with full revision history
- **Infrastructure Map** - Visual representation of your nodes and services
- **"On This Day"** - See what you were doing a year ago
- **Stats Dashboard** - Analytics on your homelab activity
- **Obsidian Sync** - Two-way sync with your Obsidian vault
- **Data Import** - Bulk import from git commits or CHANGELOG.md files
- **Export & Backup** - JSON export with scheduled backups

## Screenshots

> **Note**: Add your own screenshots to `docs/screenshots/` directory

| Timeline View | Event Detail | Rich Editor |
|---------------|--------------|-------------|
| ![Timeline](docs/screenshots/timeline.png) | ![Event](docs/screenshots/event-detail.png) | ![Editor](docs/screenshots/editor.png) |

| Stats Dashboard | Infrastructure Map | Mobile View |
|-----------------|-------------------|-------------|
| ![Stats](docs/screenshots/stats.png) | ![Infra](docs/screenshots/infrastructure.png) | ![Mobile](docs/screenshots/mobile.png) |

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/herms14/homelab-chronicle.git
cd homelab-chronicle

# Create environment file
cp .env.example .env
# Edit .env with your settings (see Environment Variables below)

# Start with Docker Compose
docker compose up -d

# Initialize database
docker exec homelab-chronicle npx prisma db push

# (Optional) Seed with sample data
docker exec homelab-chronicle node prisma/seed-real-data.js
```

Access at `http://localhost:3000`

### Option 2: Development Setup

```bash
# Clone and install
git clone https://github.com/herms14/homelab-chronicle.git
cd homelab-chronicle
npm install

# Setup environment
cp .env.example .env

# Initialize database
npx prisma db push
npx prisma generate

# Start development server
npm run dev
```

## Environment Variables

Create a `.env` file with the following:

```env
# Database (SQLite)
DATABASE_URL="file:./data/chronicle.db"

# NextAuth (required)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Authentication (optional - choose one)
# Option A: Authentik OAuth
AUTHENTIK_CLIENT_ID="your-client-id"
AUTHENTIK_CLIENT_SECRET="your-client-secret"
AUTHENTIK_ISSUER="https://auth.yourdomain.com/application/o/chronicle/"

# GitHub Integration (optional)
GITHUB_TOKEN="ghp_your_token"
GITHUB_REPO="username/repo"
GITHUB_WEBHOOK_SECRET="your-webhook-secret"

# GitLab Integration (optional)
GITLAB_WEBHOOK_SECRET="your-gitlab-secret"
```

### Generating Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate webhook secrets
openssl rand -hex 32
```

## Configuration

### Docker Compose

```yaml
services:
  homelab-chronicle:
    image: ghcr.io/herms14/homelab-chronicle:latest
    # Or build locally:
    # build: .
    container_name: homelab-chronicle
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/data/chronicle.db
      - NEXTAUTH_URL=https://chronicle.yourdomain.com
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    volumes:
      - chronicle-data:/data
      - chronicle-uploads:/app/public/uploads
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/events"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  chronicle-data:
  chronicle-uploads:
```

### Traefik Integration

```yaml
# Add to your Traefik dynamic config
http:
  routers:
    chronicle:
      rule: "Host(`chronicle.yourdomain.com`)"
      service: chronicle
      entrypoints:
        - websecure
      tls:
        certResolver: letsencrypt

  services:
    chronicle:
      loadBalancer:
        servers:
          - url: "http://chronicle:3000"
```

## Integrations

### GitHub Commit Sync

Automatically sync commits from your infrastructure repo:

```bash
# Manual sync
curl https://chronicle.yourdomain.com/api/sync/github

# Or set up a cron job (every 10 minutes)
*/10 * * * * curl -s http://localhost:3000/api/sync/github > /dev/null 2>&1
```

### Webhook Endpoints

| Endpoint | Source | Event Types |
|----------|--------|-------------|
| `/api/webhooks/github` | GitHub | Push (commits) |
| `/api/webhooks/gitlab` | GitLab | Push, merge requests |
| `/api/webhooks/prometheus` | Alertmanager | Alerts |
| `/api/webhooks/watchtower` | Watchtower | Container updates |
| `/api/webhooks/ansible` | Ansible | Playbook completion |

### Ansible Callback Plugin

```python
# Copy ansible-integration/chronicle_callback.py to your callback plugins directory
# Configure in ansible.cfg:
[defaults]
callback_plugins = ./plugins/callback
callback_whitelist = chronicle_callback

[chronicle]
api_url = https://chronicle.yourdomain.com
api_key = your-api-key
```

### Discord Bot Integration

```python
# See discord-integration/README.md for setup
# Commands:
# !chronicle add "Event title" - Add event via Discord
# !chronicle recent - Show recent events
# !chronicle search <query> - Search events
```

## API Reference

### Events

```bash
# List all events
GET /api/events
GET /api/events?category=infrastructure&limit=10

# Get single event
GET /api/events/{id}

# Create event
POST /api/events
{
  "title": "Deployed new service",
  "date": "2024-01-15T10:30:00Z",
  "content": "<p>Rich HTML content</p>",
  "category": "service",
  "tags": ["docker", "monitoring"]
}

# Update event
PUT /api/events/{id}

# Delete event
DELETE /api/events/{id}
```

### Other Endpoints

```bash
# Stats
GET /api/stats

# Search
GET /api/search?q=kubernetes

# On This Day
GET /api/on-this-day

# Export
GET /api/export

# Import
POST /api/import
```

## Data Model

### Categories

| Category | Color | Use Case |
|----------|-------|----------|
| `infrastructure` | Blue | VMs, nodes, hardware |
| `service` | Green | Docker containers, apps |
| `milestone` | Purple | Major achievements |
| `fix` | Amber | Bug fixes, troubleshooting |
| `documentation` | Gray | Docs, guides |
| `network` | Cyan | Network changes |
| `storage` | Orange | Storage, backups |

### Event Schema

```typescript
interface Event {
  id: string
  title: string
  date: Date
  content: string          // Rich HTML
  category: string
  icon?: string            // Lucide icon name
  tags: string[]
  source?: string          // manual, git, github, gitlab, etc.
  sourceRef?: string       // Commit SHA, webhook ID
  services: string[]       // Affected services
  infrastructureNode?: string
  images: Image[]
  codeSnippets: CodeSnippet[]
}
```

## Backup & Restore

### Manual Backup

```bash
# Export all data
curl https://chronicle.yourdomain.com/api/backup > backup.json

# Or copy the SQLite database directly
docker cp homelab-chronicle:/data/chronicle.db ./backup/
```

### Restore

```bash
# From JSON export
curl -X POST https://chronicle.yourdomain.com/api/import \
  -H "Content-Type: application/json" \
  -d @backup.json

# Or restore SQLite file
docker cp ./backup/chronicle.db homelab-chronicle:/data/
docker restart homelab-chronicle
```

## Development

### Project Structure

```
homelab-chronicle/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── events/        # Event CRUD
│   │   │   ├── webhooks/      # Integration webhooks
│   │   │   └── sync/          # Sync endpoints
│   │   ├── admin/             # Admin pages
│   │   └── (pages)/           # Public pages
│   ├── components/
│   │   ├── timeline/          # Timeline components
│   │   ├── editor/            # TipTap editor
│   │   └── ui/                # shadcn/ui components
│   └── lib/                   # Utilities
├── prisma/
│   └── schema.prisma          # Database schema
├── ansible-integration/       # Ansible callback plugin
├── discord-integration/       # Discord bot cog
└── docker-compose.yml
```

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Editor**: TipTap
- **Database**: SQLite + Prisma ORM
- **Auth**: NextAuth.js
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database
```

## Roadmap

- [ ] PostgreSQL support
- [ ] Multi-user with roles
- [ ] Calendar view
- [ ] RSS feed
- [ ] Mobile app (React Native)
- [ ] Kubernetes operator for auto-discovery
- [ ] Home Assistant integration
- [ ] Uptime Kuma integration

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Timeline design inspired by [Immich](https://github.com/immich-app/immich)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)

---

<div align="center">

**Built with love for the homelab community**

[Report Bug](https://github.com/herms14/homelab-chronicle/issues) | [Request Feature](https://github.com/herms14/homelab-chronicle/issues)

</div>
