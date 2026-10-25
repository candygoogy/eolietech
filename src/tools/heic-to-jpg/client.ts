/**
 * HEIC/HEIF to JPG (or PNG; the /heic-to-png/ variant starts on PNG) converter. HEIC decoding (heic-to / libheif) and encoding run in
 * ./worker.ts; files never leave the browser.
 */
import type { ToolCtx } from "../types";
import { createBatch, rangeField, selectField } from "../image-shared/batch-ui";
import { HEIC_ACCEPT, HEIC_DEFAULT_QUALITY, heicSettings, initialFormat } from "./settings";

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const t = ctx.t;

  const options = document.createElement("div");
  options.className = "tool-options";
  const format = selectField(
    t("img.option.format"),
    [
      { value: "jpg", label: "JPG" },
      { value: "png", label: "PNG" },
    ],
    initialFormat(ctx.preset),
  );
  const quality = rangeField(t("img.option.quality"), HEIC_DEFAULT_QUALITY);
  const qualityNote = document.createElement("p");
  qualityNote.className = "tool-note";
  qualityNote.id = `${quality.input.id}-note`;
  quality.input.setAttribute("aria-describedby", qualityNote.id);
  options.append(format.wrap, quality.wrap, qualityNote);

  const syncQuality = () => {
    const png = format.select.value === "png";
    quality.input.disabled = png;
    qualityNote.textContent = t(png ? "img.option.qualityPng" : "img.option.qualityNote");
  };
  syncQuality();

  const batch = createBatch(el, {
    ctx,
    accept: HEIC_ACCEPT,
    options,
    zipName: t("img.zipName"),
    createWorker: () => new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
    getSettings: () => heicSettings(format.select.value, quality.input.value),
  });

  format.select.addEventListener("change", () => {
    syncQuality();
    batch.reprocess();
  });
  quality.input.addEventListener("change", () => batch.reprocess());

  return () => batch.destroy();
}
