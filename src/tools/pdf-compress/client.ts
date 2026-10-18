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
import { looksLikePdf } from "../pdf-shared/pdf-errors";
import type { GsRequest, GsResponse } from "./gs.worker";
import { DEFAULT_PRESET, GS_WASM_BYTES, gsArgs, isPreset, PRESETS, type Preset } from "./presets";

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
}

// ---------- engine (one worker per page, created on first use) ----------

interface Engine {
  run(input: ArrayBuffer, args: string[], onProgress: (p: { total?: number; page?: number }) => void): Promise<ArrayBuffer>;
}

class GsRunError extends Error {
  constructor(
    message: string,
    public readonly log: string,
  ) {
    super(message);
  }
}

let enginePromise: Promise<Engine> | null = null;

async function fetchWithProgress(url: string, onProgress: (loaded: number, total: number) => void): Promise<ArrayBuffer> {
  const res = await fetch(url);
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
  enginePromise ??= (async () => {
    const wasm = await fetchWithProgress(gsWasmUrl, onDownload);
    const worker = new Worker(new URL("./gs.worker.ts", import.meta.url), { type: "module", name: "ghostscript" });
    const jobs = new Map<number, { resolve: (b: ArrayBuffer) => void; reject: (e: Error) => void; progress: (p: { total?: number; page?: number }) => void }>();
    let nextJob = 1;
    await new Promise<void>((resolve, reject) => {
      worker.addEventListener("message", (e: MessageEvent<GsResponse>) => {
        const msg = e.data;
        if (msg.type === "ready") resolve();
        else if (msg.type === "progress") jobs.get(msg.id)?.progress(msg);
        else if (msg.type === "result") {
          jobs.get(msg.id)?.resolve(msg.output);
          jobs.delete(msg.id);
        } else if (msg.type === "error") {
          if (msg.id === null) reject(new Error(msg.message));
          else {
            jobs.get(msg.id)?.reject(new GsRunError(msg.message, msg.log));
            jobs.delete(msg.id);
          }
        }
      });
      worker.addEventListener("error", (e) => {
        // A crash (e.g. out of memory) kills the worker: fail everything and allow a fresh engine next time.
        const err = new Error(e.message || "worker error");
        reject(err);
        for (const job of jobs.values()) job.reject(err);
        jobs.clear();
        worker.terminate();
        enginePromise = null;
      });
      worker.postMessage({ type: "init", wasm } satisfies GsRequest, [wasm]);
    });
    return {
      run(input, args, progress) {
        const id = nextJob++;
        return new Promise<ArrayBuffer>((resolve, reject) => {
          jobs.set(id, { resolve, reject, progress });
          worker.postMessage({ type: "run", id, input, args } satisfies GsRequest, [input]);
        });
      },
    };
  })();
  enginePromise.catch(() => (enginePromise = null));
  return enginePromise;
}

// ---------- UI ----------

export function mount(el: HTMLElement, ctx: ToolCtx): void {
  const { t } = ctx;
  const id = `pdf-compress-${++uid}`;
  let entries: Entry[] = [];
  let nextId = 1;
  let busy = false;
  let engineReady = false;
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
  const presetRows = PRESETS.map((p) => {
    const input = h("input", { type: "radio", name: presetName, value: p, id: `${id}-${p}`, checked: p === DEFAULT_PRESET });
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
  const zipBtn = button(t("tool.downloadAll"), { onClick: () => void downloadAllZip() });
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: reset });
  const actions = h("div", { className: "tool-actions", hidden: true }, compressBtn, zipBtn, resetBtn);
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
    }
    render();
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
          h("span", { className: "tool-item__meta", text: meta }),
          h("span", { className: "tool-actions" }, ...controls),
        );
        enterRow(e.id, li);
        return li;
      }),
    );
    const done = entries.filter((e) => e.state === "done" && e.output);
    compressBtn.disabled = busy || !entries.some((e) => e.state === "pending");
    zipBtn.hidden = done.length < 2;
    zipBtn.disabled = busy;
    resetBtn.disabled = busy;
    for (const input of options.querySelectorAll("input")) input.disabled = busy;
  }

  async function compressAll() {
    const todo = entries.filter((e) => e.state === "pending");
    if (todo.length === 0 || busy) return;
    busy = true;
    errors.clear();
    rowAlert.textContent = "";
    render();
    let engine: Engine;
    try {
      progress.hidden = false;
      progress.removeAttribute("value");
      status.set(t("compress.loadingEngine", { size: formatBytes(GS_WASM_BYTES) }));
      engine = await loadEngine((loaded, total) => {
        progress.max = total;
        progress.value = loaded;
        status.set(t("compress.downloading", { loaded: formatBytes(loaded), total: formatBytes(total) }));
      });
      engineReady = true;
    } catch (err) {
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
      e.state = "working";
      e.message = t("compress.working");
      render();
      progress.max = 1;
      progress.removeAttribute("value");
      status.set(t("compress.fileStatus", { current: n + 1, total: todo.length, name: e.file.name }));
      try {
        const bytes = await readFile(e.file);
        if (!looksLikePdf(bytes)) throw new GsRunError("not a pdf", "");
        let pages = 0;
        const out = await engine.run(bytes.buffer as ArrayBuffer, gsArgs(preset), (p) => {
          if (p.total) pages = p.total;
          if (p.page && pages) {
            progress.max = pages;
            progress.value = p.page;
            e.message = t("compress.page", { page: p.page, pages });
            const meta = list.querySelector(`.tool-item[data-state="working"] .tool-item__meta`);
            if (meta) meta.textContent = e.message;
          }
        });
        const outBytes = new Uint8Array(out);
        if (!looksLikePdf(outBytes)) throw new GsRunError("bad output", "");
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
        const log = err instanceof GsRunError ? `${err.message}\n${err.log}` : String(err);
        if (!(err instanceof GsRunError)) console.error(err);
        e.state = "error";
        e.message = /password|encrypt/i.test(log)
          ? t("tool.pdf.error.encrypted", { name: e.file.name })
          : /not a pdf/.test(log)
            ? t("tool.pdf.error.invalid", { name: e.file.name })
            : t("compress.error.failed", { name: e.file.name });
        failures.push(e.message);
      }
      render();
    }
    busy = false;
    progress.hidden = true;
    const done = entries.filter((e) => e.state === "done");
    status.set(tPlural(ctx, "compress.done", done.length));
    if (failures.length) rowAlert.textContent = failures.join(" ");
    render();
    list.querySelector<HTMLButtonElement>(".tool-item[data-state='done'] .tool-actions .btn:not(.btn--ghost)")?.focus();
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
    await downloadZip(files, t("compress.zipName"));
  }
}
