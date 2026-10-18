/**
 * The postcard's compressor engine, loaded by desk-post.ts with a dynamic import on the first photo
 * only. It is the image compressor's own worker (src/tools/image-compress/worker.ts: the shared
 * sniff -> decode -> resize -> encode job) behind the shared WorkerPool, so no codec code is
 * duplicated. The worker, and the codecs it loads, are fetched when the first job starts.
 */
import { WorkerPool } from "../tools/image-shared/pool";
import type { JobRequest, JobResponse } from "../tools/image-shared/protocol";

let pool: WorkerPool | null = null;

/** Run one job. Callers run one at a time (desk-post.ts queues them). */
export function compress(req: JobRequest): Promise<JobResponse> {
  pool ??= new WorkerPool(() => new Worker(new URL("../tools/image-compress/worker.ts", import.meta.url), { type: "module" }), 1);
  return pool.run(req);
}
