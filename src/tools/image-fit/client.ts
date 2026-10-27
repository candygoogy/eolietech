/**
 * Image fitter (base page /make-image-square/; variant presets for 16:9 and 9:16). Each whole photo
 * is placed in a frame of the chosen shape over a white, black, coloured, blurred or transparent
 * background, instead of being cropped. Decoding, scaling, the blur and encoding run in ./worker.ts;
 * files never leave the browser.
 */
import type { ToolCtx } from "../types";
import { createBatch, domId, numberField, rangeField, selectField } from "../image-shared/batch-ui";
import { MAX_SIDE } from "../image-shared/formats";
import { ASPECTS, layout } from "./fit";
import {
  BACKGROUNDS,
  FIT_ACCEPT,
  OUTPUTS,
  SIZES,
  allowsTransparent,
  fitSettings,
  formFromPreset,
  frameWidth,
  type BackgroundChoice,
  type FitForm,
  type FitOutput,
  type SizeChoice,
} from "./settings";
// Loaded by mountTools before mount (src/lib/tool-mount.ts), so only this tool's page fetches it.
export { default as styles } from "./fit.css?url";

const FORMAT_NAME: Record<FitOutput, string> = { original: "", jpg: "JPG", png: "PNG", webp: "WebP" };

/** A radio group shown as a segmented control (fieldset + legend, one visible label per choice). */
function choiceGroup<V extends string>(legend: string, choices: { value: V; label: string }[], value: V) {
  const name = domId("fit-choice");
  const fieldset = document.createElement("fieldset");
  fieldset.className = "fit-choice";
  const l = document.createElement("legend");
  l.textContent = legend;
  const row = document.createElement("div");
  row.className = "fit-choice__row";
  const options = document.createElement("div");
  options.className = "fit-choice__options";
  const inputs = new Map<V, { input: HTMLInputElement; label: HTMLLabelElement }>();
  for (const c of choices) {
    const label = document.createElement("label");
    label.className = "fit-choice__option";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.value = c.value;
    input.className = "visually-hidden";
    input.checked = c.value === value;
    const text = document.createElement("span");
    text.textContent = c.label;
    label.append(input, text);
    options.append(label);
    inputs.set(c.value, { input, label });
  }
  row.append(options);
  fieldset.append(l, row);
  const get = (): V => [...inputs].find(([, { input }]) => input.checked)?.[0] ?? value;
  const set = (v: V) => {
    const choice = inputs.get(v);
    if (choice) choice.input.checked = true;
  };
  return { fieldset, row, inputs, get, set };
}

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const t = ctx.t;
  const initial = formFromPreset(ctx.preset);

  // Shape and background: two segmented controls, side by side where there is room.
  const choices = document.createElement("div");
  choices.className = "fit-choices";
  const shape = choiceGroup(
    t("fit.option.shape"),
    ASPECTS.map((a) => ({ value: a, label: a })),
    initial.aspect,
  );
  const bg = choiceGroup<BackgroundChoice>(
    t("fit.option.background"),
    BACKGROUNDS.map((b) => ({ value: b, label: t(`fit.bg.${b}`) })),
    initial.background,
  );
  const color = document.createElement("input");
  color.type = "color";
  color.id = domId("fit-color");
  color.className = "fit-color";
  color.value = initial.color;
  color.setAttribute("aria-label", t("fit.bg.colorLabel"));
  bg.row.append(color);
  choices.append(shape.fieldset, bg.fieldset);

  // Size: the photo's own size or a fixed frame width.
  const size = document.createElement("div");
  size.className = "tool-options";
  const sizeMode = selectField(
    t("fit.option.size"),
    SIZES.map((s) => ({ value: s, label: t(`fit.size.${s}`) })),
    initial.size,
  );
  const width = numberField(t("fit.option.width"), "");
  width.input.value = initial.width;
  const sizeNote = document.createElement("p");
  sizeNote.className = "tool-note";
  sizeNote.id = `${sizeMode.select.id}-note`;
  for (const control of [sizeMode.select, width.input]) control.setAttribute("aria-describedby", sizeNote.id);
  // The note changes silently; a missing width is also said once, out loud (as in the resizer).
  const sizeAlert = document.createElement("p");
  sizeAlert.className = "visually-hidden";
  sizeAlert.setAttribute("aria-live", "polite");
  size.append(sizeMode.wrap, width.wrap, sizeNote, sizeAlert);

  // Save as (as in the resizer, without AVIF).
  const output = document.createElement("div");
  output.className = "tool-options";
  const format = selectField(
    t("img.option.format"),
    OUTPUTS.map((o) => ({ value: o, label: o === "original" ? t("img.format.original") : FORMAT_NAME[o] })),
    initial.output,
  );
  const quality = rangeField(t("img.option.quality"), Number(initial.quality));
  const qualityNote = document.createElement("p");
  qualityNote.className = "tool-note";
  qualityNote.id = `${quality.input.id}-note`;
  quality.input.setAttribute("aria-describedby", qualityNote.id);
  output.append(format.wrap, quality.wrap, qualityNote);

  const readForm = (): FitForm => ({
    aspect: shape.get(),
    background: bg.get(),
    color: color.value,
    size: sizeMode.select.value as SizeChoice,
    width: width.input.value,
    output: format.select.value as FitOutput,
    quality: quality.input.value,
  });

  /** Transparent only where the format keeps it; a chosen Transparent falls back to White. */
  const syncBackground = () => {
    const out = format.select.value as FitOutput;
    const transparent = bg.inputs.get("transparent")!;
    transparent.label.hidden = !allowsTransparent(out);
    if (transparent.label.hidden && transparent.input.checked) bg.set("white");
    color.hidden = bg.get() !== "color";
  };

  let missing = false;
  const syncSize = () => {
    const form = readForm();
    width.wrap.hidden = form.size !== "width";
    const w = frameWidth(form);
    if (w === undefined) {
      width.input.setAttribute("aria-invalid", "true");
      sizeNote.textContent = t("fit.note.missing", { max: new Intl.NumberFormat(ctx.locale).format(MAX_SIDE) });
      if (!missing) sizeAlert.textContent = sizeNote.textContent;
      missing = true;
      return;
    }
    width.input.removeAttribute("aria-invalid");
    missing = false;
    sizeAlert.textContent = "";
    if (w === null) {
      sizeNote.textContent = t("fit.note.photo");
    } else {
      const frame = layout(1, 1, form.aspect, w);
      sizeNote.textContent = t("fit.note.width", { width: frame.frameWidth, height: frame.frameHeight });
    }
  };

  const syncQuality = () => {
    const png = format.select.value === "png";
    quality.input.disabled = png;
    qualityNote.textContent = t(png ? "img.option.qualityPng" : "img.option.qualityNote");
  };

  syncBackground();
  syncSize();
  syncQuality();

  // While the width field is empty or invalid, new and re-run files keep the last valid width.
  let lastWidth = Number(initial.width);
  const getSettings = () => {
    const settings = fitSettings(readForm(), lastWidth);
    if (settings.fit.width !== null) lastWidth = settings.fit.width;
    return settings;
  };

  const batch = createBatch(el, {
    ctx,
    accept: FIT_ACCEPT,
    options: choices,
    zipName: t("img.zipName"),
    // Rows lead with "old -> new" pixel sizes, and the original is offered only when the size is unchanged.
    resize: true,
    createWorker: () => new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
    getSettings,
  });
  // createBatch places one options element; size and output follow it, each starting its own row.
  choices.after(size, output);

  const update = () => {
    syncBackground();
    syncSize();
    syncQuality();
    batch.reprocess();
  };
  // "input" keeps the note in step with typing; "change" (commit, blur, picker closed) re-runs.
  width.input.addEventListener("input", syncSize);
  for (const { input } of [...shape.inputs.values(), ...bg.inputs.values()]) input.addEventListener("change", update);
  for (const control of [color, sizeMode.select, width.input, format.select, quality.input]) {
    control.addEventListener("change", update);
  }

  return () => batch.destroy();
}
