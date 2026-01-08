import { Hono } from "hono";
import { cors } from "hono/cors";

// Create Hono app
const app = new Hono();

// Enable CORS
app.use("/*", cors());

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", message: "Worker is running!" });
});

// Root endpoint
app.get("/", (c) => {
  return c.json({
    message: "Cloudflare Worker API",
    endpoints: {
      health: "/health",
    },
  });
});

// Export the Hono app as default (HTTP handler)
export default app;

// Export the RPC worker for service bindings
export { WorkerRpc } from "./rpc";
