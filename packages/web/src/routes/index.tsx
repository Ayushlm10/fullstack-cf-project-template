import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getWorkerRpc } from "@/lib/rpc";

const sayHello = createServerFn({ method: "GET" }).handler(async () => {
  const workerRpc = getWorkerRpc();
  return workerRpc.sayHello("World");
});

export const Route = createFileRoute("/")({
  component: Home,
  loader: async () => sayHello(),
});

function Home() {
  const data = Route.useLoaderData();

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Fullstack Bun Monorepo</h1>
      <p>TanStack Start + Cloudflare Workers + Bun</p>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#f5f5f5",
          borderRadius: "8px",
        }}
      >
        <h2>RPC Result:</h2>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
}
