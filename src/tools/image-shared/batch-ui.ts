/**
 * Shared batch UI for the image tools: drop zone, option fields, file list with per-file status and
 * downloads, "Download all (.zip)", progress and an aria-live summary. Uses the CSS class contract
 * from src/lib/tool-ui.ts. All strings come from ctx.t (the tools' `ui:` frontmatter, keys "img.*").
 */
import {
  createDropzone,
  downloadBlob,
  downloadZip,
  formatBytes,
  markEnter,
  matchesAccept,
  notifyResult,
  type FileIntake,
} from "../../lib/tool-ui";
import { tPlural } from "../../i18n/plural";
import { getTool } from "../registry";
import type { ToolCtx } from "../types";
import {
  MIME,
  formatDecimalBytes,
  formatFromName,
  isRasterFormat,
  outputName,
  percentSaved,
  sniffFormat,
  uniqueNames,
  type InputFormat,
  type RasterFormat,
} from "./formats";
import { WorkerPool, defaultPoolSize } from "./pool";
import type { JobErrorCode, JobErrorKind, JobSettings } from "./protocol";

type State = "pending" | "working" | "done" | "error";

interface Result {
  blob: Blob;
  name: string;
  input: InputFormat;
  format: RasterFormat;
  width: number;
  height: number;
  /** Size before resizing (falls back to width/height when the worker does not report it). */
  sourceWidth: number;
  sourceHeight: number;
  notEnlarged: boolean;
  flattened: boolean;
  /** Same format as the input and not smaller: we recommend keeping the original. */
  preferOriginal: boolean;
  /** Quality the worker chose for this file (image-target-size). */
  quality?: number;
  /** The worker handed back the original image without re-encoding it (image-target-size: already under the target). */
  unchanged: boolean;
  /** The source was an animated PNG; only its first frame was kept. */
  firstFrameOnly: boolean;
  /**
   * What "keep the original" hands back (set when preferOriginal): the original with its metadata
   * removed (`stripped`), or, for a format the cleaner does not handle, the untouched file.
   */
  kept?: { blob: Blob; stripped: boolean };
}

interface Item {
  id: number;
  file: File;
  state: State;
  gen: number;
  result?: Result;
  error?: JobErrorCode;
  /** A more precise reason the worker sent with the error code (img.error.<kind>, when the tool has that string). */
  errorKind?: JobErrorKind;
  /** The file's real format from its first bytes (null: not recognised), read before the job starts. */
  detected?: InputFormat | null;
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
  /**
   * Resizer rows (image-resize): lead with "old -> new" pixel dimensions (img.status.resized), say when
   * an image was too small to enlarge (img.status.notEnlarged), and offer the original only when the
   * pixel size did not change. Off for every other tool, whose rows stay as they were.
   */
  resize?: boolean;
  /**
   * Target-size rows (image-target-size): file size first, then the pixel size ("old -> new" when the
   * image was made smaller, img.status.resized) and the quality used (img.status.quality). A file kept
   * as it was says so (img.status.unchanged) and gets a plain Download. Sizes are shown in decimal
   * units (1 KB = 1000 bytes, formatDecimalBytes), the same units as the target.
   */
  target?: boolean;
  /**
   * Added to every output name before the extension ("photo.jpg" -> "photo-resized.jpg"), so a result
   * never has the name of its source. Defaults to the tool's entry in NAME_SUFFIX; format converters
   * (their extension always changes) have none.
   */
  nameSuffix?: string;
}

export interface Batch {
  /** Re-run every file with the current settings (call after an option changes). */
  reprocess: () => void;
  destroy: () => void;
}

/** "photo.jpg" + "resized" -> "photo-resized.jpg". Without a suffix the name is returned as it is. */
export function withSuffix(name: string, suffix?: string): string {
  if (!suffix) return name;
  const dot = name.lastIndexOf(".");
  return dot > 0 ? `${name.slice(0, dot)}-${suffix}${name.slice(dot)}` : `${name}-${suffix}`;
}

/** Output-name suffix per tool (the same in every language, like "-cropped" in Crop). */
const NAME_SUFFIX: Record<string, string> = {
  "image-compress": "compressed",
  "image-target-size": "compressed",
  "image-resize": "resized",
  "image-fit": "fit",
};

const FORMAT_LABEL: Record<RasterFormat, string> = { jpg: "JPG", png: "PNG", webp: "WebP", avif: "AVIF" };

