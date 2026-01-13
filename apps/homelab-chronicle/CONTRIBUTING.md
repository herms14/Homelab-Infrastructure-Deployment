# Contributing to Homelab Chronicle

First off, thank you for considering contributing to Homelab Chronicle! It's people like you that make the homelab community such a great place.

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming environment. Please be respectful and constructive in all interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (config files, screenshots, etc.)
- **Describe the behavior you observed and what you expected**
- **Include your environment details**:
  - OS and version
  - Docker version (if applicable)
  - Node.js version (if running locally)
  - Browser (for frontend issues)

### Suggesting Features

Feature suggestions are welcome! Please:

- **Check existing issues** to see if it's already been suggested
- **Provide a clear use case** - why would this be useful?
- **Be specific** about what you'd like to see

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the coding style** of the project
3. **Add tests** if applicable
4. **Update documentation** if you're changing functionality
5. **Make sure tests pass** (`npm run lint`)
6. **Write a clear PR description** explaining your changes

## Development Setup

### Prerequisites

- Node.js 18+ (or 20 recommended)
- npm or yarn
- Git

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/homelab-chronicle.git
cd homelab-chronicle

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env as needed

# Initialize database
npx prisma db push
npx prisma generate

# Start development server
npm run dev
```

### Running Tests

```bash
# Lint check
npm run lint

# Type check
npx tsc --noEmit
```

### Database Changes

If you're modifying the database schema:

```bash
# After editing prisma/schema.prisma
npx prisma db push          # Apply changes to dev database
npx prisma generate         # Regenerate Prisma client
```

## Project Structure

```
homelab-chronicle/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── api/               # Backend API endpoints
│   │   ├── admin/             # Admin pages (event editor, etc.)
│   │   └── */                 # Public pages
│   ├── components/
│   │   ├── timeline/          # Timeline-specific components
│   │   ├── editor/            # TipTap rich text editor
│   │   ├── ui/                # shadcn/ui base components
│   │   └── admin/             # Admin-only components
│   └── lib/                   # Utilities, database client, auth
├── prisma/
│   └── schema.prisma          # Database schema
├── public/                    # Static assets
├── ansible-integration/       # Ansible callback plugin
└── discord-integration/       # Discord bot cog
```

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types when possible
- Use interfaces for object shapes

### Components

- Use functional components with hooks
- Keep components small and focused
- Use the existing UI components from `src/components/ui/`

### API Routes

- Return consistent JSON responses
- Include proper error handling
- Log errors for debugging

### Styling

- Use Tailwind CSS utility classes
- Follow the existing design patterns
- Keep the UI clean and accessible

## Commit Messages

We follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(timeline): add year navigation sidebar
fix(api): handle missing event gracefully
docs(readme): update installation instructions
```

## Feature Ideas Welcome

Here are some areas where contributions would be especially valuable:

- **New Integrations**: Home Assistant, Uptime Kuma, Netdata, etc.
- **UI Improvements**: Dark mode refinements, mobile responsiveness
- **Database Support**: PostgreSQL adapter
- **Search**: Full-text search improvements
- **Visualization**: Graphs, charts, infrastructure diagrams
- **Import/Export**: More format support (CSV, XML)

## Questions?

Feel free to open an issue with the `question` label or start a discussion.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing!
