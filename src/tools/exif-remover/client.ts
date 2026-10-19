/**
 * EXIF remover (base page /remove-exif/; variant /remove-location-from-photo/ starts on "Location
 * only"). Each photo is read on drop and the list shows what it reveals (location, camera, date,
 * software, other tags); "Remove" then offers the clean copies. The rewrite is plain byte work in
 * ./metadata.ts (no decoding, no re-encoding), cheap enough to run on the main thread between files.
 */
import { createDropzone, downloadBlob, downloadZip, formatBytes, markEnter, type FileIntake } from "../../lib/tool-ui";
import { tPlural } from "../../i18n/plural";
import { button, errorRegion, h, statusRegion } from "../ai-shared/dom";
import { domId } from "../image-shared/batch-ui";
import { MIME, acceptFor, uniqueNames } from "../image-shared/formats";
import type { ToolCtx } from "../types";
import { analyze, cameraName, hasMetadata, parseExifDate, roundCoord, type Analysis } from "./metadata";
import type { Mode, Report } from "./types";
import "./exif.css";

/** HEIC, AVIF and GIF are accepted only to explain where to go instead. */
const ACCEPT = `${acceptFor(["jpg", "png", "webp", "heic", "avif"])},image/gif,.gif`;

type State = "reading" | "ready" | "error";

interface Item {
  file: File;
  state: State;
  /** The user pressed Remove: the row offers its clean copy. */
  cleaned: boolean;
  analysis?: Analysis;
  /** Clean copy for the current mode. */
  blob?: Blob;
  thumbUrl?: string;
  li: HTMLLIElement;
}

