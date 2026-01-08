/**
 * Helper to get the typed WORKER_RPC binding
 */
import { env } from "cloudflare:workers";
import type { WorkerRpc } from "../../../worker/src/rpc";

export const getWorkerRpc = (): WorkerRpc => {
  return env.WORKER_RPC as unknown as WorkerRpc;
};
