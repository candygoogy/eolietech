/**
 * Shared batch UI for the image tools: drop zone, option fields, file list with per-file status and
 * downloads, "Download all (.zip)", progress and an aria-live summary. Uses the CSS class contract
 * from src/lib/tool-ui.ts. All strings come from ctx.t (the tools' `ui:` frontmatter, keys "img.*").
 */
import { createDropzone, downloadBlob, downloadZip, formatBytes, markEnter, type FileIntake } from "../../lib/tool-ui";
import { tPlural } from "../../i18n/plural";
import type { ToolCtx } from "../types";
import { MIME, outputName, percentSaved, uniqueNames, type InputFormat, type RasterFormat } from "./formats";
import { WorkerPool, defaultPoolSize } from "./pool";
import type { JobErrorCode, JobSettings } from "./protocol";

type State = "pending" | "working" | "done" | "error";

interface Result {
  blob: Blob;
  name: string;
  input: InputFormat;
  format: RasterFormat;
  width: number;
  height: number;
  flattened: boolean;
  /** Same format as the input and not smaller: we recommend keeping the original. */
  preferOriginal: boolean;
}

interface Item {
  id: number;
  file: File;
  state: State;
  gen: number;
  result?: Result;
  error?: JobErrorCode;
  thumbUrl?: string;
  li: HTMLLIElement;
}

export interface BatchOptions {
  ctx: ToolCtx;
  /** <input accept>. */
  accept: string;
  /** Option fields rendered between the drop zone and the list. */
  options: HTMLElement;
  getSettings: () => JobSettings;
  createWorker: () => Worker;
  /** Name of the "Download all" archive. */
  zipName: string;
}

export interface Batch {
  /** Re-run every file with the current settings (call after an option changes). */
  reprocess: () => void;
  destroy: () => void;
}

let uid = 0;
/** Unique DOM id (several tools could share a page in the future). */
export const domId = (prefix: string): string => `${prefix}-${++uid}`;

