/**
 * Audio transcription: Whisper base runs in ./worker.ts (WebGPU or WebAssembly). The page decodes
 * the file with Web Audio (16 kHz mono) and sends only the samples to the worker. The model (about
 * 76 MB) is downloaded from this site only when the user presses Transcribe, after the page has
 * shown its size. Nothing is uploaded.
 */
import { createDropzone, downloadBlob, formatBytes, renameExtension } from "../../lib/tool-ui";
import { tPlural } from "../../i18n/plural";
import { detectDevice, ENGINE_BYTES, rememberWasm, retryDevice, type Device } from "../ai-shared/backend";
import { button, errorRegion, h, statusRegion } from "../ai-shared/dom";
import { firstDownloadBytes } from "../ai-shared/model-files";
import { classifyLoadFailure, downloadMilestone, joinNames, missingFeatures, WORKER_LOAD_ERROR } from "../ai-shared/support";
import type { ToolCtx } from "../types";
import { AudioDecodeError, decodeToMono16k } from "./audio";
import { formatClock, toPlainText, toSegments, toSrt, toVtt, type Segment } from "./subtitles";
import type { AsrRequest, AsrResponse } from "./worker";
// Loaded by mountTools before mount (src/lib/tool-mount.ts), so only this tool's page fetches it.
export { default as styles } from "./transcribe.css?url";

const ACCEPT =
  "audio/*,video/mp4,video/webm,video/quicktime,video/x-matroska,.mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.flac,.weba,.webm,.mp4,.m4v,.mov,.mkv";
const MODEL_ID = "whisper-base";

/** Languages offered in the picker (Whisper knows more; these are the ones it handles reasonably well at this size). */
const LANGUAGES = [
  "en", "it", "es", "fr", "de", "pt", "nl", "pl", "ro", "cs", "sk", "hu", "el", "bg", "hr", "sr", "sl",
  "sv", "da", "no", "fi", "ca", "uk", "ru", "tr", "ar", "he", "fa", "hi", "id", "ms", "vi", "th", "zh", "ja", "ko",
];

