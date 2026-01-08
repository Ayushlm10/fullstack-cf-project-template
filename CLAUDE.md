# AGENTS.md

## Project Overview

This is a fullstack monorepo using:

- **Bun** workspaces for package management
- **Cloudflare Workers** for both backend and frontend
- **TanStack Start** with SSR for the frontend
- **Hono** for backend HTTP API
- **WorkerEntrypoint** for type-safe RPC between packages
- **oxlint** for linting
- **oxfmt** for code formatting

## Monorepo Architecture

This is a Bun workspace monorepo with two packages:

- **`packages/worker`**: Cloudflare Worker (backend)
- **`packages/web`**: TanStack Start app (frontend)

### Key Architectural Pattern: Worker RPC via Service Bindings

The web package communicates with the worker package through **two mechanisms**:

1. **HTTP API** (traditional): REST endpoints exposed by Hono in `packages/worker/src/index.ts`
2. **RPC calls** (service bindings): Type-safe method calls via `WorkerRpc` class in `packages/worker/src/rpc.ts`

**Critical understanding**: The worker exports TWO things from `src/index.ts`:

- `export default app` - Hono HTTP handler (default export)
- `export { WorkerRpc } from './rpc'` - Named export for RPC entrypoint

The web package's `wrangler.jsonc` configures a service binding:

```jsonc
"services": [{
  "binding": "WORKER_RPC",
  "service": "fullstack-bun-monorepo-worker",
  "entrypoint": "WorkerRpc"  // References the named export
}]
```

### Type Safety Across Packages

The web package imports types directly from the worker package:

```typescript
// packages/web/env.d.ts
import type { WorkerRpc } from '../worker/src/rpc';
```

This creates a **direct TypeScript dependency** between packages. The monorepo structure enables this cross-package type sharing.

### Calling Worker RPC Methods

**CORRECT way to access Worker RPC** in TanStack Start server functions:

```typescript
import { getWorkerRpc } from '@/lib/rpc';

const workerRpc = getWorkerRpc();
const result = await workerRpc.sayHello('World');
```

The `getWorkerRpc()` helper is defined in `packages/web/src/lib/rpc.ts`.

## Commands

### Development

```bash
# Run both services in separate terminals
bun dev:worker    # Worker on localhost:8787
bun dev:web       # Web on localhost:3000

# Or run from specific package
cd packages/worker && bun run dev
cd packages/web && bun run dev
```

### Linting & Formatting

```bash
bun run lint        # Lint all code with oxlint
bun run lint:fix    # Fix auto-fixable lint issues
bun run format      # Format all code with oxfmt
bun run format:check # Check formatting without changes
```

### Deployment

```bash
# Deploy individually
cd packages/worker && bun run deploy
cd packages/web && bun run deploy

# Login to Cloudflare first (one-time)
cd packages/worker && bun wrangler login
```

### Working with Workspace Packages

```bash
# Add dependency to specific package
bun add <package-name> --filter @fullstack-bun-monorepo/worker
bun add <package-name> --filter @fullstack-bun-monorepo/web

# Add dev dependency
bun add -D <package-name> --filter @fullstack-bun-monorepo/worker

# Run script in specific package
bun --filter @fullstack-bun-monorepo/worker dev
```

## Adding New RPC Methods

When adding RPC methods that the web package will call:

1. **Add method to `packages/worker/src/rpc.ts`**:

```typescript
export class WorkerRpc extends WorkerEntrypoint {
	async myNewMethod(param: string): Promise<Result> {
		// implementation
	}
}
```

2. **TypeScript will automatically provide types** in the web package because `env.d.ts` imports the `WorkerRpc` type

3. **Call from web package** in any server function:

```typescript
import { getWorkerRpc } from '@/lib/rpc';

const workerRpc = getWorkerRpc();
const result = await workerRpc.myNewMethod('value');
```

## Adding Cloudflare Bindings

To add KV, D1, R2, or other bindings to the worker:

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

3. Access in RPC methods or HTTP handlers:

```typescript
// In rpc.ts
export class WorkerRpc extends WorkerEntrypoint<Env> {
	async getData(key: string) {
		return await this.env.MY_KV.get(key);
	}
}
```

## Bun Workspace Configuration

The `package.json` at the root includes `workspaces`:

```json
{
	"workspaces": ["packages/*"]
}
```

Bun hoists dependencies to the root `node_modules` by default, which is why schema paths in `wrangler.jsonc` point to `../../node_modules/`.

## Package Naming Convention

Packages use the `@fullstack-bun-monorepo/*` scope:

- `@fullstack-bun-monorepo/worker`
- `@fullstack-bun-monorepo/web`

When filtering commands, use these exact names: `bun --filter @fullstack-bun-monorepo/worker <command>`

## Code Quality Tools

### oxlint

Fast linter from the oxc project. Configuration in `.oxlintrc.json`.

Key points:

- Much faster than ESLint
- Focused on correctness, suspicious patterns, and performance
- Auto-fix with `bun run lint:fix`

### oxfmt

Fast Prettier-compatible formatter from the oxc project. Configuration in `.prettierrc.json`.

Key points:

- 30x faster than Prettier
- Uses Prettier-compatible config
- Supports JS/TS/JSON/YAML/HTML/CSS and more

Ignored files are listed in `.prettierignore` and `.oxlintignore`.

## Generated Files

The following files are auto-generated and should not be edited manually:

- `packages/web/src/routeTree.gen.ts` - Generated by TanStack Router
- `packages/web/worker-configuration.d.ts` - Generated by Wrangler's `cf-typegen`

These files are ignored by linting and formatting tools.

## TanStack Start Patterns

For the web package:

- Use server functions (`createServerFn`) for data fetching that needs RPC access
- Use loaders for SSR data requirements
- Keep client-side JavaScript minimal
- Use the RPC binding for worker communication via `getWorkerRpc()`
- Follow TanStack Start conventions for routing

## Important Notes

- The worker and web app both deploy as Cloudflare Workers (not Pages)
- Service bindings enable zero-latency RPC calls within Cloudflare's runtime
- Full type safety across packages is achieved through direct TypeScript imports
- Bun is used for package management and development - no npm/pnpm/yarn needed

## Common Patterns

### Server Function with RPC

```typescript
import { createServerFn } from '@tanstack/react-start';
import { getWorkerRpc } from '@/lib/rpc';

const myServerFn = createServerFn({ method: 'GET' }).handler(async () => {
	const workerRpc = getWorkerRpc();
	return await workerRpc.someMethod();
});
```

### Route with Loader

```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/my-route')({
	loader: async () => myServerFn(),
	component: MyComponent,
});
```

## Troubleshooting

### TypeScript errors about worker-configuration.d.ts

Run `bun run cf-typegen` in the web package to regenerate types.

### Import errors between packages

Ensure both packages are installed: `bun install` from the root.

### RPC methods not type-checking

Check that `packages/web/env.d.ts` correctly imports from `../worker/src/rpc`.
