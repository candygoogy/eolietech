/**
 * The home postcard (Desk.astro, [data-post-root]) is a real compressor. Drop a photo on it, or press
 * it (click, tap, Enter, Space) to choose one: the photo appears in the postcard's frame from a blob:
 * URL, the image compressor's own worker shrinks it (desk-post-engine.ts, loaded on the first photo
 * only), the postmark is struck with the true result, the NOT SENT stamp is pressed again, and a
 * Download button appears. A new photo replaces the last one. Nothing here touches the network.
 *
 * Activation is a plain click listener (plus the button's own keyboard behaviour), never pointerdown,
 * so it does not fight the desk's object dragging, which suppresses the click that ends a drag.
 * State is a data attribute on the postcard (data-post="idle|working|done|error"), styled in
 * src/styles/desk-post.css. Motion: WAAPI on transform/opacity, skipped under reduced motion.
 */
import { interpolate } from "../i18n/interpolate";
import { downloadBlob, formatBytes } from "../lib/tool-ui";
import { MIME, outputName } from "../tools/image-shared/formats";
import type { JobErrorCode } from "../tools/image-shared/protocol";
import { POST_SETTINGS, classifyIntake, isSmaller, postmarkFigure, type IntakeRefusal } from "./desk-post-logic";

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

const root = document.querySelector<HTMLElement>("[data-post-root]");
if (root) init(root);