type Ready = Extract<AsrResponse, { type: "ready" }>;
type Outcome = Extract<AsrResponse, { type: "result" } | { type: "error" }>;

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const { t } = ctx;
  let file: File | null = null;
  let busy = false;
  let worker: Worker | null = null;
  let ready: Promise<Ready> | null = null;
  let modelLoaded = false;
  let segments: Segment[] = [];
  let pendingRun: ((m: Outcome) => void) | null = null;
  let onLoadMessage: ((m: AsrResponse) => void) | null = null;

  const names = (() => {
    try {
      return new Intl.DisplayNames([ctx.locale], { type: "language" });
    } catch {
      return null;
    }
  })();
  const languageName = (code: string) => names?.of(code) ?? code;

  const errors = errorRegion();
  const status = statusRegion();
  const drop = createDropzone({
    accept: ACCEPT,
    multiple: false,
    ctx,
    onFiles: ({ ok, rejected }) => {
      if (rejected.length) errors.show(rejected.map((r) => r.reason));
      else errors.clear();
      const next = ok[0];
      if (next) {
        file = next;
        clearResult();
        status.set(t("asr.added", { name: next.name }));
        render();
      }
    },
  });

  const langId = `asr-lang-${Math.random().toString(36).slice(2, 8)}`;
  const langSelect = h(
    "select",
    { id: langId, name: "language" },
    h("option", { value: "", text: t("asr.language.auto") }),
    ...LANGUAGES.map((code) => ({ code, name: languageName(code) }))
      .sort((a, b) => a.name.localeCompare(b.name, ctx.locale))
      .map(({ code, name }) => h("option", { value: code, text: name })),
  );
  const options = h(
    "div",
    { className: "tool-options", hidden: true },
    h("div", {}, h("label", { for: langId, text: t("asr.language.label") }), langSelect),
    h("p", { className: "tool-note", text: t("asr.language.note") }),
  );

  // Checked before anything is downloaded: without these the model download would be wasted.
  const missing = missingFeatures(globalThis as unknown as Record<string, unknown>, ["wasm", "worker", "webAudio"]);
  const unsupported = missing.length > 0;

  // The page picks the backend up front so the notice shows exactly what will be downloaded.
  let device: Device = "wasm";
  const downloadSize = () => formatBytes(firstDownloadBytes(MODEL_ID, device));
  const modelNote = h("p", { className: "tool-note" });
  const showModelNote = () => {
    modelNote.textContent = unsupported
      ? t("asr.unsupported", { features: joinNames(missing, ctx.locale) })
      : t("asr.modelNote", { size: downloadSize() });
  };
  showModelNote();
  const deviceReady = detectDevice().then((d) => {
    device = d;
    showModelNote();
  });
  const backendNote = h("p", { className: "tool-note", hidden: true });
  const item = h("ul", { className: "tool-list", "aria-label": t("asr.listLabel"), hidden: true });
  const progress = h("progress", { className: "tool-progress", hidden: true, max: 1, value: 0 });
  const runBtn = button(t("asr.action"), { variant: "primary", onClick: () => void transcribe() });
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: reset });
  const actions = h("div", { className: "tool-actions", hidden: true }, runBtn, resetBtn);

  // Focusable so keyboard users can scroll it; a named region so screen readers say what it is.
  const transcript = h("div", { className: "asr-transcript", role: "region", tabindex: 0, "aria-label": t("asr.transcriptLabel") });
  const summary = h("p", { className: "tool-note" });
  const copyBtn = button(t("asr.copy"), { onClick: () => void copyText() });
  const txtBtn = button(t("asr.download.txt"), { variant: "primary", onClick: () => save("txt") });
  const srtBtn = button(t("asr.download.srt"), { onClick: () => save("srt") });
  const vttBtn = button(t("asr.download.vtt"), { onClick: () => save("vtt") });
  const result = h(
    "section",
    { className: "asr-result", hidden: true, "aria-label": t("asr.resultLabel") },
    summary,
    transcript,
    h("div", { className: "tool-actions" }, txtBtn, srtBtn, vttBtn, copyBtn),
  );

  el.append(
    h(
      "div",
      { className: "tool tool--audio-transcribe" },
      drop,
      errors.el,
      options,
      modelNote,
      backendNote,
      item,
      actions,
      progress,
      status.el,
      result,
    ),
  );
  render();

  function clearResult() {
    segments = [];
    result.hidden = true;
    transcript.replaceChildren();
  }

  function reset() {
    file = null;
    clearResult();
    errors.clear();
    status.set("");
    progress.hidden = true;
    render();
  }

  function render(meta?: string, state: "pending" | "working" | "done" | "error" = "pending") {
    const has = !!file;
    options.hidden = !has;
    actions.hidden = !has;
    item.hidden = !has;
    modelNote.hidden = modelLoaded;
    item.replaceChildren(
      ...(file
        ? [
            h(
              "li",
              { className: "tool-item", "data-state": state },
              h("span", { className: "tool-item__name", text: file.name }),
              h("span", { className: "tool-item__meta", text: meta ?? formatBytes(file.size) }),
            ),
          ]
        : []),
    );
    runBtn.disabled = busy || !file || unsupported;
    resetBtn.disabled = busy;
    langSelect.disabled = busy;
    drop.toggleAttribute("inert", busy);
  }

  function startWorker(): Promise<Ready> {
    const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "audio-transcribe" });
    worker = w;
    // No message at all before an error means the worker script itself did not load.
    let heard = false;
    return new Promise<Ready>((resolve, reject) => {
      onLoadMessage = (msg) => {
        if (msg.type === "progress") {
          progress.max = msg.total || 1;
          progress.value = msg.loaded;
          // The bytes change many times a second: shown, but only quarter points are announced.
          const milestone = downloadMilestone(msg.loaded, msg.total);
          if (msg.downloaded > 0) {
            status.quiet(
              t("asr.downloading", {
                loaded: formatBytes(msg.loaded),
                total: formatBytes(msg.total),
                engine: formatBytes(ENGINE_BYTES[device]),
              }),
              milestone > 0 && milestone < 100 ? t("asr.downloadedPercent", { percent: milestone }) : "",
            );
          } else {
            status.quiet(t("asr.fromCache"), t("asr.fromCache"));
          }
          if (msg.loaded >= msg.total) {
            progress.removeAttribute("value");
            status.set(t("asr.starting"));
          }
        } else if (msg.type === "ready") {
          onLoadMessage = null;
          resolve(msg);
        } else if (msg.type === "error" && msg.stage === "load") {
          onLoadMessage = null;
          reject(new Error(msg.message));
        }
      };
      w.addEventListener("message", (event: MessageEvent<AsrResponse>) => {
        const msg = event.data;
        heard = true;
        if (onLoadMessage) {
          onLoadMessage(msg);
          return;
        }
        if (msg.type === "language") {
          status.set(t("asr.languageFound", { language: languageName(msg.language) }));
        } else if (msg.type === "chunk") {
          progress.max = msg.total;
          progress.value = msg.done;
          status.set(t("asr.progress", { percent: Math.round((msg.done / msg.total) * 100) }));
        } else if (msg.type === "result" || msg.type === "error") {
          pendingRun?.(msg);
          pendingRun = null;
        }
      });
      w.addEventListener("error", (e) => {
        // A crash (usually out of memory) kills the worker: fail what is pending, start fresh next time.
        const message = e.message || "worker error";
        onLoadMessage = null;
        reject(heard ? new Error(message) : Object.assign(new Error(message), { name: WORKER_LOAD_ERROR }));
        pendingRun?.({ type: "error", stage: "run", message });
        pendingRun = null;
        stopWorker();
      });
      w.postMessage({ type: "load", device } satisfies AsrRequest);
    });
  }

  function stopWorker() {
    worker?.terminate();
    worker = null;
    ready = null;
    modelLoaded = false;
  }

  function fail(message: string, meta: string) {
    errors.show(message);
    status.set("");
    progress.hidden = true;
    busy = false;
    render(meta, "error");
  }

  /** Message for a model or worker that did not load: offline, an updated page, or anything else. */
  function loadErrorText(err: unknown): string {
    const kind = classifyLoadFailure(err, navigator.onLine);
    return kind === "offline" ? t("asr.error.offline") : kind === "updated" ? t("asr.error.updated") : t("asr.error.load");
  }

  /** WebGPU failed here: WebAssembly for the rest of the session and after reloads. */
  function switchToWasm() {
    rememberWasm();
    device = "wasm";
    showModelNote();
  }

  async function transcribe() {
    if (!file || busy || unsupported) return;
    const current = file;
    busy = true;
    errors.clear();
    clearResult();
    progress.hidden = false;
    progress.removeAttribute("value");
    render(t("asr.decoding"), "working");

    // 1. Decode on the page (Web Audio is not available in workers).
    status.set(t("asr.decoding"));
    let audio: { samples: Float32Array<ArrayBuffer>; duration: number };
    try {
      audio = await decodeToMono16k(current);
    } catch (err) {
      if (!(err instanceof AudioDecodeError)) console.error(err);
      fail(t("asr.error.decode", { name: current.name }), t("asr.error.decodeShort"));
      return;
    }
    const length = formatClock(audio.duration);
    const language = langSelect.value || null;

    let outcome: Outcome;
    let retrying = false;
    for (;;) {
      // 2. Load the model (first time, or again on WebAssembly after a WebGPU failure).
      let info: Ready;
      try {
        if (!ready) {
          await deviceReady;
          // On a retry the status already says what is happening.
          if (!retrying) status.set(t("asr.loading", { size: downloadSize() }));
          ready = startWorker();
        }
        info = await ready;
        // WebGPU did not start on this device (the worker fell back): skip it from now on.
        if (device === "webgpu" && info.device === "wasm") switchToWasm();
        modelLoaded = true;
        backendNote.hidden = false;
        backendNote.textContent =
          info.device === "webgpu" ? t("asr.backend.webgpu") : tPlural(ctx, "asr.backend.wasm", info.threads, { threads: info.threads });
      } catch (err) {
        console.error(err);
        stopWorker();
        fail(loadErrorText(err), formatBytes(current.size));
        return;
      }

      // 3. Transcribe.
      render(t("asr.working", { length }), "working");
      progress.max = 1;
      progress.value = 0;
      status.set(language ? t("asr.progress", { percent: 0 }) : t("asr.detecting"));
      const samples = audio.samples;
      outcome = await new Promise<Outcome>((resolve) => {
        pendingRun = resolve;
        worker!.postMessage({ type: "run", audio: samples, language } satisfies AsrRequest, [samples.buffer]);
      });
      if (outcome.type !== "error") break;

      // The file decoded, so this is a runtime failure. On WebGPU it leaves the GPU session unusable:
      // retry this file on WebAssembly in a fresh worker and keep WebAssembly from now on.
      if (!retryDevice(info.device, "runtime")) {
        fail(t("asr.error.failed", { name: current.name }), t("asr.error.failedShort"));
        return;
      }
      console.warn("[audio-transcribe] WebGPU failed while transcribing, retrying on WebAssembly:", outcome.message);
      switchToWasm();
      stopWorker();
      retrying = true;
      progress.removeAttribute("value");
      status.set(t("asr.retryWasm"));
      try {
        audio = await decodeToMono16k(current); // the samples went to the old worker
      } catch (err) {
        console.error(err);
        fail(t("asr.error.decode", { name: current.name }), t("asr.error.decodeShort"));
        return;
      }
    }

    segments = toSegments(outcome.chunks, audio.duration);
    if (segments.length === 0 && outcome.text.trim()) {
      segments = [{ start: 0, end: audio.duration, text: outcome.text.trim() }];
    }
    busy = false;
    progress.hidden = true;
    const words = segments.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0);
    render(t("asr.doneMeta", { length, words }), "done");
    summary.textContent = t("asr.summary", { language: languageName(outcome.language), length, words });
    transcript.replaceChildren(
      ...(segments.length
        ? segments.map((s) =>
            h("p", {}, h("span", { className: "asr-time", text: formatClock(s.start) }), " ", h("span", { text: s.text })),
          )
        : [h("p", { className: "tool-note", text: t("asr.empty") })]),
    );
    result.hidden = false;
    status.set(t("asr.done"));
    txtBtn.focus();
  }

  function outputBase(): string {
    return (file?.name ?? "transcript").replace(/\.[^.]+$/, "") || "transcript";
  }

  function save(kind: "txt" | "srt" | "vtt") {
    if (!segments.length) return;
    const body = kind === "txt" ? toPlainText(segments) : kind === "srt" ? toSrt(segments) : toVtt(segments);
    const type = kind === "vtt" ? "text/vtt" : kind === "srt" ? "application/x-subrip" : "text/plain";
    downloadBlob(new Blob([body], { type: `${type};charset=utf-8` }), renameExtension(outputBase(), kind));
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(toPlainText(segments));
      status.set(t("asr.copied"));
    } catch {
      status.set(t("asr.copyFailed"));
    }
  }

  return () => {
    reset();
    stopWorker();
  };
}
