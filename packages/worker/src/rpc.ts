import { WorkerEntrypoint } from "cloudflare:workers";

/**
 * RPC Worker Entrypoint
 * Methods here can be called via service bindings
 */
export class WorkerRpc extends WorkerEntrypoint {
  /**
   * Simple greeting RPC method
   */
  async sayHello(name: string): Promise<{ message: string; timestamp: number }> {
    return {
      message: `Hello, ${name}!`,
      timestamp: Date.now(),
    };
  }
}

export default WorkerRpc;
