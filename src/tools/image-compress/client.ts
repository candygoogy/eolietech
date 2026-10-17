/**
 * Image compressor / converter (base page /compress-image/ and the format-pair variants).
 * Decoding, resizing and encoding run in ./worker.ts; files never leave the browser.
 */
import type { ToolCtx } from "../types";
import { createBatch, numberField, parseDimension, rangeField, selectField } from "../image-shared/batch-ui";
import type { OutputChoice } from "../image-shared/formats";
import { DEFAULT_QUALITY, configFromPreset } from "./settings";

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const t = ctx.t;
  const config = configFromPreset(ctx.preset);

  const options = document.createElement("div");
  options.className = "tool-options";

  const format = selectField(
    t("img.option.format"),
    [
      { value: "original", label: t("img.format.original") },
      { value: "jpg", label: "JPG" },
      { value: "png", label: "PNG" },
      { value: "webp", label: "WebP" },
      { value: "avif", label: "AVIF" },
    ],
    config.output,
  );
  const quality = rangeField(t("img.option.quality"), DEFAULT_QUALITY);
  const maxW = numberField(t("img.option.maxWidth"), t("img.option.dimensionPlaceholder"));
  const maxH = numberField(t("img.option.maxHeight"), t("img.option.dimensionPlaceholder"));

  const qualityNote = document.createElement("p");
  qualityNote.className = "tool-note";
  qualityNote.id = `${quality.input.id}-note`;
  quality.input.setAttribute("aria-describedby", qualityNote.id);

  const resizeNote = document.createElement("p");
  resizeNote.className = "tool-note";
  resizeNote.textContent = t("img.option.resizeNote");

  options.append(format.wrap, quality.wrap, qualityNote, maxW.wrap, maxH.wrap, resizeNote);

  const syncQuality = () => {
    const png = format.select.value === "png";
    quality.input.disabled = png;
    qualityNote.textContent = t(png ? "img.option.qualityPng" : "img.option.qualityNote");
  };
  syncQuality();

  const batch = createBatch(el, {
    ctx,
    accept: config.accept,
    options,
    zipName: t("img.zipName"),
    createWorker: () => new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
    getSettings: () => ({
      output: format.select.value as OutputChoice,
      quality: Number(quality.input.value) || DEFAULT_QUALITY,
      maxWidth: parseDimension(maxW.input.value),
      maxHeight: parseDimension(maxH.input.value),
    }),
  });

  format.select.addEventListener("change", () => {
    syncQuality();
    batch.reprocess();
  });
  // "change" fires when the slider is released or a value is committed, not on every step.
  for (const input of [quality.input, maxW.input, maxH.input]) input.addEventListener("change", () => batch.reprocess());

  return () => batch.destroy();
}
