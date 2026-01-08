# Fullstack Bun Monorepo

A fullstack monorepo template using Bun workspaces with Cloudflare Workers for both backend and frontend (TanStack Start with SSR).

## Features

- 🚀 **Bun Workspaces** - Fast package management and monorepo tooling
- ⚡ **Worker RPC** - Type-safe RPC calls from web to worker via service bindings
- 🎯 **Hono API** - Fast and lightweight HTTP API framework
- 🌐 **TanStack Start** - Modern React framework with SSR on Cloudflare Workers
- 🔒 **Full Type Safety** - End-to-end TypeScript support across packages
- 🛠️ **oxlint** - Lightning-fast linting
- 💅 **oxfmt** - Lightning-fast Prettier-compatible formatting
- 📦 **Deploy to Workers** - Both packages deploy to Cloudflare Workers for optimal performance
- 🔄 **GitHub Actions CI/CD** - Automated testing and deployment workflows

## Project Structure

```
.
├── packages/
│   ├── worker/         # Backend Cloudflare Worker (Hono + RPC)
│   └── web/            # Frontend Cloudflare Worker (TanStack Start with SSR)
├── package.json        # Root package.json with workspace scripts
├── .prettierrc.json    # oxfmt configuration
└── .oxlintrc.json      # oxlint configuration
```

## Prerequisites

