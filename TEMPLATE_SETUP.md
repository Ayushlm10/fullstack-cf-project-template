# Template Setup Guide

Welcome! This is a production-ready fullstack Bun monorepo template for building applications on Cloudflare Workers.

## Quick Start (Automated Setup)

The fastest way to set up a new project from this template:

```bash
# 1. Clone or use this template
git clone <your-repo-url> my-new-project
cd my-new-project

# 2. Run the automated setup script
bun run setup-template.js
```

The setup script will:

- Prompt you for project name, scope, description, and author
- **Ask for custom domain configuration** (optional)
- **Configure subdomain deployment** (e.g., project-name.yourdomain.com)
- **Ask if you need a public API** (worker is private by default)
- Update all package.json files with your project details
- Update wrangler.jsonc configurations with routes
- Update imports and references throughout the codebase
- Remove template-specific documentation (CLAUDE.md)
- Initialize a fresh git repository
- Self-destruct after completion

## Domain Configuration

During setup, you'll be asked about domain configuration:

### Option 1: No Custom Domain (Default)

- Leave domain field empty
- Both worker and web deploy to `*.workers.dev` subdomains
- Best for: Testing, personal projects, quick prototypes

### Option 2: Custom Domain with Private Worker (Recommended)

- **Base domain:** `yourdomain.com`
- **Web app:** `project-name.yourdomain.com` (public)
- **Worker:** Private (RPC-only, accessible only via service binding)
- **Public API:** No (worker is private)

This is the recommended setup because:

- The worker is called internally by the web app via RPC (zero latency)
- No public API surface means better security
- No HTTP overhead between web and worker

### Option 3: Custom Domain with Public API

- **Base domain:** `yourdomain.com`
- **Web app:** `project-name.yourdomain.com` (public)
- **Worker:** `project-name-api.yourdomain.com` (public)
- **Public API:** Yes

Use this when you need:

- External API access (mobile apps, third parties)
- Webhooks from external services
- Public REST API separate from your web app

### Example Setup Flow

```
Project name: my-todo-app
Base domain: ayushthakur.work
Public API: No

Result:
✓ Web deployed at: my-todo-app.ayushthakur.work (public)
✓ Worker: Private (RPC-only, no public URL)
✓ Worker accessible from web via service binding (zero latency)
```

```
Project name: my-saas
Base domain: ayushthakur.work
Public API: Yes

Result:
✓ Web deployed at: my-saas.ayushthakur.work (public)
✓ API deployed at: my-saas-api.ayushthakur.work (public)
✓ Worker also accessible from web via service binding
```

## Manual Setup (Alternative)

If you prefer to set up manually:

### 1. Update Package Names

Edit the following files and replace `fullstack-cf-project-template` with your scope/name:

**Root `package.json`:**

```json
{
  "name": "@your-scope/your-project",
  "description": "Your project description",
  "author": "Your Name"
}
```

**`packages/worker/package.json`:**

```json
{
  "name": "@your-scope/your-project-worker",
  "description": "Backend worker for your-project"
}
```

**`packages/web/package.json`:**

```json
{
  "name": "@your-scope/your-project-web",
  "description": "Frontend web app for your-project"
}
```

### 2. Update Wrangler Configurations

**`packages/worker/wrangler.jsonc`:**

```jsonc
{
  "name": "your-project-worker",
  // ... rest of config
}
```

**`packages/web/wrangler.jsonc`:**

```jsonc
{
  "name": "your-project-web",
  // ... rest of config
}
```

### 3. Update Imports

Find and replace in all source files:

- `fullstack-cf-project-template/` → `@your-scope/`
- `fullstack-cf-project-template` → `your-project`

### 4. Clean Up Template Files

Remove template-specific documentation:

```bash
rm CLAUDE.md TEMPLATE_SETUP.md setup-template.js
```

## Post-Setup Configuration

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

Copy and customize the example environment files:

```bash
# For worker package
cp packages/worker/.env.example packages/worker/.env

# For web package
cp packages/web/.env.example packages/web/.env
```

Edit these `.env` files with your actual values.

### 3. Configure Cloudflare Settings

Update `wrangler.jsonc` files with your Cloudflare account details:

**Important fields to configure:**

- `account_id` - Your Cloudflare account ID (find at: https://dash.cloudflare.com/)
- `workers_dev` - Set to `true` for development
- Add any bindings you need (KV, D1, R2, etc.)

**If you configured a custom domain:**

- Ensure your domain (e.g., `yourdomain.com`) is added to your Cloudflare account
- Go to https://dash.cloudflare.com/ → Add Site
- Follow Cloudflare's DNS setup instructions
- No need to create DNS records for subdomains - Cloudflare Workers handles routing automatically

See the "Adding Cloudflare Bindings" section in README.md for details.

### 4. Start Development

Run both dev servers:

```bash
# Terminal 1: Worker backend
bun dev:worker

# Terminal 2: Web frontend
bun dev:web
```

- Worker API: http://localhost:8787
- Web app: http://localhost:3000

### 5. Verify Setup

Visit http://localhost:3000 and you should see the example page displaying a message from the worker RPC.

## Deployment Checklist

Before deploying to production:

- [ ] Update `wrangler.jsonc` with production `account_id`
- [ ] Set up secrets using `wrangler secret put <KEY>`
- [ ] Configure production environment variables
- [ ] Add any required Cloudflare bindings (KV, D1, R2)
- [ ] Test RPC connection in production mode
- [ ] Set up custom domains in Cloudflare dashboard
- [ ] Configure CORS origins for production domains
- [ ] Review and update README.md with your project details

## Deployment Commands

```bash
# Deploy worker
bun --filter @your-scope/your-project-worker run deploy

# Deploy web
bun --filter @your-scope/your-project-web run deploy
```

## Next Steps

1. **Read the Documentation**: Check out README.md for detailed architecture and usage
2. **Customize the Example**: Modify the example app in `packages/web/src/routes/index.tsx`
3. **Add RPC Methods**: Add new methods to `packages/worker/src/rpc.ts`
4. **Add Routes**: Create new routes in `packages/web/src/routes/`
5. **Add Bindings**: Configure Cloudflare services (KV, D1, R2) as needed

## Project Structure

```
your-project/
├── packages/
│   ├── worker/          # Backend API (Hono + RPC)
│   │   ├── src/
│   │   │   ├── index.ts # HTTP endpoints
│   │   │   └── rpc.ts   # RPC methods
│   │   └── wrangler.jsonc
│   └── web/             # Frontend (TanStack Start)
│       ├── src/
│       │   ├── routes/  # File-based routing
│       │   └── lib/     # Utilities
│       └── wrangler.jsonc
├── package.json         # Workspace root
└── README.md           # Main documentation
```

## Getting Help

- **Documentation**: See README.md for comprehensive guide
- **Issues**: Check the repository issues for common problems
- **Bun Docs**: https://bun.sh/docs
- **Cloudflare Workers**: https://developers.cloudflare.com/workers
- **TanStack Start**: https://tanstack.com/start/latest

## Tech Stack

- **Runtime**: Bun
- **Backend**: Hono (HTTP) + Worker RPC (type-safe)
- **Frontend**: TanStack Start (SSR)
- **Platform**: Cloudflare Workers
- **Code Quality**: oxlint + oxfmt
- **Type Safety**: TypeScript (strict mode)

Happy building! 🚀