/** The format a file claims to be, from its name or MIME type (display and hints only; bytes are sniffed elsewhere). */
export function claimedFormat(name: string, type: string): InputFormat | null {
  const byName = formatFromName(name);
  if (byName) return byName;
  const mime = type.toLowerCase();
  if (/^image\/hei[cf]/.test(mime)) return "heic";
  const hit = (Object.keys(MIME) as InputFormat[]).find((f) => MIME[f] === mime);
  return hit ?? (mime === "image/jpg" ? "jpg" : null);
}

export interface Hint {
  lead: string;
  href: string;
  label: string;
}

/**
 * A pointer for a file this tool does not take but another tool on the site does: HEIC goes to
 * HEIC to JPG; JPG, PNG, WebP and AVIF go to the matching converter on a converter page, else to
 * Compress images. Null when this tool is already the right place or the type is unknown.
 */
export function wrongTypeHint(ctx: ToolCtx, format: InputFormat | null): Hint | null {
  if (!format) return null;
  const t = ctx.t;
  const href = (slug: { en: string; it?: string }) => (ctx.locale === "it" ? `/it/${slug.it ?? slug.en}/` : `/${slug.en}/`);
  if (format === "heic") {
    const tool = getTool("heic-to-jpg");
    if (!tool || ctx.toolId === tool.id) return null;
    return { lead: t("img.hint.heic"), href: href(tool.slug), label: t("img.hint.heicLink") };
  }
  const compress = getTool("image-compress");
  if (!compress) return null;
  const lead = t("img.hint.image", { format: FORMAT_LABEL[format] });
  const to = ctx.preset.to;
  if (ctx.toolId === compress.id) {
    // The base page takes every raster format; a converter page takes one.
    if (!isRasterFormat(to)) return null;
    const variant = compress.variants?.find((v) => v.id === `${format}-to-${to}`);
    if (variant) {
      const label = t("img.hint.convertLink", { from: FORMAT_LABEL[format], to: FORMAT_LABEL[to] });
      return { lead, href: href(variant.slug), label };
    }
  }
  return { lead, href: href(compress.slug), label: t("img.hint.compressLink") };
}

function hintLink(hint: Hint): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = hint.href;
  a.textContent = hint.label;
  return a;
}