const isDone = (i: Item): boolean => i.state === "ready" && i.cleaned && !!i.blob;

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const { t } = ctx;
  let mode: Mode = ctx.preset.only === "gps" ? "gps" : "all";
  let items: Item[] = [];
  let destroyed = false;
  /** Bumped by Start over and mode changes, so stale reads are dropped. */
  let gen = 0;
  let queue: Promise<void> = Promise.resolve();

  const tool = h("div", { className: "tool" });
  const errors = errorRegion();
  const status = statusRegion();
  const drop = createDropzone({ accept: ACCEPT, multiple: true, ctx, onFiles: add, hint: t("exif.drop.hint") });

  // What to remove: everything (default) or the location only (the variant page's default).
  const group = domId("exif-mode");
  const modeNote = h("p", { className: "tool-note exif-mode-note", id: `${group}-note` });
  const radio = (value: Mode, label: string) => {
    const input = h("input", { type: "radio", name: group, value, id: `${group}-${value}`, checked: value === mode, "aria-describedby": modeNote.id });
    input.addEventListener("change", () => input.checked && setMode(value));
    return h("div", {}, input, h("label", { for: input.id, text: label }));
  };
  const options = h(
    "fieldset",
    { className: "tool-options" },
    h("legend", { text: t("exif.mode.legend") }),
    radio("all", t("exif.mode.all")),
    radio("gps", t("exif.mode.gps")),
    modeNote,
  );

  const progress = h("progress", { className: "tool-progress", "aria-label": t("exif.progress"), hidden: true });
  const list = h("ul", { className: "tool-list", "aria-label": t("exif.list") });
  const cleanBtn = button("", { variant: "primary", onClick: cleanAll });
  const zipBtn = button(t("tool.downloadAll"), { onClick: () => void zipAll() });
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: reset });
  const actions = h("div", { className: "tool-actions", hidden: true }, cleanBtn, zipBtn, resetBtn);

  tool.append(drop, options, errors.el, progress, status.el, list, actions);
  el.append(tool);
  syncModeNote();

  function syncModeNote() {
    modeNote.textContent = t(mode === "gps" ? "exif.mode.gpsNote" : "exif.mode.allNote");
  }

  function add(intake: FileIntake) {
    const messages = intake.rejected.map((r) => r.reason);
    let files = intake.ok;
    const room = ctx.limits.maxFiles > 0 ? ctx.limits.maxFiles - items.length : files.length;
    if (files.length > room) {
      files = files.slice(0, Math.max(0, room));
      messages.push(t("tool.error.tooMany", { max: ctx.limits.maxFiles }));
    }
    if (messages.length) errors.show(messages);
    else errors.clear();
    for (const file of files) {
      const item: Item = { file, state: "reading", cleaned: false, li: h("li", { className: "tool-item" }) };
      markEnter(item.li);
      items.push(item);
      list.append(item.li);
      renderItem(item);
      enqueue(item);
    }
    render();
  }

  /** Read and analyze one file at a time, yielding between files so the page stays responsive. */
  function enqueue(item: Item) {
    const jobGen = gen;
    queue = queue.then(async () => {
      if (destroyed || jobGen !== gen || !items.includes(item)) return;
      let analysis: Analysis;
      try {
        analysis = analyze(new Uint8Array(await item.file.arrayBuffer()), mode);
      } catch {
        analysis = { ok: false, error: "decode" };
      }
      await new Promise((r) => setTimeout(r, 0));
      if (destroyed || jobGen !== gen || !items.includes(item)) return;
      item.analysis = analysis;
      item.blob = analysis.ok ? new Blob([analysis.cleaned.bytes as Uint8Array<ArrayBuffer>], { type: MIME[analysis.report.format] }) : undefined;
      item.state = analysis.ok ? "ready" : "error";
      renderItem(item);
      render();
    });
  }

  function setMode(next: Mode) {
    if (next === mode) return;
    mode = next;
    syncModeNote();
    gen++;
    // Re-make the clean copies; files already cleaned get the new copy and stay cleaned.
    for (const item of items) {
      if (item.state === "error") continue;
      item.blob = undefined;
      item.state = "reading";
      renderItem(item);
      enqueue(item);
    }
    render();
  }

  function cleanAll() {
    for (const item of items) {
      if (item.state !== "ready" || item.cleaned) continue;
      item.cleaned = true;
      renderItem(item);
    }
    render();
    // Keep focus on something useful once the button hides.
    (list.querySelector<HTMLButtonElement>('.tool-item[data-state="done"] .btn:not(.btn--ghost)') ?? zipBtn).focus();
  }

  async function zipAll() {
    const done = items.filter(isDone);
    if (done.length === 0) return;
    const names = uniqueNames(done.map((i) => i.file.name));
    zipBtn.disabled = true;
    try {
      await downloadZip(
        done.map((i, n) => ({ name: names[n]!, blob: i.blob! })),
        t(mode === "gps" ? "exif.zipNameGps" : "exif.zipName"),
      );
    } catch {
      errors.show(t("tool.error.generic"));
    } finally {
      zipBtn.disabled = false;
    }
  }

  function reset() {
    for (const item of items) revoke(item);
    items = [];
    gen++;
    list.replaceChildren();
    errors.clear();
    render();
    drop.querySelector("input")?.focus();
  }

  function revoke(item: Item) {
    if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
    item.thumbUrl = undefined;
  }

  // ---------- rendering ----------

  const dateFormat = new Intl.DateTimeFormat(ctx.locale, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" });
  const listFormat = new Intl.ListFormat(ctx.locale, { type: "conjunction" });

  /** What the photo reveals, one plain line each. */
  function facts(r: Report): HTMLLIElement[] {
    const lines: HTMLLIElement[] = [];
    /** kind: "location" (flagged, struck through once removed in either mode), "found" (struck in "all" mode), "none". */
    const line = (text: string, kind: "location" | "found" | "none" = "found") =>
      lines.push(h("li", { text, "data-kind": kind }));
    if (!hasMetadata(r)) {
      line(t("exif.fact.clean"), "none");
      return lines;
    }
    const e = r.exif;
    if (r.gps === "unreadable") line(t("exif.fact.locationUnreadable"), "location");
    else if (r.gps) line(t("exif.fact.location", { lat: roundCoord(r.gps.lat), lon: roundCoord(r.gps.lon) }), "location");
    else line(t("exif.fact.noLocation"), "none");
    const camera = cameraName(e?.make, e?.model);
    if (camera) line(t("exif.fact.camera", { camera }));
    const d = e?.date ? parseExifDate(e.date) : null;
    if (d) line(t("exif.fact.date", { date: dateFormat.format(Date.UTC(d.year, d.month - 1, d.day, d.hour, d.minute)) }));
    if (e?.software) line(t("exif.fact.software", { software: e.software }));
    if (e && e.otherTags > 0) line(tPlural(ctx, "exif.fact.other", e.otherTags));
    if (r.exifUnreadable) line(t("exif.fact.unreadable"));
    if (r.blocks.length) line(t("exif.fact.blocks", { list: listFormat.format(r.blocks.map((b) => t(`exif.block.${b}`))) }));
    return lines;
  }

  function renderItem(item: Item) {
    const { li, file, analysis } = item;
    li.dataset.state = item.state === "reading" ? "working" : item.state === "error" ? "error" : item.cleaned ? "done" : "pending";
    li.replaceChildren();

    if (analysis?.ok) {
      item.thumbUrl ??= URL.createObjectURL(file);
      li.append(h("img", { className: "tool-item__thumb", alt: "", src: item.thumbUrl, decoding: "async", loading: "lazy" }));
    }

    const meta = h("p", { className: "tool-item__meta" });
    const body = h("div", {}, h("p", { className: "tool-item__name", text: file.name }));
    if (analysis?.ok) {
      const removed = item.cleaned && item.state === "ready" ? mode : undefined;
      body.append(h("ul", { className: "exif-facts", "aria-label": t("exif.factsLabel"), "data-removed": removed }, ...facts(analysis.report)));
    }
    body.append(meta);
    li.append(body);

    const row = h("div", { className: "tool-actions" });
    if (item.state === "reading") {
      meta.textContent = t("exif.status.reading", { size: formatBytes(file.size) });
    } else if (item.state === "error" && analysis && !analysis.ok) {
      meta.textContent = `${file.name}: ${t(`exif.error.${analysis.error}`)}`;
      if (analysis.error === "heic" || analysis.error === "avif") {
        meta.append(" ", h("a", { href: t(`exif.error.${analysis.error}Href`), text: t(`exif.error.${analysis.error}Link`) }));
      }
    } else if (item.state === "ready" && !item.cleaned) {
      meta.textContent = t("exif.status.ready", { size: formatBytes(file.size) });
    } else if (isDone(item) && analysis?.ok) {
      const { cleaned, report } = analysis;
      const sizes = { before: formatBytes(file.size), after: formatBytes(item.blob!.size) };
      const noLocation = mode === "gps" && report.gps === null && !report.exif?.hasGpsBlock && !cleaned.droppedUnreadable;
      const lines = [
        !hasMetadata(report)
          ? t("exif.status.nothing", sizes)
          : noLocation
            ? t("exif.status.noLocation", sizes)
            : t(mode === "gps" ? "exif.status.doneGps" : "exif.status.done", sizes),
      ];
      if (cleaned.keptOrientation) lines.push(t("exif.status.keptOrientation"));
      if (cleaned.droppedUnreadable) lines.push(t("exif.status.droppedUnreadable"));
      meta.textContent = lines.join(" · ");
      const blob = item.blob!;
      row.append(
        button(t("tool.download"), {
          ariaLabel: t("exif.downloadNamed", { name: file.name }),
          onClick: () => downloadBlob(blob, file.name),
        }),
      );
    }

    row.append(
      button(t("exif.removeFile"), {
        variant: "ghost",
        ariaLabel: t("exif.removeNamed", { name: file.name }),
        onClick: () => {
          const index = items.indexOf(item);
          revoke(item);
          items = items.filter((i) => i !== item);
          li.remove();
          render();
          const next = items[Math.min(index, items.length - 1)];
          (next?.li.querySelector<HTMLButtonElement>("button:last-of-type") ?? drop.querySelector("input"))?.focus();
        },
      }),
    );
    li.append(row);
  }

  /** Summary, progress and the global buttons. */
  function render() {
    const total = items.length;
    const reading = items.filter((i) => i.state === "reading").length;
    const ready = items.filter((i) => i.state === "ready" && !i.cleaned);
    const done = items.filter(isDone);
    const failed = items.filter((i) => i.state === "error").length;

    actions.hidden = total === 0;
    progress.hidden = reading === 0;
    progress.max = Math.max(1, total);
    progress.value = total - reading;
    cleanBtn.hidden = ready.length === 0;
    cleanBtn.disabled = reading > 0;
    cleanBtn.textContent = tPlural(ctx, mode === "gps" ? "exif.cleanGps" : "exif.clean", ready.length);
    zipBtn.hidden = done.length === 0;

    if (total === 0) return status.set("");
    if (reading > 0) return status.set(tPlural(ctx, "exif.summary.reading", total, { done: total - reading, total }));
    const parts: string[] = [];
    if (ready.length > 0) {
      const checked = [...ready, ...done];
      parts.push(tPlural(ctx, "exif.summary.checked", checked.length));
      const located = checked.filter((i) => i.analysis?.ok && i.analysis.report.gps).length;
      if (located > 0) parts.push(tPlural(ctx, "exif.summary.located", located));
    } else if (done.length > 0) {
      parts.push(tPlural(ctx, "exif.summary.done", done.length));
      const before = done.reduce((s, i) => s + i.file.size, 0);
      const after = done.reduce((s, i) => s + (i.blob?.size ?? 0), 0);
      parts.push(t("exif.summary.sizes", { before: formatBytes(before), after: formatBytes(after) }));
    }
    if (failed > 0) parts.push(tPlural(ctx, "exif.summary.failed", failed));
    status.set(parts.join(" "));
  }

  return () => {
    destroyed = true;
    for (const item of items) revoke(item);
    tool.remove();
  };
}
