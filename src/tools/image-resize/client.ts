/**
 * Image resizer (base page /resize-image/; variant presets for email and Instagram). Decoding,
 * resampling (Lanczos3) and encoding run in ./worker.ts; files never leave the browser.
 */
import type { ToolCtx } from "../types";
import { checkField, createBatch, numberField, rangeField, selectField } from "../image-shared/batch-ui";
import { MAX_SIDE, type OutputChoice } from "../image-shared/formats";
import type { JobSettings } from "../image-shared/protocol";
import {
  MAX_PERCENT,
  MODES,
  RESIZE_ACCEPT,
  formFromPreset,
  missingFields,
  resizeSettings,
  resizeSpec,
  type Mode,
  type ResizeForm,
} from "./settings";

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const t = ctx.t;
  const initial = formFromPreset(ctx.preset);

  // Size: what to resize to. Output: the file it becomes. Two grids, so each group starts its own row.
  const size = document.createElement("div");
  size.className = "tool-options";
  const output = document.createElement("div");
  output.className = "tool-options";

  const mode = selectField(
    t("img.option.mode"),
    MODES.map((m) => ({ value: m, label: t(`img.mode.${m}`) })),
    initial.mode,
  );
  const width = numberField(t("img.option.width"), "");
  const height = numberField(t("img.option.height"), "");
  const percent = numberField(t("img.option.percent"), "");
  percent.input.max = String(MAX_PERCENT);
  width.input.value = initial.width;
  height.input.value = initial.height;
  percent.input.value = initial.percent;
  const keepAspect = checkField(t("img.option.keepAspect"), initial.keepAspect);
  const enlarge = checkField(t("img.option.enlarge"), initial.enlarge);
  const sizeNote = document.createElement("p");
  sizeNote.className = "tool-note";
  sizeNote.id = `${mode.select.id}-note`;
  for (const control of [mode.select, width.input, height.input, percent.input, keepAspect.input, enlarge.input]) {
    control.setAttribute("aria-describedby", sizeNote.id);
  }
  size.append(mode.wrap, width.wrap, height.wrap, percent.wrap, keepAspect.wrap, enlarge.wrap, sizeNote);

  const format = selectField(
    t("img.option.format"),
    [
      { value: "original", label: t("img.format.original") },
      { value: "jpg", label: "JPG" },
      { value: "png", label: "PNG" },
      { value: "webp", label: "WebP" },
      { value: "avif", label: "AVIF" },
    ],
    initial.output,
  );
  const quality = rangeField(t("img.option.quality"), Number(initial.quality));
  const qualityNote = document.createElement("p");
  qualityNote.className = "tool-note";
  qualityNote.id = `${quality.input.id}-note`;
  quality.input.setAttribute("aria-describedby", qualityNote.id);
  output.append(format.wrap, quality.wrap, qualityNote);

  const readForm = (): ResizeForm => ({
    mode: mode.select.value as Mode,
    width: width.input.value,
    height: height.input.value,
    percent: percent.input.value,
    keepAspect: keepAspect.input.checked,
    enlarge: enlarge.input.checked,
    output: format.select.value as OutputChoice,
    quality: quality.input.value,
  });

  /** Show the fields the mode needs and describe the result in words; flag what is missing. */
  const syncSize = () => {
    const form = readForm();
    width.wrap.hidden = form.mode !== "width" && form.mode !== "box";
    height.wrap.hidden = form.mode !== "height" && form.mode !== "box";
    percent.wrap.hidden = form.mode !== "percent";
    keepAspect.wrap.hidden = form.mode !== "box";
    const missing = missingFields(form);
    for (const [name, field] of [["width", width], ["height", height], ["percent", percent]] as const) {
      if (missing.includes(name)) field.input.setAttribute("aria-invalid", "true");
      else field.input.removeAttribute("aria-invalid");
    }
    const spec = resizeSpec(form);
    if (!spec) {
      const key = missing.length > 1 ? "both" : missing[0]!;
      const n = new Intl.NumberFormat(ctx.locale);
      sizeNote.textContent = t(`img.note.missing.${key}`, { max: n.format(MAX_SIDE), maxPercent: n.format(MAX_PERCENT) });
      return;
    }
    const what =
      spec.mode === "width"
        ? t("img.note.width", { width: spec.width })
        : spec.mode === "height"
          ? t("img.note.height", { height: spec.height })
          : spec.mode === "percent"
            ? t("img.note.percent", { percent: spec.percent })
            : t(spec.keepAspect ? "img.note.fit" : "img.note.stretch", { width: spec.width, height: spec.height });
    sizeNote.textContent = `${what} ${t(spec.enlarge ? "img.note.enlarge" : "img.note.noEnlarge")}`;
  };

  const syncQuality = () => {
    const png = format.select.value === "png";
    quality.input.disabled = png;
    qualityNote.textContent = t(png ? "img.option.qualityPng" : "img.option.qualityNote");
  };

  syncSize();
  syncQuality();

  // While a size field is empty or invalid, new and re-run files keep the last complete size.
  let settings: JobSettings = resizeSettings(initial);
  const getSettings = (): JobSettings => (settings = resizeSettings(readForm(), settings.resize ?? undefined));

  const batch = createBatch(el, {
    ctx,
    accept: RESIZE_ACCEPT,
    options: size,
    zipName: t("img.zipName"),
    resize: true,
    createWorker: () => new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
    getSettings,
  });
  // createBatch places one options element; the output group goes right under the size group.
  size.after(output);

  const update = () => {
    syncSize();
    syncQuality();
    batch.reprocess();
  };
  // A mode that needs a side the user has not filled in starts from the other side (1600 wide ->
  // a 1600 x 1600 box), instead of opening on an empty field flagged as an error.
  mode.select.addEventListener("change", () => {
    const m = mode.select.value as Mode;
    if ((m === "height" || m === "box") && !height.input.value.trim()) height.input.value = width.input.value;
    if ((m === "width" || m === "box") && !width.input.value.trim()) width.input.value = height.input.value;
  });
  // "input" keeps the description in step with typing; "change" (commit, blur, slider release) re-runs.
  for (const input of [width.input, height.input, percent.input]) input.addEventListener("input", syncSize);
  for (const control of [mode.select, width.input, height.input, percent.input, keepAspect.input, enlarge.input, format.select, quality.input]) {
    control.addEventListener("change", update);
  }

  return () => batch.destroy();
}