/** Smooth scrolling unless the visitor asked for less motion. */
function revealBehavior(): ScrollBehavior {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

let uid = 0;
/** Unique DOM id (several tools could share a page in the future). */
export const domId = (prefix: string): string => `${prefix}-${++uid}`;

export function createBatch(root: HTMLElement, opts: BatchOptions): Batch {
  const { ctx } = opts;
  const t = ctx.t;
  /** Sizes in the units the tool's limits use: decimal KB for target sizes, else the site's 1024 units. */
  const size = (bytes: number): string => (opts.target ? formatDecimalBytes(bytes, ctx.locale) : formatBytes(bytes));
  // A converter page (/webp-to-png/) always changes the extension, so its names need no suffix.
  const nameSuffix =
    opts.nameSuffix ?? (ctx.toolId === "image-compress" && isRasterFormat(ctx.preset.to) ? undefined : NAME_SUFFIX[ctx.toolId]);
  const poolSize = defaultPoolSize();
  const pool = new WorkerPool(opts.createWorker, poolSize);
  let active = 0;
  let items: Item[] = [];
  let gen = 0;
  let nextId = 1;
  let destroyed = false;
  /**
   * Snapshot of the options the current batch runs with. Every file uses it, whatever the fields say
   * while the batch runs; it is replaced only by adopt(), which re-runs the files. `applied` is its
   * JSON, so a "change" event without a real change (blur) is ignored.
   */
  let snapshot: JobSettings = structuredClone(opts.getSettings());
  let applied = JSON.stringify(snapshot);
  /** A run has started and its status/first result has not been scrolled into view yet. */
  let revealPending = false;

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
  zipBtn.hidden = true;

  // No in-tool privacy line: the drop hint and the page line under the panel already say it.
  tool.append(drop, opts.options, error, progress, status, list, actions);
  root.append(tool);

  zipBtn.addEventListener("click", async () => {
    const done = items.filter((i) => i.state === "done" && i.result);
    if (done.length === 0) return;
    const names = uniqueNames(done.map((i) => outName(i.result!)));
    zipBtn.disabled = true;
    try {
      await downloadZip(
        done.map((i, n) => ({ name: names[n]!, blob: outBlob(i) })),
        opts.zipName,
      );
    } catch {
      showErrors([{ text: t("tool.error.generic") }]);
    } finally {
      zipBtn.disabled = false;
    }
  });

  resetBtn.addEventListener("click", () => {
    for (const item of items) revoke(item);
    items = [];
    gen++;
    revealPending = false;
    // Stop the work in flight: its workers are ended (their jobs settle as discarded) and nothing is left
    // queued. The next run starts fresh workers.
    pool.terminate();
    list.replaceChildren();
    showErrors([]);
    render();
    drop.querySelector("input")?.focus();
  });

  /** The file a download of this result hands back when the original is preferred. */
  function outBlob(item: Item): Blob {
    const r = item.result!;
    return r.preferOriginal ? (r.kept?.blob ?? item.file) : r.blob;
  }

  /** Name of what is downloaded: the original's own name only when it is handed back untouched. */
  function outName(r: Result, file?: File): string {
    if (r.preferOriginal && r.kept && !r.kept.stripped && file) return file.name;
    return r.name;
  }

  /** Point to another tool when the file is a type that one handles. */
  function hintFor(file: File): Hint | null {
    return wrongTypeHint(ctx, claimedFormat(file.name, file.type));
  }

  function add(intake: FileIntake) {
    const messages: Message[] = intake.rejected.map((r) => ({
      text: r.reason,
      // Type rejections only: a file that is too large or too many is not in the wrong place.
      hint: matchesAccept(r.file, opts.accept) ? undefined : (hintFor(r.file) ?? undefined),
    }));
    let files = intake.ok;
    const room = ctx.limits.maxFiles > 0 ? ctx.limits.maxFiles - items.length : files.length;
    if (files.length > room) {
      files = files.slice(0, Math.max(0, room));
      messages.push({ text: t("tool.error.tooMany", { max: ctx.limits.maxFiles }) });
    }
    showErrors(messages);
    // A new run (nothing queued or running): options changed since the last one are adopted now, so
    // the whole batch, old files included, uses one set of options.
    if (!items.some((i) => i.state === "pending" || i.state === "working")) adopt();
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
    if (files.length > 0) startReveal();
  }

  interface Message {
    text: string;
    hint?: Hint;
  }

  function showErrors(messages: Message[]) {
    const seen = new Set<string>();
    error.replaceChildren(
      ...messages
        .filter((m) => !seen.has(m.text) && seen.add(m.text))
        .map((m) => {
          const p = document.createElement("p");
          p.textContent = m.text;
          if (m.hint) p.append(" ", `${m.hint.lead} `, hintLink(m.hint));
          return p;
        }),
    );
    error.hidden = messages.length === 0;
  }

  /** Bring the status into view when a run starts, so a phone shows that something happened. Never moves focus. */
  function startReveal() {
    revealPending = true;
    status.scrollIntoView?.({ block: "nearest", behavior: revealBehavior() });
  }

  /** The first finished row, once: the result is what the visitor came for. */
  function revealResult(item: Item) {
    if (!revealPending) return;
    revealPending = false;
    item.li.scrollIntoView?.({ block: "nearest", behavior: revealBehavior() });
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
    // Read before the buffer is transferred to the worker: the real type, for a pointer if the tool rejects it.
    item.detected = sniffFormat(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 64)));
    const res = await pool.run({ id: item.id, buffer, settings: snapshot });
    if (res.ok) {
      const blob = new Blob([res.buffer], { type: MIME[res.format] });
      const sourceWidth = res.sourceWidth ?? res.width;
      const sourceHeight = res.sourceHeight ?? res.height;
      // A resized image is the point of the resizer, even when its file is not smaller.
      const resized = sourceWidth !== res.width || sourceHeight !== res.height;
      const preferOriginal =
        !res.unchanged && res.format === res.input && blob.size >= item.file.size && !(opts.resize && resized);
      const kept = preferOriginal ? await keepOriginal(item.file, res.format) : undefined;
      finish(item, jobGen, {
        result: {
          blob,
          name: withSuffix(
            res.unchanged ? item.file.name : outputName(item.file.name, res.input, res.format),
            nameSuffix,
          ),
          input: res.input,
          format: res.format,
          width: res.width,
          height: res.height,
          sourceWidth,
          sourceHeight,
          notEnlarged: !!res.notEnlarged,
          flattened: res.flattened,
          preferOriginal,
          quality: res.quality,
          unchanged: !!res.unchanged,
          firstFrameOnly: !!res.firstFrameOnly,
          kept,
        },
      });
    } else {
      finish(item, jobGen, { error: res.error, errorKind: res.kind });
    }
  }

  /**
   * The original with its metadata removed (lossless, the cleaner behind Remove EXIF; the rotation flag
   * stays) for JPEG, PNG and WebP. Any other format, or a file the cleaner cannot read, is handed back as it is.
   */
  async function keepOriginal(file: File, format: RasterFormat): Promise<{ blob: Blob; stripped: boolean }> {
    if (format === "jpg" || format === "png" || format === "webp") {
      try {
        const { analyze } = await import("../exif-remover/metadata");
        const out = analyze(new Uint8Array(await file.arrayBuffer()), "all");
        if (out.ok) return { blob: new Blob([out.cleaned.bytes as BlobPart], { type: MIME[format] }), stripped: true };
      } catch {
        // Fall through: the untouched file is still a valid answer, and the row says so.
      }
    }
    return { blob: file, stripped: false };
  }

  function finish(
    item: Item,
    jobGen: number,
    out: { result?: Result; error?: JobErrorCode; errorKind?: JobErrorKind },
  ) {
    // Discard results for removed items or for settings that have since changed.
    if (!destroyed && items.includes(item) && item.gen === jobGen && jobGen === gen) {
      revoke(item);
      item.result = out.result;
      item.error = out.error;
      item.errorKind = out.errorKind;
      item.state = out.result ? "done" : "error";
      renderItem(item);
      render();
      if (out.result) {
        revealResult(item);
        notifyResult();
      }
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
    else if (item.state === "done" && opts.resize && result?.notEnlarged) li.dataset.outcome = "not-enlarged";
    else delete li.dataset.outcome;
    // The row is rebuilt below; focus inside it would drop to the page, so it goes to the new Remove.
    const hadFocus = li.contains(document.activeElement);
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
        size: size(file.size),
      });
    } else if (item.state === "error") {
      const kindKey = item.errorKind ? `img.error.${item.errorKind}` : "";
      // A precise reason when this tool has a string for it, else the code's own.
      const key =
        kindKey && t(kindKey) !== kindKey
          ? kindKey
          : item.error === "generic" || !item.error
            ? "tool.error.generic"
            : `img.error.${item.error}`;
      meta.textContent = `${file.name}: ${t(key)}`;
      const hint = item.error === "unsupported" ? wrongTypeHint(ctx, item.detected ?? null) : null;
      if (hint) meta.append(" ", `${hint.lead} `, hintLink(hint));
    } else if (result) {
      const pct = percentSaved(file.size, result.blob.size);
      const sizes = {
        before: size(file.size),
        after: size(result.blob.size),
        percent: Math.abs(pct),
        width: result.width,
        height: result.height,
        fromWidth: result.sourceWidth,
        fromHeight: result.sourceHeight,
      };
      const weight = t(pct > 0 ? "img.status.smaller" : pct < 0 ? "img.status.larger" : "img.status.same", sizes);
      const resized = result.width !== result.sourceWidth || result.height !== result.sourceHeight;
      const lines = opts.resize
        ? [t("img.status.resized", sizes), weight]
        : opts.target
          ? result.unchanged
            ? [t("img.status.unchanged", sizes), t("img.status.dimensions", sizes)]
            : [weight, t(resized ? "img.status.resized" : "img.status.dimensions", sizes)]
          : [weight, t("img.status.dimensions", sizes)];
      if (opts.target && result.quality !== undefined) lines.push(t("img.status.quality", { quality: result.quality }));
      if (opts.resize && result.notEnlarged) lines.push(t("img.status.notEnlarged"));
      if (result.preferOriginal) {
        lines.push(t(result.kept?.stripped ? "img.status.keepOriginal" : "img.status.keepOriginalAsIs"));
      }
      if (result.flattened) lines.push(t("img.status.flattened"));
      if (result.firstFrameOnly) lines.push(t("img.status.firstFrameOnly"));
      meta.textContent = lines.join(" · ");

      if (result.preferOriginal) {
        const origName = outName(result, file);
        const orig = button(t("img.downloadOriginal"), "btn");
        orig.dataset.main = "";
        orig.setAttribute("aria-label", t("img.downloadOriginalNamed", { name: origName }));
        orig.addEventListener("click", () => downloadBlob(outBlob(item), origName));
        const anyway = button(t("img.downloadNew"), "btn btn--ghost");
        anyway.setAttribute("aria-label", t("img.downloadNewNamed", { name: result.name }));
        anyway.addEventListener("click", () => downloadBlob(result.blob, result.name));
        row.append(orig, anyway);
      } else {
        const dl = button(t("tool.download"), "btn");
        dl.dataset.main = "";
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
    markPrimary(row);
    if (hadFocus) remove.focus();
  }

  /** Finished files so far. */
  const doneCount = (): number => items.filter((i) => i.state === "done").length;

  /**
   * One finished file: its own Download is the main action and there is no zip to offer. From two files
   * on, "Download all (.zip)" is the main action and the per-file buttons step back.
   */
  function markPrimary(scope: ParentNode) {
    const solo = doneCount() < 2;
    for (const b of scope.querySelectorAll<HTMLElement>("[data-main]")) b.classList.toggle("btn--primary", solo);
  }

  /**
   * Read the option fields now and, if they differ from the snapshot, make that the new snapshot and
   * queue every file again. Returns whether anything changed.
   */
  function adopt(): boolean {
    const live = opts.getSettings();
    const next = JSON.stringify(live);
    if (next === applied) return false;
    applied = next;
    snapshot = structuredClone(live);
    gen++;
    for (const item of items) {
      revoke(item);
      item.state = "pending";
      item.result = undefined;
      item.error = undefined;
      item.errorKind = undefined;
      renderItem(item);
    }
    return true;
  }

  let quietTimer: ReturnType<typeof setTimeout> | undefined;

  /** Summary, progress bar and global actions. */
  function render() {
    const total = items.length;
    const done = items.filter((i) => i.state === "done").length;
    const failed = items.filter((i) => i.state === "error").length;
    const finished = done + failed;
    actions.hidden = total === 0;
    zipBtn.hidden = done < 2;
    zipBtn.disabled = done < 2;
    markPrimary(list);
    progress.hidden = total === 0 || finished === total;
    progress.max = Math.max(1, total);
    progress.value = finished;
    if (total === 0 || finished === total) {
      clearTimeout(quietTimer);
      quietTimer = undefined;
      status.removeAttribute("aria-live");
    }
    if (total === 0) {
      status.textContent = "";
      return;
    }
    if (finished < total) {
      // Said once when work starts, then counted silently (the progress bar has the number too);
      // the result is said again at the end. Per-file announcements are too much for 50 images.
      if (!quietTimer && status.getAttribute("aria-live") !== "off") {
        quietTimer = setTimeout(() => status.setAttribute("aria-live", "off"), 1000);
      }
      status.textContent = tPlural(ctx, "img.summary.working", total, { done: finished, total });
      return;
    }
    const before = items.filter((i) => i.state === "done").reduce((s, i) => s + i.file.size, 0);
    const after = items
      .filter((i) => i.state === "done" && i.result)
      .reduce((s, i) => s + outBlob(i).size, 0);
    const parts = [tPlural(ctx, "img.summary.done", total, { done, total })];
    if (done > 0) parts.push(t("img.summary.sizes", { before: size(before), after: size(after) }));
    if (failed > 0) parts.push(tPlural(ctx, "img.summary.failed", failed, { failed }));
    status.textContent = parts.join(" ");
  }

  return {
    reprocess() {
      if (!adopt()) return;
      render();
      pump();
      if (items.length > 0) startReveal();
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
  // An <output> is a live region; the slider already says its value, so the copy stays silent.
  out.setAttribute("aria-live", "off");
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

/** A checkbox with its label after it (the order tool.css lays out as a row). */
export function checkField(label: string, checked: boolean) {
  const id = domId("img-check");
  const wrap = document.createElement("div");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.checked = checked;
  const l = document.createElement("label");
  l.htmlFor = id;
  l.textContent = label;
  wrap.append(input, l);
  return { wrap, input };
}

/** Parse an optional dimension input: blank or invalid -> null. */
export function parseDimension(value: string): number | null {
  const n = Math.floor(Number(value));
  return value.trim() !== "" && Number.isFinite(n) && n >= 1 ? Math.min(n, 20000) : null;
}
