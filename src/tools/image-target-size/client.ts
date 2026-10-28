/**
 * Compress an image to a size in KB (base page /compress-image-to-kb/; variant presets for 20, 50, 100
 * and 200 KB). Each file is saved as JPG or WebP at the largest size and highest quality that fit; the
 * search, decoding and encoding run in ./worker.ts, so files never leave the browser.
 */
import type { ToolCtx } from "../types";
import { createBatch, numberField, selectField } from "../image-shared/batch-ui";
import {
  KB,
  MAX_KB,
  TARGET_ACCEPT,
  formFromPreset,
  parseKb,
  targetSettings,
  type TargetForm,
  type TargetOutput,
  type TargetSettings,
} from "./settings";

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const t = ctx.t;
  const initial = formFromPreset(ctx.preset);
  const n = new Intl.NumberFormat(ctx.locale);

  const options = document.createElement("div");
  options.className = "tool-options";

  const size = numberField(t("img.option.targetKb"), "");
  size.input.max = String(MAX_KB);
  size.input.value = initial.kb;
  const format = selectField(
    t("img.option.saveAs"),
    [
      { value: "jpg", label: "JPG" },
      { value: "webp", label: "WebP" },
    ],
    initial.output,
  );
  const note = document.createElement("p");
  note.className = "tool-note";
  note.id = `${size.input.id}-note`;
  size.input.setAttribute("aria-describedby", note.id);
  // The note changes silently while typing; a missing size is also said once, out loud.
  const alert = document.createElement("p");
  alert.className = "visually-hidden";
  alert.setAttribute("aria-live", "polite");
  options.append(size.wrap, format.wrap, note, alert);

  const readForm = (): TargetForm => ({ kb: size.input.value, output: format.select.value as TargetOutput });

  let missing = false;
  const syncNote = () => {
    const kb = parseKb(size.input.value);
    if (kb === null) {
      size.input.setAttribute("aria-invalid", "true");
      note.textContent = t("img.note.missing", { max: n.format(MAX_KB) });
      if (!missing) alert.textContent = note.textContent;
      missing = true;
      return;
    }
    size.input.removeAttribute("aria-invalid");
    missing = false;
    alert.textContent = "";
    note.textContent = `${t("img.note.target", { kb: n.format(kb), bytes: n.format(kb * KB) })} ${t("img.note.kb")}`;
  };
  syncNote();

  // While the size field is empty or invalid, new and re-run files keep the last valid size.
  let settings: TargetSettings = targetSettings(initial);
  const getSettings = () => (settings = targetSettings(readForm(), settings.targetBytes / KB));

  const batch = createBatch(el, {
    ctx,
    accept: TARGET_ACCEPT,
    options,
    zipName: t("img.zipName"),
    target: true,
    createWorker: () => new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
    getSettings,
  });

  const update = () => {
    syncNote();
    batch.reprocess();
  };
  size.input.addEventListener("input", syncNote);
  // "change" fires on Enter, blur or the spinner, not on every keystroke.
  for (const control of [size.input, format.select]) control.addEventListener("change", update);

  return () => batch.destroy();
}
