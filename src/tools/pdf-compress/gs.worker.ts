/// <reference lib="webworker" />
/**
 * Ghostscript (AGPL-3.0, @okathira/ghostpdl-wasm) in a dedicated worker, single-threaded (no
 * SharedArrayBuffer, works without cross-origin isolation). The page thread downloads gs.wasm
 * (so it can show progress) and transfers the bytes here; this worker compiles it once and
 * creates a fresh Ghostscript instance per file, so no state leaks between runs.
 */
import createGs from "@okathira/ghostpdl-wasm";
import { INPUT_PATH, OUTPUT_PATH, parseProgress } from "./presets";

export type GsRequest =
  | { type: "init"; wasm: ArrayBuffer }
  | { type: "run"; id: number; input: ArrayBuffer; args: string[] };

export type GsResponse =
  | { type: "ready" }
  | { type: "progress"; id: number; total?: number; page?: number }
  | { type: "result"; id: number; output: ArrayBuffer }
  | { type: "error"; id: number | null; message: string; log: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;
let compiled: Promise<WebAssembly.Module> | null = null;

const post = (msg: GsResponse, transfer: Transferable[] = []) => scope.postMessage(msg, transfer);

scope.addEventListener("message", (event: MessageEvent<GsRequest>) => {
  const msg = event.data;
  if (msg.type === "init") {
    compiled = WebAssembly.compile(msg.wasm);
    compiled.then(
      () => post({ type: "ready" }),
      (err: unknown) => post({ type: "error", id: null, message: String(err), log: "" }),
    );
  } else if (msg.type === "run") {
    void run(msg.id, msg.input, msg.args);
  }
});

async function run(id: number, input: ArrayBuffer, args: string[]) {
  const log: string[] = [];
  try {
    if (!compiled) throw new Error("not initialised");
    const wasmModule = await compiled;
    const gs = await createGs({
      // Reuse the compiled module; never let Emscripten fetch or locate gs.wasm itself.
      instantiateWasm(imports: WebAssembly.Imports, done: (instance: WebAssembly.Instance) => void) {
        WebAssembly.instantiate(wasmModule, imports).then(
          (instance) => done(instance),
          (err: unknown) => post({ type: "error", id, message: String(err), log: "" }),
        );
        return undefined;
      },
      print(line: string) {
        log.push(line);
        const progress = parseProgress(line);
        if (progress) post({ type: "progress", id, ...progress });
      },
      printErr(line: string) {
        log.push(line);
      },
    });
    gs.FS.writeFile(INPUT_PATH, new Uint8Array(input));
    let code: number;
    try {
      code = gs.callMain(args);
    } catch (err) {
      // Emscripten reports exit() as an ExitStatus throw.
      const status = (err as { status?: number }).status;
      if (typeof status !== "number") throw err;
      code = status;
    }
    if (code !== 0) throw new Error(`ghostscript exited with ${code}`);
    const out = gs.FS.readFile(OUTPUT_PATH);
    const copy = out.slice().buffer;
    post({ type: "result", id, output: copy }, [copy]);
  } catch (err) {
    post({ type: "error", id, message: err instanceof Error ? err.message : String(err), log: log.slice(-40).join("\n") });
  }
}
