/** A small pool of image workers (main thread). One job per worker at a time; a crashed worker is replaced. */
import type { JobRequest, JobResponse } from "./protocol";

interface Slot {
  worker: Worker | null;
  busy: boolean;
}

export class WorkerPool {
  private slots: Slot[];
  /** Jobs in flight: ended with an error result when the pool is terminated, so no caller waits forever. */
  private pending = new Set<(res: JobResponse) => void>();

  constructor(
    private readonly create: () => Worker,
    size: number,
  ) {
    this.slots = Array.from({ length: Math.max(1, size) }, () => ({ worker: null, busy: false }));
  }

  /** Number of idle workers. */
  get idle(): number {
    return this.slots.filter((s) => !s.busy).length;
  }

  /** Run a job on an idle worker. Callers must check `idle` first. */
  run(req: JobRequest): Promise<JobResponse> {
    const slot = this.slots.find((s) => !s.busy);
    if (!slot) return Promise.reject(new Error("no idle worker"));
    slot.busy = true;
    const worker = (slot.worker ??= this.create());
    return new Promise<JobResponse>((resolve) => {
      const done = (res: JobResponse) => {
        worker.onmessage = null;
        worker.onerror = null;
        slot.busy = false;
        this.pending.delete(settle);
        resolve(res);
      };
      const settle = (res: JobResponse) => done(res);
      this.pending.add(settle);
      worker.onmessage = (e: MessageEvent<JobResponse>) => done(e.data);
      worker.onerror = (e) => {
        e.preventDefault();
        // Out-of-memory aborts and load failures surface here; start a fresh worker next time.
        worker.terminate();
        slot.worker = null;
        done({ id: req.id, ok: false, error: "generic", detail: e.message });
      };
      worker.postMessage(req, [req.buffer]);
    });
  }

  /** End every worker. Jobs in flight settle as a "generic" error (the caller discards them); the next run starts fresh workers. */
  terminate(): void {
    const jobs = [...this.pending];
    this.pending.clear();
    for (const slot of this.slots) {
      slot.worker?.terminate();
      slot.worker = null;
      slot.busy = false;
    }
    for (const settle of jobs) settle({ id: -1, ok: false, error: "generic", detail: "terminated" });
  }
}

/** Pool size: 2 workers on machines with 4+ cores, else 1 (each worker holds full decoded images in memory). */
export const defaultPoolSize = (): number =>
  typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 1) >= 4 ? 2 : 1;
