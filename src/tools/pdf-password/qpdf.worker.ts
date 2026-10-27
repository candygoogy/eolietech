/// <reference lib="webworker" />
/**
 * qpdf 12.2.0 (Apache-2.0, @neslinesli93/qpdf-wasm) in a dedicated worker. Every command runs in a
 * fresh qpdf instance, so nothing (files, passwords, state left by an aborted run) carries over.
 * qpdf.wasm comes from this site (a Vite asset URL passed in by the page); the browser caches it, so
 * later instances do not download it again.
 *
 * This build has no print hooks: it binds console.log / console.error when an instance is created.
 * They are swapped for collectors during that call, so qpdf's output reaches the page as data and
 * never the console. qpdf never echoes passwords, and nothing here logs the arguments.
 */
import createQpdf from "@neslinesli93/qpdf-wasm";
import { INPUT_PATH, OUTPUT_PATH } from "./qpdf-args";

export type QpdfRequest =
  | { type: "init"; wasmUrl: string }
  | { type: "run"; id: number; input: Blob; args: string[]; wantOutput: boolean };

export type QpdfResponse =
  | { type: "ready" }
  | { type: "result"; id: number; code: number; stderr: string[]; output?: ArrayBuffer }
  | { type: "error"; id: number | null; message: string };

interface QpdfInstance {
  callMain(args: string[]): number;
  FS: { writeFile(path: string, data: Uint8Array): void; readFile(path: string): Uint8Array };
}

const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (msg: QpdfResponse, transfer: Transferable[] = []) => scope.postMessage(msg, transfer);
let wasmUrl = "";
// One command at a time: instances are created with console swapped out, and jobs come in sequence anyway.
let queue: Promise<void> = Promise.resolve();

async function instance(stdout: string[], stderr: string[]): Promise<QpdfInstance> {
  const { log, error } = console;
  console.log = (...a: unknown[]) => void stdout.push(a.join(" "));
  console.error = (...a: unknown[]) => void stderr.push(a.join(" "));
  try {
    // The factory binds console synchronously; restore it as soon as the call returns.
    const ready = (createQpdf as unknown as (opts: { locateFile: () => string }) => Promise<QpdfInstance>)({ locateFile: () => wasmUrl });
    console.log = log;
    console.error = error;
    return await ready;
  } finally {
    console.log = log;
    console.error = error;
  }
}

scope.addEventListener("message", (event: MessageEvent<QpdfRequest>) => {
  const msg = event.data;
  if (msg.type === "init") {
    wasmUrl = msg.wasmUrl;
    // Load one instance now: it downloads qpdf.wasm (into the HTTP cache) and proves it runs here.
    queue = queue.then(() =>
      instance([], []).then(
        () => post({ type: "ready" }),
        (err: unknown) => post({ type: "error", id: null, message: err instanceof Error ? err.message : String(err) }),
      ),
    );
  } else if (msg.type === "run") {
    queue = queue.then(() => run(msg.id, msg.input, msg.args, msg.wantOutput));
  }
});

async function run(id: number, input: Blob, args: string[], wantOutput: boolean) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  try {
    const bytes = new Uint8Array(await input.arrayBuffer());
    const qpdf = await instance(stdout, stderr);
    qpdf.FS.writeFile(INPUT_PATH, bytes);
    let code: number;
    try {
      code = qpdf.callMain(args.slice());
    } catch (err) {
      // Emscripten reports exit() as an ExitStatus throw.
      const status = (err as { status?: number }).status;
      if (typeof status !== "number") throw err;
      code = status;
    }
    let output: ArrayBuffer | undefined;
    if (wantOutput && (code === 0 || code === 3)) {
      try {
        output = qpdf.FS.readFile(OUTPUT_PATH).slice().buffer;
      } catch {
        // No output written: the page reports the run as failed.
      }
    }
    post({ type: "result", id, code, stderr, output }, output ? [output] : []);
  } catch (err) {
    post({ type: "error", id, message: err instanceof Error ? err.message : String(err) });
  }
}
