/**
 * Compress PDF with Ghostscript (WASM, in a Web Worker). gs.wasm (~15 MB) is downloaded only when
 * the user presses Compress, after the page has told them the one-time download size.
 * If the output is not smaller than the input, the user is told so and offered the original.
 */
import gsWasmUrl from "@okathira/ghostpdl-wasm/gs.wasm?url";
import { createDropzone, downloadBlob, downloadZip, formatBytes, renameExtension } from "../../lib/tool-ui";
import { tPlural } from "../../i18n/plural";
import type { ToolCtx } from "../types";
import { baseName, button, entryTracker, errorRegion, h, readFile, statusRegion } from "../pdf-shared/dom";
import { looksLikePdf, PdfToolError } from "../pdf-shared/pdf-errors";
import type { GsRequest, GsResponse } from "./gs.worker";
import { DEFAULT_PRESET, GS_WASM_BYTES, gsArgs, initialPreset, isPreset, judgeGsRun, PRESETS, quarter, type Preset } from "./presets";

const ACCEPT = "application/pdf,.pdf";
let uid = 0;

interface Entry {
  id: number;
  file: File;
  state: "pending" | "working" | "done" | "error";
  output?: Blob;
  /** True when the output was not smaller and the original is offered instead. */
  keptOriginal?: boolean;
  message?: string;
  /** The file needs a password: the row links to Unlock PDF. */
  encrypted?: boolean;
}

// ---------- engine (one worker per page, created on first use) ----------

interface GsRun {
  code: number;
  log: string[];
  output?: ArrayBuffer;
}

interface Engine {
  run(input: ArrayBuffer, args: string[], onProgress: (p: { total?: number; page?: number }) => void): Promise<GsRun>;
}

class GsRunError extends Error {
  constructor(
    message: string,
    public readonly log: string,
  ) {
    super(message);
  }
}

/** The user pressed Stop: the download was aborted or the worker terminated. */
class Stopped extends Error {}

let enginePromise: Promise<Engine> | null = null;
let engineAbort: AbortController | null = null;

/** Abort the engine download, or terminate the worker mid-file. The next run starts a fresh engine. */
function stopEngine(): void {
  engineAbort?.abort();
  engineAbort = null;
  enginePromise = null;
}

