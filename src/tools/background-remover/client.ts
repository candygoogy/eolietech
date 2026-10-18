/**
 * Background remover: BiRefNet_lite runs in ./worker.ts (WebGPU or WebAssembly). The model (about
 * 94 MB) is downloaded from this site only when the user presses the button, after the page has
 * shown its size; the browser then keeps it in its cache. Images never leave the device.
 */
import { createDropzone, downloadBlob, downloadZip, formatBytes } from "../../lib/tool-ui";
import { detectDevice, type Device } from "../ai-shared/backend";
import { button, errorRegion, h, statusRegion } from "../ai-shared/dom";
import { firstDownloadBytes } from "../ai-shared/model-files";
import type { ToolCtx } from "../types";
import { outputName } from "./mask";
import type { BgRequest, BgResponse } from "./worker";
import "./bg.css";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.avif,.gif,.bmp";
const MODEL_ID = "birefnet-lite-512";

interface Entry {
  id: number;
  file: File;
  state: "pending" | "working" | "done" | "error";
  output?: Blob;
  preview?: string;
  message?: string;
}

type Ready = Extract<BgResponse, { type: "ready" }>;

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const { t } = ctx;
  let entries: Entry[] = [];
  let nextId = 1;
  let busy = false;
  let worker: Worker | null = null;
  let ready: Promise<Ready> | null = null;
  let modelLoaded = false;
  const jobs = new Map<number, { resolve: (m: BgResponse) => void }>();
  let onLoadMessage: ((m: BgResponse) => void) | null = null;

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
        status.set(t("bg.added", { count: accepted.length }));
        render();
      }
    },
  });

  // The page picks the backend up front so the notice shows exactly what will be downloaded.
  let device: Device = "wasm";
  const downloadSize = () => formatBytes(firstDownloadBytes(MODEL_ID, device));
  const modelNote = h("p", { className: "tool-note", text: t("bg.modelNote", { size: downloadSize() }) });
  const deviceReady = detectDevice().then((d) => {
    device = d;
    modelNote.textContent = t("bg.modelNote", { size: downloadSize() });
  });
  const backendNote = h("p", { className: "tool-note", hidden: true });
  const list = h("ul", { className: "tool-list", "aria-label": t("bg.listLabel"), hidden: true });
  const progress = h("progress", { className: "tool-progress", hidden: true, max: 1, value: 0 });
  const runBtn = button(t("bg.action"), { variant: "primary", onClick: () => void processAll() });
  const zipBtn = button(t("tool.downloadAll"), { onClick: () => void downloadAllZip() });
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: reset });
  const actions = h("div", { className: "tool-actions", hidden: true }, runBtn, zipBtn, resetBtn);

  el.append(
    h("div", { className: "tool tool--bg-remover" }, drop, errors.el, modelNote, backendNote, list, actions, progress, status.el),
  );
  render();

  function freeEntry(e: Entry) {
    if (e.preview) URL.revokeObjectURL(e.preview);
    e.preview = undefined;
  }

  function reset() {
    for (const e of entries) freeEntry(e);
    entries = [];
    errors.clear();
    status.set("");
    progress.hidden = true;
    render();
  }

  function render() {
    const has = entries.length > 0;
    actions.hidden = !has;
    list.hidden = !has;
    modelNote.hidden = modelLoaded;
    list.replaceChildren(
      ...entries.map((e) => {
        let meta = formatBytes(e.file.size);
        if (e.state === "working") meta = t("bg.working");
        else if (e.state === "error" || e.state === "done") meta = e.message ?? meta;
        const controls: HTMLElement[] = [];
        if (e.state === "done" && e.output) {
          const blob = e.output;
          const name = outputName(e.file.name);
          controls.push(
            button(t("tool.download"), {
              variant: "primary",
              ariaLabel: t("bg.downloadLabel", { name }),
              onClick: () => downloadBlob(blob, name),
            }),
          );
        }
        if (!busy) {
          controls.push(
            button(t("tool.remove"), {
              variant: "ghost",
              ariaLabel: t("bg.removeLabel", { name: e.file.name }),
              onClick: () => {
                freeEntry(e);
                entries = entries.filter((x) => x !== e);
                render();
                status.set(t("bg.removed", { name: e.file.name }));
                runBtn.focus();
              },
            }),
          );
        }
        const thumb = e.preview
          ? h("img", { className: "tool-item__thumb", src: e.preview, alt: t("bg.previewAlt", { name: e.file.name }), decoding: "async" })
          : h("span", { className: "tool-item__thumb", "aria-hidden": "true" });
        return h(
          "li",
          { className: "tool-item", "data-state": e.state },
          thumb,
          h("span", { className: "tool-item__name", text: e.file.name }),
          h("span", { className: "tool-item__meta", text: meta }),
          h("span", { className: "tool-actions" }, ...controls),
        );
      }),
    );
    const done = entries.filter((e) => e.state === "done" && e.output);
    runBtn.disabled = busy || !entries.some((e) => e.state === "pending");
    zipBtn.hidden = done.length < 2;
    zipBtn.disabled = busy;
    resetBtn.disabled = busy;
  }

  function startWorker(): Promise<Ready> {
    const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "background-remover" });
    worker = w;
    return new Promise<Ready>((resolve, reject) => {
      onLoadMessage = (msg) => {
        if (msg.type === "progress") {
          progress.max = msg.total || 1;
          progress.value = msg.loaded;
          status.set(
            msg.downloaded > 0
              ? t("bg.downloading", { loaded: formatBytes(msg.loaded), total: formatBytes(msg.total) })
              : t("bg.fromCache"),
          );
          if (msg.loaded >= msg.total) {
            progress.removeAttribute("value");
            status.set(t("bg.starting"));
          }
        } else if (msg.type === "ready") {
          onLoadMessage = null;
          resolve(msg);
        } else if (msg.type === "error" && msg.id === null) {
          onLoadMessage = null;
          reject(new Error(msg.message));
        }
      };
      w.addEventListener("message", (event: MessageEvent<BgResponse>) => {
        const msg = event.data;
        if ((msg.type === "result" || msg.type === "error") && msg.id !== null) {
          jobs.get(msg.id)?.resolve(msg);
          jobs.delete(msg.id);
        } else onLoadMessage?.(msg);
      });
      w.addEventListener("error", (e) => {
        // A crash (usually out of memory) kills the worker: fail what is pending, start fresh next time.
        const err = new Error(e.message || "worker error");
        onLoadMessage = null;
        reject(err);
        for (const job of jobs.values()) job.resolve({ type: "error", id: -1, code: "failed", message: err.message });
        jobs.clear();
        stopWorker();
      });
      w.postMessage({ type: "load", device } satisfies BgRequest);
    });
  }

  function stopWorker() {
    worker?.terminate();
    worker = null;
    ready = null;
    modelLoaded = false;
  }

  function runJob(e: Entry): Promise<BgResponse> {
    return new Promise((resolve) => {
      if (!worker) {
        resolve({ type: "error", id: e.id, code: "load", message: "no worker" });
        return;
      }
      jobs.set(e.id, { resolve });
      worker.postMessage({ type: "run", id: e.id, file: e.file } satisfies BgRequest);
    });
  }

  function errorText(msg: Extract<BgResponse, { type: "error" }>, e: Entry): string {
    if (msg.code === "decode") return t("bg.error.decode", { name: e.file.name });
    if (msg.code === "tooLarge") return t("bg.error.tooLarge", { name: e.file.name });
    return t("bg.error.failed", { name: e.file.name });
  }

  async function processAll() {
    const todo = entries.filter((e) => e.state === "pending");
    if (todo.length === 0 || busy) return;
    busy = true;
    errors.clear();
    render();
    progress.hidden = false;
    try {
      if (!ready) {
        progress.removeAttribute("value");
        await deviceReady;
        status.set(t("bg.loading", { size: downloadSize() }));
        ready = startWorker();
      }
      const info = await ready;
      modelLoaded = true;
      backendNote.hidden = false;
      backendNote.textContent =
        info.device === "webgpu" ? t("bg.backend.webgpu") : t("bg.backend.wasm", { threads: info.threads });
    } catch (err) {
      console.error(err);
      stopWorker();
      errors.show(t("bg.error.load"));
      status.set("");
      progress.hidden = true;
      busy = false;
      render();
      return;
    }

    const failures: string[] = [];
    progress.max = todo.length;
    for (const [n, e] of todo.entries()) {
      e.state = "working";
      render();
      progress.value = n;
      status.set(t("bg.fileStatus", { current: n + 1, total: todo.length, name: e.file.name }));
      const msg = await runJob(e);
      if (msg.type === "result") {
        e.output = msg.png;
        e.preview = URL.createObjectURL(msg.png);
        e.state = "done";
        e.message = t("bg.result", { width: msg.width, height: msg.height, size: formatBytes(msg.png.size) });
      } else if (msg.type === "error") {
        e.state = "error";
        e.message = errorText(msg, e);
        failures.push(e.message);
        if (!worker) {
          // The worker died; reload the model on the next attempt.
          e.state = "pending";
          break;
        }
      }
      render();
    }
    busy = false;
    progress.hidden = true;
    status.set(t("bg.done", { count: entries.filter((e) => e.state === "done").length }));
    if (failures.length) errors.show(failures);
    render();
    list.querySelector<HTMLButtonElement>(".tool-item[data-state='done'] .btn--primary")?.focus();
  }

  async function downloadAllZip() {
    const used = new Set<string>();
    const files = entries
      .filter((e) => e.state === "done" && e.output)
      .map((e) => {
        const base = outputName(e.file.name);
        let name = base;
        for (let i = 2; used.has(name); i++) name = base.replace(/\.png$/, `-${i}.png`);
        used.add(name);
        return { name, blob: e.output! };
      });
    await downloadZip(files, t("bg.zipName"));
  }

  return () => {
    reset();
    stopWorker();
  };
}