export function createBatch(root: HTMLElement, opts: BatchOptions): Batch {
  const { ctx } = opts;
  const t = ctx.t;
  const poolSize = defaultPoolSize();
  const pool = new WorkerPool(opts.createWorker, poolSize);
  let active = 0;
  let items: Item[] = [];
  let gen = 0;
  let nextId = 1;
  let destroyed = false;
  /** Settings the current results were made with; "change" can fire again on blur without a real change. */
  let applied = JSON.stringify(opts.getSettings());

  const tool = document.createElement("div");
  tool.className = "tool";

  const error = document.createElement("div");
  error.className = "tool-error";
  error.setAttribute("role", "alert");
  error.hidden = true;

  const drop = createDropzone({ accept: opts.accept, multiple: true, ctx, onFiles: add, hint: t("img.drop.hint") });

  const status = document.createElement("p");
  status.className = "tool-note";
  status.setAttribute("role", "status");

  const progress = document.createElement("progress");
  progress.className = "tool-progress";
  progress.setAttribute("aria-label", t("img.progress"));
  progress.hidden = true;

  const list = document.createElement("ul");
  list.className = "tool-list";
  list.setAttribute("aria-label", t("img.list"));

  const actions = document.createElement("div");
  actions.className = "tool-actions";
  const zipBtn = button(t("tool.downloadAll"), "btn btn--primary");
  const resetBtn = button(t("tool.reset"), "btn btn--ghost");
  actions.append(zipBtn, resetBtn);
  actions.hidden = true;

  // No in-tool privacy line: the drop hint and the page line under the panel already say it.
  tool.append(drop, opts.options, error, progress, status, list, actions);
  root.append(tool);

  zipBtn.addEventListener("click", async () => {
    const done = items.filter((i) => i.state === "done" && i.result);
    if (done.length === 0) return;
    const names = uniqueNames(done.map((i) => (i.result!.preferOriginal ? i.file.name : i.result!.name)));
    zipBtn.disabled = true;
    try {
      await downloadZip(
        done.map((i, n) => ({ name: names[n]!, blob: i.result!.preferOriginal ? i.file : i.result!.blob })),
        opts.zipName,
      );
    } catch {
      showErrors([t("tool.error.generic")]);
    } finally {
      zipBtn.disabled = false;
    }
  });

  resetBtn.addEventListener("click", () => {
    for (const item of items) revoke(item);
    items = [];
    gen++;
    list.replaceChildren();
    showErrors([]);
    render();
    drop.querySelector("input")?.focus();
  });

  function add(intake: FileIntake) {
    const messages = intake.rejected.map((r) => r.reason);
    let files = intake.ok;
    const room = ctx.limits.maxFiles > 0 ? ctx.limits.maxFiles - items.length : files.length;
    if (files.length > room) {
      files = files.slice(0, Math.max(0, room));
      messages.push(t("tool.error.tooMany", { max: ctx.limits.maxFiles }));
    }
    showErrors(messages);
    for (const file of files) {
      const item: Item = { id: nextId++, file, state: "pending", gen, li: document.createElement("li") };
      item.li.className = "tool-item";
      markEnter(item.li);
      items.push(item);
      list.append(item.li);
      renderItem(item);
    }
    render();
    pump();
  }

  function showErrors(messages: string[]) {
    error.replaceChildren(
      ...[...new Set(messages)].map((m) => {
        const p = document.createElement("p");
        p.textContent = m;
        return p;
      }),
    );
    error.hidden = messages.length === 0;
  }

  /** Start pending items while workers are free. */
  function pump() {
    if (destroyed) return;
    while (active < poolSize) {
      const item = items.find((i) => i.state === "pending");
      if (!item) return;
      active++;
      void process(item).finally(() => {
        active--;
        pump();
      });
    }
  }

  async function process(item: Item) {
    const jobGen = gen;
    item.state = "working";
    item.gen = jobGen;
    renderItem(item);
    render();
    let buffer: ArrayBuffer;
    try {
      buffer = await item.file.arrayBuffer();
    } catch {
      finish(item, jobGen, { error: "decode" });
      return;
    }
    const res = await pool.run({ id: item.id, buffer, settings: opts.getSettings() });
    if (res.ok) {
      const blob = new Blob([res.buffer], { type: MIME[res.format] });
      const preferOriginal = res.format === res.input && blob.size >= item.file.size;
      finish(item, jobGen, {
        result: {
          blob,
          name: outputName(item.file.name, res.input, res.format),
          input: res.input,
          format: res.format,
          width: res.width,
          height: res.height,
          flattened: res.flattened,
          preferOriginal,
        },
      });
    } else {
      finish(item, jobGen, { error: res.error });
    }
  }

  function finish(item: Item, jobGen: number, out: { result?: Result; error?: JobErrorCode }) {
    // Discard results for removed items or for settings that have since changed.
    if (!destroyed && items.includes(item) && item.gen === jobGen && jobGen === gen) {
      revoke(item);
      item.result = out.result;
      item.error = out.error;
      item.state = out.result ? "done" : "error";
      renderItem(item);
      render();
    }
  }

  function revoke(item: Item) {
    if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
    item.thumbUrl = undefined;
  }

  function renderItem(item: Item) {
    const { li, file, result } = item;
    li.dataset.state = item.state;
    // Not smaller than the original: shown neutral, not as a success (tool.css).
    if (item.state === "done" && result?.preferOriginal) li.dataset.outcome = "kept-original";
    else delete li.dataset.outcome;
    li.replaceChildren();

    if (item.state === "done" && result) {
      item.thumbUrl ??= URL.createObjectURL(result.blob);
      const img = document.createElement("img");
      img.className = "tool-item__thumb";
      img.alt = "";
      img.src = item.thumbUrl;
      img.decoding = "async";
      img.loading = "lazy";
      // Rows are re-rendered in place; a done row renders its thumbnail once, so it enters once.
      markEnter(img);
      li.append(img);
    }

    const body = document.createElement("div");
    const name = document.createElement("p");
    name.className = "tool-item__name";
    name.textContent = item.state === "done" && result ? result.name : file.name;
    const meta = document.createElement("p");
    meta.className = "tool-item__meta";
    body.append(name, meta);
    li.append(body);

    const row = document.createElement("div");
    row.className = "tool-actions";

    if (item.state === "pending" || item.state === "working") {
      meta.textContent = t(item.state === "pending" ? "img.status.pending" : "img.status.working", {
        size: formatBytes(file.size),
      });
    } else if (item.state === "error") {
      const key = item.error === "generic" || !item.error ? "tool.error.generic" : `img.error.${item.error}`;
      meta.textContent = `${file.name}: ${t(key)}`;
    } else if (result) {
      const pct = percentSaved(file.size, result.blob.size);
      const sizes = {
        before: formatBytes(file.size),
        after: formatBytes(result.blob.size),
        percent: Math.abs(pct),
        width: result.width,
        height: result.height,
      };
      const lines = [t(pct > 0 ? "img.status.smaller" : pct < 0 ? "img.status.larger" : "img.status.same", sizes)];
      lines.push(t("img.status.dimensions", sizes));
      if (result.preferOriginal) lines.push(t("img.status.keepOriginal"));
      if (result.flattened) lines.push(t("img.status.flattened"));
      meta.textContent = lines.join(" · ");

      if (result.preferOriginal) {
        const orig = button(t("img.downloadOriginal"), "btn");
        orig.setAttribute("aria-label", t("img.downloadOriginalNamed", { name: file.name }));
        orig.addEventListener("click", () => downloadBlob(file, file.name));
        const anyway = button(t("img.downloadNew"), "btn btn--ghost");
        anyway.setAttribute("aria-label", t("img.downloadNewNamed", { name: result.name }));
        anyway.addEventListener("click", () => downloadBlob(result.blob, result.name));
        row.append(orig, anyway);
      } else {
        const dl = button(t("tool.download"), "btn");
        dl.setAttribute("aria-label", t("img.downloadNamed", { name: result.name }));
        dl.addEventListener("click", () => downloadBlob(result.blob, result.name));
        row.append(dl);
      }
    }

    const remove = button(t("tool.remove"), "btn btn--ghost");
    remove.setAttribute("aria-label", t("img.removeNamed", { name: file.name }));
    remove.addEventListener("click", () => {
      const index = items.indexOf(item);
      revoke(item);
      items = items.filter((i) => i !== item);
      li.remove();
      render();
      // Keep keyboard focus in the list.
      const next = items[Math.min(index, items.length - 1)];
      (next?.li.querySelector<HTMLButtonElement>("button:last-of-type") ?? drop.querySelector("input"))?.focus();
    });
    row.append(remove);
    li.append(row);
  }

  /** Summary, progress bar and global actions. */
  function render() {
    const total = items.length;
    const done = items.filter((i) => i.state === "done").length;
    const failed = items.filter((i) => i.state === "error").length;
    const finished = done + failed;
    actions.hidden = total === 0;
    zipBtn.disabled = done === 0;
    progress.hidden = total === 0 || finished === total;
    progress.max = Math.max(1, total);
    progress.value = finished;
    if (total === 0) {
      status.textContent = "";
      return;
    }
    if (finished < total) {
      status.textContent = tPlural(ctx, "img.summary.working", total, { done: finished, total });
      return;
    }
    const before = items.filter((i) => i.state === "done").reduce((s, i) => s + i.file.size, 0);
    const after = items
      .filter((i) => i.state === "done" && i.result)
      .reduce((s, i) => s + (i.result!.preferOriginal ? i.file.size : i.result!.blob.size), 0);
    const parts = [tPlural(ctx, "img.summary.done", total, { done, total })];
    if (done > 0) parts.push(t("img.summary.sizes", { before: formatBytes(before), after: formatBytes(after) }));
    if (failed > 0) parts.push(tPlural(ctx, "img.summary.failed", failed, { failed }));
    status.textContent = parts.join(" ");
  }

  return {
    reprocess() {
      const next = JSON.stringify(opts.getSettings());
      if (next === applied) return;
      applied = next;
      gen++;
      for (const item of items) {
        revoke(item);
        item.state = "pending";
        item.result = undefined;
        item.error = undefined;
        renderItem(item);
      }
      render();
      pump();
    },
    destroy() {
      destroyed = true;
      for (const item of items) revoke(item);
      pool.terminate();
      tool.remove();
    },
  };
}

