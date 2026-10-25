/**
 * Shared vanilla helpers for tool islands (src/tools/<id>/client.ts): file intake, validation,
 * downloads. Everything stays in the browser; nothing here touches the network.
 *
 * CSS class contract (styled in src/styles/, used by every tool UI; tools add their own
 * modifiers inside their folder only if they must):
 *   .tool                  wrapper the tool renders into its mount element
 *   .tool-drop             file drop zone (a <label> wrapping a hidden file input)
 *   .tool-drop[data-active] while files are dragged over it
 *   .tool-drop__label / .tool-drop__hint
 *   .tool-options          settings row (format, quality, ranges...)
 *   .tool-list / .tool-item          list of files or pages; .tool-item[data-state="pending|working|done|error"]
 *   .tool-item[data-outcome="kept-original"]  done, but not smaller, so the original is offered (neutral, not success)
 *   .tool-item__name / .tool-item__meta / .tool-item__thumb
 *   .tool-progress         a <progress> element
 *   .tool-actions          button row
 *   .btn / .btn--primary / .btn--ghost
 *   .tool-error            inline error message (role="alert")
 *   .tool-note             small helper text; a direct child of .tool with role="status" is the
 *                          result summary and is set large
 *   [data-enter]           one-shot entry transition on a newly inserted row or thumbnail (markEnter)
 */
import type { ToolCtx } from "../tools/types";

/** How long [data-enter] stays on an element: longer than its transition (--duration-base, 200ms). */
export const ENTER_MS = 400;

/**
 * Play the one-shot entry transition on a newly inserted element (styled in tool.css with
 * @starting-style). Call it once, on first insertion: the attribute is removed afterwards so a
 * later re-insertion of the same node (a re-rendered list) does not replay it.
 */
export function markEnter(el: HTMLElement): void {
  el.dataset.enter = "";
  setTimeout(() => delete el.dataset.enter, ENTER_MS);
}

export interface FileIntake {
  ok: File[];
  /** Rejected files with a ready-to-show, translated reason. */
  rejected: { file: File; reason: string }[];
}

/** Does `file` match an <input accept> list such as "image/*,.heic,.heif"? An empty list accepts all. */
export function matchesAccept(file: File, accept: string): boolean {
  const rules = accept
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  if (rules.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return rules.some((r) => {
    if (r.startsWith(".")) return name.endsWith(r);
    if (r.endsWith("/*")) return type.startsWith(r.slice(0, -1));
    return type === r;
  });
}

/** Split a batch into accepted and rejected files using the tool's limits. */
export function filterFiles(files: File[], accept: string, ctx: Pick<ToolCtx, "limits" | "t">): FileIntake {
  const result: FileIntake = { ok: [], rejected: [] };
  for (const file of files) {
    if (!matchesAccept(file, accept)) {
      result.rejected.push({ file, reason: ctx.t("tool.error.type", { name: file.name }) });
    } else if (ctx.limits.maxBytes > 0 && file.size > ctx.limits.maxBytes) {
      result.rejected.push({
        file,
        reason: ctx.t("tool.error.tooLarge", { name: file.name, max: formatBytes(ctx.limits.maxBytes) }),
      });
    } else if (ctx.limits.maxFiles > 0 && result.ok.length >= ctx.limits.maxFiles) {
      result.rejected.push({ file, reason: ctx.t("tool.error.tooMany", { max: ctx.limits.maxFiles }) });
    } else {
      result.ok.push(file);
    }
  }
  return result;
}

/**
 * "1.5 MB" / "1,5 MB". The number follows the page's language: pass it on the server; in the browser
 * it defaults to <html lang>, so tool code doesn't have to thread the locale through.
 */
export function formatBytes(bytes: number, locale?: string): string {
  const lang = locale || globalThis.document?.documentElement.lang || "en";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  const digits = value < 10 ? 1 : 0;
  const number = new Intl.NumberFormat(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  return `${number} ${units[i]}`;
}

export interface DropzoneOptions {
  /** <input accept> value, e.g. "image/jpeg,image/png,.heic". */
  accept: string;
  multiple: boolean;
  ctx: Pick<ToolCtx, "limits" | "t">;
  /** Called with validated files (may be empty) and the rejections. */
  onFiles: (intake: FileIntake) => void;
  /** Overrides for the shared tool.drop.* strings. */
  label?: string;
  hint?: string;
}

/**
 * A keyboard-accessible drop zone: click/Enter opens the picker and drag-and-drop works on the zone.
 * Pasting files (Ctrl+V / Cmd+V) works anywhere on the page, unless the focus is in a text field
 * or the zone is hidden, inert or no longer in the document.
 */
export function createDropzone(opts: DropzoneOptions): HTMLLabelElement {
  const { ctx } = opts;
  const zone = document.createElement("label");
  zone.className = "tool-drop";

  const input = document.createElement("input");
  input.type = "file";
  input.accept = opts.accept;
  input.multiple = opts.multiple;
  input.className = "visually-hidden";

  const label = document.createElement("span");
  label.className = "tool-drop__label";
  label.textContent = opts.label ?? ctx.t(opts.multiple ? "tool.drop.labelMany" : "tool.drop.label");

  const hint = document.createElement("span");
  hint.className = "tool-drop__hint";
  hint.textContent = opts.hint ?? ctx.t("tool.drop.hint");

  zone.append(input, label, hint);

  const take = (list: FileList | File[] | null | undefined) => {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    opts.onFiles(filterFiles(opts.multiple ? files : files.slice(0, 1), opts.accept, ctx));
  };

  input.addEventListener("change", () => {
    take(input.files);
    input.value = "";
  });
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.dataset.active = "";
  });
  zone.addEventListener("dragleave", () => delete zone.dataset.active);
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    delete zone.dataset.active;
    take(e.dataTransfer?.files);
  });
  const onPaste = (e: ClipboardEvent) => {
    if (!zone.isConnected) {
      document.removeEventListener("paste", onPaste);
      return;
    }
    // A hidden or inert zone (tool busy, or swapped out) takes nothing, same as a drop would.
    if (zone.closest("[hidden],[inert]") || isEditable(e.target)) return;
    const files = e.clipboardData?.files;
    if (!files || files.length === 0) return;
    e.preventDefault();
    take(files);
  };
  document.addEventListener("paste", onPaste);

  return zone;
}

const NON_TEXT_INPUTS = new Set(["file", "checkbox", "radio", "range", "button", "submit", "reset", "image", "color"]);

/** True when a paste on this target should go to the field itself (text inputs, textareas, selects, contenteditable). */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(target.type);
  return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable;
}

/** Save a Blob with a filename (object URL, revoked after the click). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Zip several outputs in the browser (client-zip, loaded on demand) and save the archive. */
export async function downloadZip(files: { name: string; blob: Blob }[], zipName: string): Promise<void> {
  const { downloadZip: zip } = await import("client-zip");
  const archive = await zip(files.map((f) => ({ name: f.name, input: f.blob, lastModified: new Date() }))).blob();
  downloadBlob(archive, zipName);
}

/** Replace a filename's extension: ("photo.HEIC", "jpg") -> "photo.jpg". */
export function renameExtension(filename: string, ext: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  return `${base}.${ext.replace(/^\./, "")}`;
}
