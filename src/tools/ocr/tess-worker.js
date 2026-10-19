// @ts-nocheck: a classic worker script (self is a WorkerGlobalScope here), not part of the typed bundle.
/*
 * Classic worker entry for the OCR tool (served as a bundled asset, ./engine.ts passes the URLs).
 *
 * tesseract.js-core's emscripten loader looks for its .wasm next to the worker script under the
 * original file name, but Vite serves it under a hashed name. So this entry loads the chosen core
 * script first and wraps TesseractCore to hand it the real .wasm URL (locateFile); tesseract.js's
 * worker script, loaded next, sees TesseractCore already defined and does not fetch a core itself.
 *
 * It also counts the bytes of the language data downloads (the worker's own fetch) and reports them
 * through tesseract.js's progress channel, so the page can show "2.1 MB of 6.5 MB".
 *
 * Query: ?core=<core .js URL>&wasm=<core .wasm URL>&worker=<tesseract.js worker URL>, all same-origin.
 */
(() => {
  const params = new URL(self.location.href).searchParams;
  const sameOrigin = (name) => {
    const url = new URL(params.get(name) || "", self.location.href);
    if (url.origin !== self.location.origin) throw new Error(`ocr worker: ${name} must be same-origin`);
    return url.href;
  };
  const core = sameOrigin("core");
  const wasm = sameOrigin("wasm");
  const worker = sameOrigin("worker");

  importScripts(core);
  const Core = self.TesseractCore;
  if (typeof Core !== "function") throw new Error("ocr worker: TesseractCore missing");
  self.TesseractCore = (moduleArg = {}) => Core({ ...moduleArg, locateFile: () => wasm });

  const realFetch = self.fetch.bind(self);
  self.fetch = async (input, init) => {
    const res = await realFetch(input, init);
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!/\.traineddata$/.test(url) || !res.ok || !res.body) return res;
    let loaded = 0;
    let last = 0;
    const report = (done) =>
      self.postMessage({ status: "progress", action: "download", jobId: "download", data: { status: "eolietech:download", url, loaded, done } });
    const counted = res.body.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          loaded += chunk.byteLength;
          if (loaded - last >= 256 * 1024) {
            last = loaded;
            report(false);
          }
          controller.enqueue(chunk);
        },
        flush() {
          report(true);
        },
      }),
    );
    return new Response(counted, { status: res.status, statusText: res.statusText, headers: res.headers });
  };

  importScripts(worker);
})();