function init(root: HTMLElement): void {
  const strings = JSON.parse(root.dataset.strings ?? "{}") as Record<string, string>;
  const t = (key: string, vars?: Record<string, string | number>) => interpolate(strings[key] ?? key, vars);
  const maxBytes = Number(root.dataset.maxBytes) || 0;
  const moreHref = root.dataset.moreHref ?? "/compress-image/";
  const heicHref = root.dataset.heicHref ?? "/heic-to-jpg/";

  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const input = q<HTMLInputElement>(".post__input");
  const target = q<HTMLButtonElement>(".post__target");
  const photo = q<HTMLImageElement>(".post__photo");
  const save = q<HTMLButtonElement>(".post__save");
  const name = q<HTMLElement>(".post__name");
  const line = q<HTMLElement>(".post__line");
  const status = q<HTMLElement>(".post__status");
  const postmark = q<SVGElement>(".postmark");
  const figure = q<SVGTextElement>(".postmark__mid");
  const notSent = q<HTMLElement>(".post__notsent");
  const returned = q<HTMLElement>(".post__returned");

  const figureIdle = figure.textContent ?? "";

  let seq = 0;
  let photoUrl: string | null = null;
  let result: { blob: Blob; name: string } | null = null;
  /** One job at a time: each run waits for the previous one (a tiny mutex). */
  let chain: Promise<void> = Promise.resolve();

  const motionOK = () => window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

  /** A rubber-stamp press: lands from a little above the paper. Once, ~200ms, ease-out. */
  function thump(el: Element, delay = 0): void {
    if (!motionOK() || typeof el.animate !== "function") return;
    const rest = getComputedStyle(el).opacity;
    el.animate(
      [
        { opacity: 0, scale: "1.25" },
        { opacity: rest, scale: "1" },
      ],
      { duration: 200, delay, easing: EASE_OUT, fill: "backwards" },
    );
  }

  function setPhoto(url: string | null): void {
    const old = photoUrl;
    photoUrl = url;
    if (url) {
      photo.src = url;
    } else {
      photo.removeAttribute("src");
      delete root.dataset.photo;
    }
    // Revoke the previous URL once the new picture is up (or straight away when there is none).
    if (old) {
      if (url) photo.addEventListener("load", () => URL.revokeObjectURL(old), { once: true });
      else URL.revokeObjectURL(old);
    }
  }

  photo.addEventListener("load", () => {
    if (photoUrl) root.dataset.photo = "";
  });
  // A format this browser cannot display: keep the drawing; the compressor still runs.
  photo.addEventListener("error", () => delete root.dataset.photo);

  function link(text: string, href: string): HTMLAnchorElement {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    return a;
  }

  function setLine(text: string, extra?: HTMLAnchorElement, sep = " · "): void {
    line.replaceChildren(text, ...(extra ? [sep, extra] : []));
  }

  function clear(): void {
    result = null;
    save.hidden = true;
    figure.textContent = figureIdle;
    setPhoto(null);
  }

  function fail(fileName: string, reason: IntakeRefusal | JobErrorCode): void {
    clear();
    root.dataset.post = "error";
    name.textContent = fileName;
    let text: string;
    let extra: HTMLAnchorElement | undefined;
    switch (reason) {
      case "heic":
        text = t("home.post.error.heic");
        extra = link(t("home.post.error.heicLink"), heicHref);
        break;
      case "type":
      case "unsupported":
        text = t("home.post.error.type");
        break;
      case "tooLarge":
        text = t("home.post.error.tooLarge", { max: formatBytes(maxBytes) });
        break;
      case "decode":
        text = t("home.post.error.decode");
        break;
      case "memory":
        text = t("home.post.error.memory");
        extra = link(t("home.post.error.fullLink"), moreHref);
        break;
      default:
        text = t("home.post.error.generic");
        extra = link(t("home.post.error.fullLink"), moreHref);
    }
    setLine(text, extra, " ");
    status.textContent = t("home.post.status.error", {
      name: fileName,
      reason: extra ? `${text} ${extra.textContent}` : text,
    });
    thump(returned);
  }

  async function submit(file: File): Promise<void> {
    const id = ++seq;
    clear();
    root.dataset.post = "working";
    name.textContent = file.name;
    setLine(t("home.post.working"));
    status.textContent = t("home.post.status.working", { name: file.name });

    let head = new Uint8Array(0);
    try {
      head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    } catch {
      /* unreadable: classified as "type" below */
    }
    if (id !== seq) return;
    const intake = classifyIntake(head, file, maxBytes);
    if (!intake.ok) {
      fail(file.name, intake.reason);
      return;
    }
    setPhoto(URL.createObjectURL(file));

    let release!: () => void;
    const mine = new Promise<void>((r) => (release = r));
    const before = chain;
    chain = chain.then(() => mine);
    await before;
    try {
      if (id !== seq) return;
      const { compress } = await import("./desk-post-engine");
      const buffer = await file.arrayBuffer();
      if (id !== seq) return;
      const res = await compress({ id, buffer, settings: POST_SETTINGS });
      if (id !== seq) return;
      if (!res.ok) {
        fail(file.name, res.error);
        return;
      }
      const blob = new Blob([res.buffer], { type: MIME[res.format] });
      done(file, blob, outputName(file.name, res.input, res.format));
    } catch {
      if (id === seq) fail(file.name, "generic");
    } finally {
      release();
    }
  }

  function done(file: File, blob: Blob, outName: string): void {
    result = { blob, name: outName };
    setPhoto(URL.createObjectURL(blob));
    const sizes = { before: formatBytes(file.size), after: formatBytes(blob.size) };
    const smaller = isSmaller(file.size, blob.size);
    root.dataset.post = "done";
    name.textContent = outName;
    figure.textContent = postmarkFigure(file.size, blob.size);
    setLine(t(smaller ? "home.post.sizes" : "home.post.larger", sizes), link(t("home.post.more"), moreHref));
    save.textContent = t(smaller ? "home.post.download" : "home.post.downloadAnyway");
    save.classList.toggle("btn--primary", smaller);
    save.setAttribute("aria-label", t("home.post.downloadNamed", { name: outName, size: sizes.after }));
    save.hidden = false;
    const percent = Math.max(1, Math.round(((file.size - blob.size) / file.size) * 100));
    status.textContent = t(smaller ? "home.post.status.done" : "home.post.status.larger", { name: outName, percent, ...sizes });
    thump(postmark);
    thump(notSent, 140);
  }

  target.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    input.value = "";
    if (file) void submit(file);
  });
  save.addEventListener("click", () => {
    if (result) downloadBlob(result.blob, result.name);
  });

  // Drop target: files dragged from the desktop (HTML drag and drop, separate from object dragging).
  const carriesFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
  const over = (e: DragEvent) => {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    root.dataset.over = "";
  };
  root.addEventListener("dragenter", over);
  root.addEventListener("dragover", over);
  root.addEventListener("dragleave", (e) => {
    if (!root.contains(e.relatedTarget as Node | null)) delete root.dataset.over;
  });
  root.addEventListener("drop", (e) => {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    delete root.dataset.over;
    const file = e.dataTransfer?.files[0];
    if (file) void submit(file);
  });

  // The hero's "Try it on a photo" points at the postcard; with this script it also opens the picker.
  for (const cta of document.querySelectorAll<HTMLAnchorElement>(`a[href="#${root.id}"]`)) {
    cta.addEventListener("click", (e) => {
      e.preventDefault();
      const box = root.getBoundingClientRect();
      if (box.top < 0 || box.bottom > window.innerHeight) {
        root.scrollIntoView({ block: "center", behavior: motionOK() ? "smooth" : "auto" });
      }
      target.focus({ preventScroll: true });
      input.click();
    });
  }

  root.dataset.post ??= "idle";
  root.dataset.ready = "";
}