- Bun >= 1.0 ([Install Bun](https://bun.sh))
- Cloudflare account (for deployment)

## Getting Started

### 1. Install Dependencies

```bash
bun install
```

### 2. Start the Worker (Backend)

```bash
bun dev:worker
```

The worker will run on http://localhost:8787

### 3. Start the Web App (Frontend)

In a separate terminal:

```bash
bun dev:web
```

The web app will run on http://localhost:3000

### 4. Test the RPC Connection

Visit http://localhost:3000 and you should see the RPC result displaying a greeting message with timestamp.

## Available Scripts

### Root Level

- `bun dev:worker` - Start the worker in development mode
- `bun dev:web` - Start the web app in development mode
- `bun run lint` - Lint all packages with oxlint
- `bun run lint:fix` - Fix linting issues automatically
- `bun run format` - Format code with oxfmt
- `bun run format:check` - Check code formatting without changes
- `bun run typecheck` - Type check all packages
- `bun run ci` - Run all checks (lint, format, typecheck)

### Worker Package

```bash
cd packages/worker

bun run dev      # Start in development mode
bun run deploy   # Deploy to Cloudflare
```

### Web Package

```bash
cd packages/web

bun run dev      # Start in development mode
bun run build    # Build for production
bun run deploy   # Deploy to Cloudflare Workers
```

## Using Worker RPC

The web package can call the worker via RPC using service bindings for type-safe, low-latency communication.

### In the Worker (`packages/worker/src/rpc.ts`)

```typescript
export class WorkerRpc extends WorkerEntrypoint {
	async sayHello(name: string) {
		return { message: `Hello, ${name}!`, timestamp: Date.now() };
	}
}
```

### In the Web App (TanStack Start routes)

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getWorkerRpc } from '@/lib/rpc';

const sayHello = createServerFn({ method: 'GET' }).handler(async () => {
	const workerRpc = getWorkerRpc();
	return await workerRpc.sayHello('World');
});

export const Route = createFileRoute('/my-route')({
	loader: async () => sayHello(),
	component: MyComponent,
});
```

## Configuration

### Worker

- `packages/worker/wrangler.jsonc` - Cloudflare Worker configuration
- `packages/worker/src/index.ts` - Main worker entry point (HTTP handler)
- `packages/worker/src/rpc.ts` - RPC entrypoint for service bindings

### Web App

- `packages/web/wrangler.jsonc` - Cloudflare Workers configuration (includes service binding)
- `packages/web/vite.config.ts` - Vite configuration
- `packages/web/src/routes/` - TanStack Start routes
- `packages/web/src/lib/rpc.ts` - Helper for accessing Worker RPC

## Deployment

### Prerequisites

1. Install Wrangler (included in dependencies)
2. Login to Cloudflare:

```bash
cd packages/worker
bun wrangler login
```

### Deploy the Worker

```bash
cd packages/worker
bun run deploy
```

### Deploy the Web App

```bash
cd packages/web
bun run deploy
```

## CI/CD with GitHub Actions

This template includes GitHub Actions workflows for automated testing and deployment.

### CI Workflow

Runs on every push and pull request:

- **Lint & Format Check** - Validates code quality with oxlint and oxfmt
- **Type Check** - Ensures TypeScript type safety across all packages
- **Build Verification** - Tests that both worker and web build successfully

The CI workflow helps catch issues early before they reach production.

### Deploy Workflow

Automatically deploys to Cloudflare Workers when code is pushed to the `main` branch:

1. **Deploy Worker** - Deploys the backend worker to Cloudflare
2. **Deploy Web** - Deploys the frontend web app to Cloudflare (runs after worker succeeds)

You can also trigger deployments manually via the GitHub Actions UI.

### Setup Instructions

To enable automated deployments, add these secrets to your GitHub repository:

1. Go to your GitHub repository **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:

   - `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
     - Create at: https://dash.cloudflare.com/profile/api-tokens
     - Use the "Edit Cloudflare Workers" template
     - Or create custom token with `Account.Cloudflare Workers Scripts` permissions

   - `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
     - Find at: https://dash.cloudflare.com/ → Workers & Pages → Overview

3. (Optional) Set up a GitHub Environment:
   - Go to **Settings** → **Environments** → **New environment**
   - Name it `production`
   - Add protection rules if desired (e.g., require approval before deployment)

### Running CI Locally

Before pushing, you can run the same checks locally:

```bash
# Run all CI checks
bun run ci

# Or run individually
bun run lint
bun run format:check
bun run typecheck
```

### Workflow Files

- `.github/workflows/ci.yml` - Continuous integration checks
- `.github/workflows/deploy.yml` - Automated deployment to Cloudflare

## Adding New RPC Methods

1. **Add method to the worker** (`packages/worker/src/rpc.ts`):

```typescript
export class WorkerRpc extends WorkerEntrypoint {
	async myNewMethod(param: string): Promise<Result> {
		// Your implementation
		return { data: param };
	}
}
```

2. **Call from the web app** in any server function:

```typescript
import { getWorkerRpc } from '@/lib/rpc';

const workerRpc = getWorkerRpc();
const result = await workerRpc.myNewMethod('value');
```

TypeScript will automatically provide type checking for your new method!

## Adding Cloudflare Bindings

To add KV, D1, R2, or other bindings:

1. Update `packages/worker/wrangler.jsonc`:

```jsonc
{
	"kv_namespaces": [
		{
			"binding": "MY_KV",
			"id": "your-namespace-id",
		},
	],
}
```

2. Update TypeScript types in `packages/worker/src/index.ts`:

```typescript
interface Env {
	MY_KV: KVNamespace;
}
```

3. Access in RPC methods:

```typescript
export class WorkerRpc extends WorkerEntrypoint<Env> {
	async getData(key: string) {
		return await this.env.MY_KV.get(key);
	}
}
```

## Code Quality

### Linting with oxlint

```bash
# Check for issues
bun run lint

# Auto-fix issues
bun run lint:fix
```

Configuration: `.oxlintrc.json`

### Formatting with oxfmt

```bash
# Format all files
bun run format

# Check formatting
bun run format:check
```

Configuration: `.prettierrc.json`

## Tech Stack

- **Runtime**: Bun
- **Monorepo**: Bun Workspaces
- **Backend Worker**: Cloudflare Workers, Hono, WorkerEntrypoint (RPC)
- **Frontend Worker**: Cloudflare Workers, TanStack Start (SSR), React
- **Language**: TypeScript
- **Linter**: oxlint
- **Formatter**: oxfmt

## Why This Stack?

- **Bun**: Fastest JavaScript runtime and package manager
- **Service Bindings**: Zero-latency RPC between workers (no HTTP overhead)
- **Type Safety**: Full TypeScript inference across packages
- **Edge Deployment**: Both frontend and backend run on Cloudflare's global network
- **Monorepo**: Share types and code between packages seamlessly
- **oxlint/oxfmt**: Blazing fast linting and formatting (30x faster than alternatives)

## Benefits of RPC vs HTTP

Using service bindings for RPC instead of HTTP APIs provides:

- **Zero network overhead** - Direct in-process calls within Cloudflare's runtime
- **Type safety** - Full TypeScript inference across package boundaries
- **No serialization** - Direct object passing between workers
- **Simpler code** - No need to define HTTP routes, parse bodies, handle errors manually
- **Better performance** - Eliminates HTTP request/response overhead

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [TanStack Start Documentation](https://tanstack.com/start)
- [Hono Documentation](https://hono.dev/)
- [oxlint Documentation](https://oxc.rs/docs/guide/usage/linter)
- [oxfmt Documentation](https://oxc.rs/docs/guide/usage/formatter)

## License

MIT