function button(text: string, className: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.textContent = text;
  return b;
}

/** A labelled <select>. */
export function selectField(label: string, choices: { value: string; label: string }[], value: string) {
  const id = domId("img-select");
  const wrap = document.createElement("div");
  const l = document.createElement("label");
  l.htmlFor = id;
  l.textContent = label;
  const select = document.createElement("select");
  select.id = id;
  for (const c of choices) {
    const o = document.createElement("option");
    o.value = c.value;
    o.textContent = c.label;
    select.append(o);
  }
  select.value = value;
  wrap.append(l, select);
  return { wrap, select };
}

/** A labelled range slider with a live <output>. */
export function rangeField(label: string, value: number, min = 1, max = 100) {
  const id = domId("img-range");
  const wrap = document.createElement("div");
  const l = document.createElement("label");
  l.htmlFor = id;
  l.textContent = label;
  const input = document.createElement("input");
  input.type = "range";
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = "1";
  input.value = String(value);
  const out = document.createElement("output");
  out.htmlFor.add(id);
  out.textContent = input.value;
  input.addEventListener("input", () => (out.textContent = input.value));
  wrap.append(l, input, out);
  return { wrap, input };
}

/** A labelled optional positive-integer input. */
export function numberField(label: string, placeholder: string) {
  const id = domId("img-number");
  const wrap = document.createElement("div");
  const l = document.createElement("label");
  l.htmlFor = id;
  l.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.id = id;
  input.min = "1";
  input.max = "20000";
  input.step = "1";
  input.inputMode = "numeric";
  input.placeholder = placeholder;
  wrap.append(l, input);
  return { wrap, input };
}

/** Parse an optional dimension input: blank or invalid -> null. */
export function parseDimension(value: string): number | null {
  const n = Math.floor(Number(value));
  return value.trim() !== "" && Number.isFinite(n) && n >= 1 ? Math.min(n, 20000) : null;
}