async function fetchWithProgress(url: string, onProgress: (loaded: number, total: number) => void, signal: AbortSignal): Promise<ArrayBuffer> {
  const res = await fetch(url, { signal });
  if (!res.ok || !res.body) throw new Error(`gs.wasm: HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length")) || GS_WASM_BYTES;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(loaded, total);
  }
  const out = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out.buffer;
}

function loadEngine(onDownload: (loaded: number, total: number) => void): Promise<Engine> {
  if (enginePromise) return enginePromise;
  const abort = new AbortController();
  engineAbort = abort;
  const promise: Promise<Engine> = (async () => {
    const wasm = await fetchWithProgress(gsWasmUrl, onDownload, abort.signal);
    if (abort.signal.aborted) throw new Stopped();
    const worker = new Worker(new URL("./gs.worker.ts", import.meta.url), { type: "module", name: "ghostscript" });
    const jobs = new Map<number, { resolve: (r: GsRun) => void; reject: (e: Error) => void; progress: (p: { total?: number; page?: number }) => void }>();
    let nextJob = 1;
    let failInit: ((err: Error) => void) | null = null;
    /** Fail everything, kill the worker and allow a fresh engine next time. */
    const shutDown = (err: Error) => {
      failInit?.(err);
      for (const job of jobs.values()) job.reject(err);
      jobs.clear();
      worker.terminate();
      if (enginePromise === promise) enginePromise = null;
    };
    abort.signal.addEventListener("abort", () => shutDown(new Stopped()), { once: true });
    await new Promise<void>((resolve, reject) => {
      failInit = reject;
      worker.addEventListener("message", (e: MessageEvent<GsResponse>) => {
        const msg = e.data;
        if (msg.type === "ready") resolve();
        else if (msg.type === "progress") jobs.get(msg.id)?.progress(msg);
        else if (msg.type === "result") {
          jobs.get(msg.id)?.resolve(msg);
          jobs.delete(msg.id);
        } else if (msg.type === "error") {
          if (msg.id === null) reject(new Error(msg.message));
          else {
            jobs.get(msg.id)?.reject(new GsRunError(msg.message, msg.log));
            jobs.delete(msg.id);
          }
        }
      });
      // A crash (e.g. out of memory) kills the worker.
      worker.addEventListener("error", (e) => shutDown(new Error(e.message || "worker error")));
      worker.postMessage({ type: "init", wasm } satisfies GsRequest, [wasm]);
    });
    failInit = null;
    return {
      run(input, args, progress) {
        const id = nextJob++;
        return new Promise<GsRun>((resolve, reject) => {
          if (abort.signal.aborted) return reject(new Stopped());
          jobs.set(id, { resolve, reject, progress });
          worker.postMessage({ type: "run", id, input, args } satisfies GsRequest, [input]);
        });
      },
    };
  })();
  enginePromise = promise;
  promise.catch(() => {
    if (enginePromise === promise) enginePromise = null;
  });
  return promise;
}

/** Page count as PDF.js sees it; PdfToolError("encrypted" | "invalid") when it cannot open the file. */
async function countPages(bytes: Uint8Array): Promise<number> {
  const { openForRender } = await import("../pdf-shared/pdfjs");
  // PDF.js transfers the buffer it gets to its worker: give it a copy.
  const doc = await openForRender(bytes.slice());
  const pages = doc.numPages;
  void doc.loadingTask.destroy();
  return pages;
}

// ---------- UI ----------

export function mount(el: HTMLElement, ctx: ToolCtx): void {
  const { t } = ctx;
  const id = `pdf-compress-${++uid}`;
  let entries: Entry[] = [];
  let nextId = 1;
  let busy = false;
  let engineReady = false;
  /** Bumped by Stop: a run whose token no longer matches has been stopped. */
  let runToken = 0;
  // render() rebuilds the list: only rows shown for the first time play the entry.
  const enterRow = entryTracker();

  const errors = errorRegion();
  const status = statusRegion();
  const drop = createDropzone({
    accept: ACCEPT,
    multiple: true,
    ctx,
    onFiles: ({ ok, rejected }) => {
      const room = ctx.limits.maxFiles > 0 ? ctx.limits.maxFiles - entries.length : ok.length;
      const accepted = ok.slice(0, Math.max(0, room));
      const messages = rejected.map((r) => r.reason);
      if (accepted.length < ok.length) messages.push(t("tool.error.tooMany", { max: ctx.limits.maxFiles }));
      if (messages.length) errors.show(messages);
      else errors.clear();
      if (accepted.length) {
        entries = entries.concat(accepted.map((file) => ({ id: nextId++, file, state: "pending" }) satisfies Entry));
        status.set(tPlural(ctx, "compress.added", accepted.length));
        render();
      }
    },
  });

  const presetName = `${id}-preset`;
  const startPreset = initialPreset(ctx.preset);
  const presetRows = PRESETS.map((p) => {
    const input = h("input", { type: "radio", name: presetName, value: p, id: `${id}-${p}`, checked: p === startPreset });
    input.addEventListener("change", resetResults);
    return h(
      "div",
      {},
      input,
      " ",
      h(
        "label",
        { for: `${id}-${p}` },
        h("strong", { text: t(`compress.preset.${p}`) }),
        " ",
        h("span", { className: "tool-note", text: t(`compress.preset.${p}.hint`) }),
      ),
    );
  });
  const options = h("fieldset", { className: "tool-options", hidden: true }, h("legend", { text: t("compress.preset.legend") }), ...presetRows);

  const engineNote = h("p", {
    className: "tool-note",
    hidden: true,
    text: t("compress.engineNote", { size: formatBytes(GS_WASM_BYTES) }),
  });
  const list = h("ul", { className: "tool-list", "aria-label": t("compress.listLabel"), hidden: true });
  const progress = h("progress", { className: "tool-progress", hidden: true, max: 1, value: 0 });
  const compressBtn = button(t("compress.action"), { variant: "primary", onClick: () => void compressAll() });
  const stopBtn = button(t("compress.stop"), { onClick: stop });
  stopBtn.hidden = true;
  const zipBtn = button(t("tool.downloadAll"), { onClick: () => void downloadAllZip() });
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: reset });
  const actions = h("div", { className: "tool-actions", hidden: true }, compressBtn, stopBtn, zipBtn, resetBtn);
  // A file that fails keeps its message in its own row; this off-screen alert only reads it out,
  // so sighted users do not see it twice. Last in the panel: out of flow, no grid gap.
  const rowAlert = h("p", { className: "visually-hidden", role: "alert" });

  el.append(
    h(
      "div",
      { className: "tool tool--pdf-compress" },
      drop,
      errors.el,
      options,
      engineNote,
      list,
      actions,
      progress,
      status.el,
      rowAlert,
    ),
  );
  render();

  function selectedPreset(): Preset {
    const v = el.querySelector<HTMLInputElement>(`input[name="${presetName}"]:checked`)?.value;
    return isPreset(v) ? v : DEFAULT_PRESET;
  }

  function resetResults() {
    for (const e of entries) {
      e.state = "pending";
      e.output = undefined;
      e.keptOriginal = undefined;
      e.message = undefined;
      e.encrypted = undefined;
    }
    render();
  }

  /** Stop the running job: the file being compressed goes back to waiting, finished files stay. */
  function stop() {
    if (!busy) return;
    runToken++;
    stopEngine();
    for (const e of entries) {
      if (e.state !== "working") continue;
      e.state = "pending";
      e.message = undefined;
    }
    busy = false;
    progress.hidden = true;
    status.set(t("compress.stopped"));
    render();
    compressBtn.focus();
  }

  function reset() {
    entries = [];
    errors.clear();
    rowAlert.textContent = "";
    status.set("");
    progress.hidden = true;
    render();
  }

  function outputName(e: Entry): string {
    return e.keptOriginal ? e.file.name : t("compress.outputName", { name: baseName(e.file.name) });
  }

  function render() {
    const has = entries.length > 0;
    options.hidden = !has;
    actions.hidden = !has;
    list.hidden = !has;
    engineNote.hidden = !has || engineReady;
    list.replaceChildren(
      ...entries.map((e) => {
        let meta = formatBytes(e.file.size);
        if (e.state === "working") meta = e.message ?? t("compress.working");
        if (e.state === "error") meta = e.message ?? t("tool.pdf.error.failed", { name: e.file.name });
        if (e.state === "done" && e.output) meta = e.message ?? "";
        const controls: HTMLElement[] = [];
        if (e.state === "done" && e.output) {
          const blob = e.output;
          const name = outputName(e);
          controls.push(
            button(e.keptOriginal ? t("compress.downloadOriginal") : t("tool.download"), {
              ariaLabel: t(e.keptOriginal ? "compress.downloadOriginalLabel" : "compress.downloadLabel", { name }),
              onClick: () => downloadBlob(blob, name),
            }),
          );
        }
        if (!busy) {
          controls.push(
            button(t("tool.remove"), {
              variant: "ghost",
              ariaLabel: t("compress.removeLabel", { name: e.file.name }),
              onClick: () => {
                entries = entries.filter((x) => x !== e);
                render();
                status.set(t("compress.removed", { name: e.file.name }));
                compressBtn.focus();
              },
            }),
          );
        }
        const li = h(
          "li",
          {
            className: "tool-item",
            "data-state": e.state,
            // Not smaller: not an error, not a win either (neutral meta, tool.css).
            "data-outcome": e.state === "done" && e.keptOriginal ? "kept-original" : undefined,
          },
          h("span", { className: "tool-item__name", text: e.file.name }),
          h(
            "span",
            { className: "tool-item__meta" },
            meta,
            e.state === "error" && e.encrypted && " ",
            e.state === "error" && e.encrypted && h("a", { href: t("compress.error.encryptedHref"), text: t("compress.error.encryptedLink") }),
            e.state === "error" && e.encrypted && ".",
          ),
          h("span", { className: "tool-actions" }, ...controls),
        );
        enterRow(e.id, li);
        return li;
      }),
    );
    const done = entries.filter((e) => e.state === "done" && e.output);
    stopBtn.hidden = !busy;
    compressBtn.disabled = busy || !entries.some((e) => e.state === "pending");
    zipBtn.hidden = done.length < 2;
    zipBtn.disabled = busy;
    resetBtn.disabled = busy;
    for (const input of options.querySelectorAll("input")) input.disabled = busy;
  }

  async function compressAll() {
    const todo = entries.filter((e) => e.state === "pending");
    if (todo.length === 0 || busy) return;
    const token = ++runToken;
    const stopped = () => token !== runToken;
    busy = true;
    errors.clear();
    rowAlert.textContent = "";
    render();
    stopBtn.focus();
    let engine: Engine;
    try {
      progress.hidden = false;
      progress.removeAttribute("value");
      status.set(t("compress.loadingEngine", { size: formatBytes(GS_WASM_BYTES) }));
      // The bar follows every chunk; the live region speaks at 25, 50, 75 and 100% only.
      let spoken = 0;
      engine = await loadEngine((loaded, total) => {
        if (stopped()) return;
        progress.max = total;
        progress.value = loaded;
        const q = quarter(loaded, total);
        if (q > spoken) {
          spoken = q;
          status.set(t("compress.downloading", { loaded: formatBytes(loaded), total: formatBytes(total) }));
        }
      });
      if (stopped()) return;
      engineReady = true;
    } catch (err) {
      if (stopped()) return;
      console.error(err);
      errors.show(t("compress.error.engine"));
      status.set("");
      progress.hidden = true;
      busy = false;
      render();
      return;
    }

    const preset = selectedPreset();
    const failures: string[] = [];
    for (const [n, e] of todo.entries()) {
      if (stopped()) return;
      e.state = "working";
      e.message = t("compress.working");
      render();
      progress.max = 1;
      progress.removeAttribute("value");
      status.set(t("compress.fileStatus", { current: n + 1, total: todo.length, name: e.file.name }));
      try {
        const bytes = await readFile(e.file);
        if (!looksLikePdf(bytes)) throw new PdfToolError("invalid");
        // Unreadable or locked input fails here, before Ghostscript can turn it into a blank page.
        const inputPages = await countPages(bytes);
        if (stopped()) return;
        let pages = 0;
        const run = await engine.run(bytes.buffer as ArrayBuffer, gsArgs(preset), (p) => {
          if (p.total) pages = p.total;
          if (p.page && pages && !stopped()) {
            progress.max = pages;
            progress.value = p.page;
            e.message = t("compress.page", { page: p.page, pages });
            const meta = list.querySelector(`.tool-item[data-state="working"] .tool-item__meta`);
            if (meta) meta.textContent = e.message;
          }
        });
        if (stopped()) return;
        const outBytes = run.output ? new Uint8Array(run.output) : null;
        const outputPages = outBytes && looksLikePdf(outBytes) ? await countPages(outBytes).catch(() => null) : null;
        if (stopped()) return;
        const verdict = judgeGsRun({ code: run.code, log: run.log, inputPages, outputPages });
        if (verdict === "encrypted") throw new PdfToolError("encrypted");
        if (verdict !== "ok" || !outBytes) throw new GsRunError(`ghostscript: exit ${run.code}, pages ${inputPages} -> ${outputPages}`, run.log.slice(-40).join("\n"));
        const before = e.file.size;
        const after = outBytes.byteLength;
        if (after < before) {
          e.output = new Blob([outBytes], { type: "application/pdf" });
          e.keptOriginal = false;
          e.message = t("compress.result", {
            before: formatBytes(before),
            after: formatBytes(after),
            percent: Math.max(1, Math.round((1 - after / before) * 100)),
          });
        } else {
          e.output = e.file;
          e.keptOriginal = true;
          e.message = t("compress.notSmaller", { before: formatBytes(before), after: formatBytes(after) });
        }
        e.state = "done";
      } catch (err) {
        if (stopped() || err instanceof Stopped) return;
        if (err instanceof GsRunError) console.warn(err.message, err.log);
        else if (!(err instanceof PdfToolError)) console.error(err);
        e.state = "error";
        if (err instanceof PdfToolError && err.code === "encrypted") {
          e.encrypted = true;
          e.message = t("compress.error.encrypted", { name: e.file.name });
          failures.push(`${e.message} ${t("compress.error.encryptedLink")}.`);
        } else {
          e.message =
            err instanceof PdfToolError
              ? t("tool.pdf.error.invalid", { name: e.file.name })
              : t("compress.error.failed", { name: e.file.name });
          failures.push(e.message);
        }
      }
      render();
    }
    busy = false;
    progress.hidden = true;
    const done = entries.filter((e) => e.state === "done");
    status.set(tPlural(ctx, "compress.done", done.length));
    if (failures.length) rowAlert.textContent = failures.join(" ");
    render();
    (list.querySelector<HTMLButtonElement>(".tool-item[data-state='done'] .tool-actions .btn:not(.btn--ghost)") ?? compressBtn).focus();
  }

  async function downloadAllZip() {
    const done = entries.filter((e) => e.state === "done" && e.output);
    const used = new Set<string>();
    const files = done.map((e) => {
      let name = outputName(e);
      for (let i = 2; used.has(name); i++) name = renameExtension(outputName(e), `${i}.pdf`);
      used.add(name);
      return { name, blob: e.output! };
    });
    errors.clear();
    try {
      await downloadZip(files, t("compress.zipName"));
    } catch (err) {
      console.error(err);
      errors.show(t("compress.error.zip"));
    }
  }
}
