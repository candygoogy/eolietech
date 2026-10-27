/**
 * Protect PDF (base page) and Unlock PDF (variant, preset { mode: "unlock" }) with qpdf (WASM, in a
 * Web Worker). qpdf.wasm (~1.3 MB) is downloaded from this site only when the user presses the
 * action button. Protect: AES-256 with the typed password and a random owner password, no
 * restrictions. Unlock: removes restrictions, or the password when the user types the right one.
 * Nothing guesses passwords.
 *
 * Passwords live in the two inputs (read through .value, never written to an attribute) and in the
 * messages to the worker; nothing logs or stores them, and the cleanup clears the fields.
 */
import qpdfWasmUrl from "@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url";
import { createDropzone, downloadBlob, downloadZip, formatBytes, renameExtension } from "../../lib/tool-ui";
import { tPlural } from "../../i18n/plural";
import type { ToolCtx } from "../types";
import { baseName, button, entryTracker, errorRegion, h, pdfBlob, statusRegion } from "../pdf-shared/dom";
import { looksLikePdf } from "../pdf-shared/pdf-errors";
import type { QpdfRequest, QpdfResponse } from "./qpdf.worker";
import {
  checkNewPassword,
  checkPasswordArgs,
  classifyCheck,
  classifyProbe,
  classifyWrite,
  decryptArgs,
  encryptArgs,
  modeFromPreset,
  probeArgs,
  QPDF_WASM_BYTES,
  randomOwnerPassword,
  type Mode,
  type QpdfResult,
} from "./qpdf-args";

export { default as styles } from "./password.css?url";

const ACCEPT = "application/pdf,.pdf";
let uid = 0;

interface Entry {
  id: number;
  file: File;
  state: "pending" | "working" | "done" | "error";
  output?: Blob;
  /** Done with nothing to do (unlock: the file has no password): neutral, no download. */
  nothingToDo?: boolean;
  /** Failed for want of the right password: typing another one makes it pending again. */
  passwordProblem?: boolean;
  message?: string;
}

/** A failure with a message for the row (already translated). */
class RowError extends Error {
  constructor(
    message: string,
    public readonly passwordProblem = false,
  ) {
    super(message);
  }
}

// ---------- engine (one worker per page, created on first use) ----------

interface Engine {
  run(input: Blob, args: string[], wantOutput: boolean): Promise<QpdfResult & { output?: ArrayBuffer }>;
}

let enginePromise: Promise<Engine> | null = null;

function loadEngine(): Promise<Engine> {
  enginePromise ??= (async () => {
    const worker = new Worker(new URL("./qpdf.worker.ts", import.meta.url), { type: "module", name: "qpdf" });
    type Job = { resolve: (r: QpdfResult & { output?: ArrayBuffer }) => void; reject: (e: Error) => void };
    const jobs = new Map<number, Job>();
    let nextJob = 1;
    await new Promise<void>((resolve, reject) => {
      worker.addEventListener("message", (e: MessageEvent<QpdfResponse>) => {
        const msg = e.data;
        if (msg.type === "ready") resolve();
        else if (msg.type === "result") {
          jobs.get(msg.id)?.resolve({ code: msg.code, stderr: msg.stderr, output: msg.output });
          jobs.delete(msg.id);
        } else if (msg.type === "error") {
          if (msg.id === null) {
            reject(new Error(msg.message));
            worker.terminate();
          } else {
            jobs.get(msg.id)?.reject(new Error(msg.message));
            jobs.delete(msg.id);
          }
        }
      });
      worker.addEventListener("error", (e) => {
        // A crash (e.g. out of memory) kills the worker: fail everything and allow a fresh engine next time.
        const err = new Error(e.message || "worker error");
        reject(err);
        for (const job of jobs.values()) job.reject(err);
        jobs.clear();
        worker.terminate();
        enginePromise = null;
      });
      worker.postMessage({ type: "init", wasmUrl: new URL(qpdfWasmUrl, location.href).href } satisfies QpdfRequest);
    });
    return {
      run(input, args, wantOutput) {
        const id = nextJob++;
        return new Promise((resolve, reject) => {
          jobs.set(id, { resolve, reject });
          worker.postMessage({ type: "run", id, input, args, wantOutput } satisfies QpdfRequest);
        });
      },
    };
  })();
  enginePromise.catch(() => (enginePromise = null));
  return enginePromise;
}

// ---------- UI ----------

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const { t } = ctx;
  const mode: Mode = modeFromPreset(ctx.preset);
  const k = (key: string) => `password.${mode}.${key}`;
  const id = `pdf-password-${++uid}`;
  let entries: Entry[] = [];
  let nextId = 1;
  let busy = false;
  let engineReady = false;
  const enterRow = entryTracker();

  const errors = errorRegion();
  const status = statusRegion();
  const drop = createDropzone({
    accept: ACCEPT,
    multiple: true,
    ctx,
    onFiles: ({ ok, rejected }) => {
      const room = ctx.limits.maxFiles > 0 ? ctx.limits.maxFiles - entries.length : ok.length;
      const accepted = ok.slice(0, Math.max(0, room));
      const messages = rejected.map((r) => r.reason);
      if (accepted.length < ok.length) messages.push(t("tool.error.tooMany", { max: ctx.limits.maxFiles }));
      if (messages.length) errors.show(messages);
      else errors.clear();
      if (accepted.length) {
        entries = entries.concat(accepted.map((file) => ({ id: nextId++, file, state: "pending" }) satisfies Entry));
        status.set(tPlural(ctx, "password.added", accepted.length));
        render();
      }
    },
  });

  // Password fields. Never given a value attribute; autocomplete off so the browser does not offer to save them.
  const field = (suffix: string) =>
    h("input", {
      type: "password",
      id: `${id}-${suffix}`,
      autocomplete: "off",
      autocapitalize: "off",
      spellcheck: "false",
    });
  const pwInput = field("password");
  const confirmInput = mode === "protect" ? field("confirm") : null;
  const passwordInputs = confirmInput ? [pwInput, confirmInput] : [pwInput];
  const showInput = h("input", { type: "checkbox", id: `${id}-show` });
  showInput.addEventListener("change", () => {
    for (const input of passwordInputs) input.type = showInput.checked ? "text" : "password";
  });
  for (const input of passwordInputs) input.addEventListener("input", onPasswordInput);

  const options = h(
    "div",
    { className: "tool-options", hidden: true },
    h("div", {}, h("label", { for: pwInput.id, text: t(k("label")) }), pwInput),
    confirmInput && h("div", {}, h("label", { for: confirmInput.id, text: t("password.protect.confirm") }), confirmInput),
    h("div", {}, showInput, " ", h("label", { for: showInput.id, text: t("password.show") })),
    h("p", { className: "tool-note", id: `${id}-note`, text: t(k("note")) }),
  );
  pwInput.setAttribute("aria-describedby", `${id}-note`);

  const engineNote = h("p", { className: "tool-note", hidden: true, text: t("password.engineNote", { size: formatBytes(QPDF_WASM_BYTES) }) });
  const list = h("ul", { className: "tool-list", "aria-label": t(k("listLabel")), hidden: true });
  const progress = h("progress", { className: "tool-progress", hidden: true, max: 1, value: 0 });
  const actionBtn = button(t(k("action")), { variant: "primary", onClick: () => void processAll() });
  const zipBtn = button(t("tool.downloadAll"), { onClick: () => void downloadAllZip() });
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: reset });
  const actions = h("div", { className: "tool-actions", hidden: true }, actionBtn, zipBtn, resetBtn);
  // Row failures stay in their rows; this off-screen alert only reads them out.
  const rowAlert = h("p", { className: "visually-hidden", role: "alert" });

  const tool = h(
    "div",
    { className: `tool tool--pdf-password tool--pdf-password-${mode}` },
    drop,
    errors.el,
    options,
    engineNote,
    list,
    actions,
    progress,
    status.el,
    rowAlert,
  );
  el.append(tool);
  render();

  function onPasswordInput() {
    for (const input of passwordInputs) input.removeAttribute("aria-invalid");
    if (busy) return;
    let changed = false;
    for (const e of entries) {
      // Protect: every result used the old password. Unlock: only the files that needed one.
      if (e.state === "pending" || (mode === "unlock" && !e.passwordProblem)) continue;
      Object.assign(e, { state: "pending", output: undefined, message: undefined, nothingToDo: undefined, passwordProblem: undefined });
      changed = true;
    }
    if (changed) render();
  }

  function reset() {
    entries = [];
    errors.clear();
    rowAlert.textContent = "";
    status.set("");
    progress.hidden = true;
    render();
  }

  const outputName = (e: Entry) => t(k("outputName"), { name: baseName(e.file.name) });

  function render() {
    const has = entries.length > 0;
    options.hidden = !has;
    actions.hidden = !has;
    list.hidden = !has;
    engineNote.hidden = !has || engineReady;
    list.replaceChildren(
      ...entries.map((e) => {
        let meta = formatBytes(e.file.size);
        if (e.state === "working") meta = t(k("working"));
        if (e.state === "error" || e.state === "done") meta = e.message ?? "";
        const controls: HTMLElement[] = [];
        if (e.state === "done" && e.output) {
          const blob = e.output;
          const name = outputName(e);
          controls.push(button(t("tool.download"), { ariaLabel: t("password.downloadLabel", { name }), onClick: () => downloadBlob(blob, name) }));
        }
        if (!busy) {
          controls.push(
            button(t("tool.remove"), {
              variant: "ghost",
              ariaLabel: t("password.removeLabel", { name: e.file.name }),
              onClick: () => {
                entries = entries.filter((x) => x !== e);
                render();
                status.set(t("password.removed", { name: e.file.name }));
                actionBtn.focus();
              },
            }),
          );
        }
        const li = h(
          "li",
          { className: "tool-item", "data-state": e.state, "data-outcome": e.state === "done" && e.nothingToDo ? "kept-original" : undefined },
          h("span", { className: "tool-item__name", text: e.file.name }),
          h("span", { className: "tool-item__meta", text: meta }),
          h("span", { className: "tool-actions" }, ...controls),
        );
        enterRow(e.id, li);
        return li;
      }),
    );
    const ready = entries.filter((e) => e.state === "done" && e.output);
    actionBtn.disabled = busy || !entries.some((e) => e.state === "pending");
    zipBtn.hidden = ready.length < 2;
    zipBtn.disabled = busy;
    resetBtn.disabled = busy;
    for (const input of [...passwordInputs, showInput]) input.disabled = busy;
  }

  /** Protect: the typed password, or null after showing what is wrong with it. */
  function newPassword(): string | null {
    const password = pwInput.value;
    const problem = checkNewPassword(password, confirmInput?.value ?? "");
    if (!problem) return password;
    const target = problem === "mismatch" ? confirmInput! : pwInput;
    target.setAttribute("aria-invalid", "true");
    errors.show(t(`password.protect.error.${problem}`));
    target.focus();
    return null;
  }

  async function protect(engine: Engine, e: Entry, password: string): Promise<void> {
    const probe = classifyProbe(await engine.run(e.file, probeArgs(), false));
    if (probe === "unreadable") throw new RowError(t("tool.pdf.error.invalid", { name: e.file.name }));
    if (probe !== "plain") throw new RowError(t("password.protect.error.encrypted", { name: e.file.name }));
    const result = await engine.run(e.file, encryptArgs(password, randomOwnerPassword()), true);    if (classifyWrite(result) !== "ok" || !result.output) throw new RowError(t("password.error.failed", { name: e.file.name }));
    const output = pdfBlob(new Uint8Array(result.output));
    // The new file must need a password, and this one must open it.
    if (!classifyCheck(await engine.run(output, checkPasswordArgs(password), false))) {
      throw new RowError(t("password.error.failed", { name: e.file.name }));
    }
    e.output = output;
    e.message = t("password.protect.result");
  }

  async function unlock(engine: Engine, e: Entry, password: string): Promise<void> {
    const probe = classifyProbe(await engine.run(e.file, probeArgs(), false));
    if (probe === "unreadable") throw new RowError(t("tool.pdf.error.invalid", { name: e.file.name }));
    if (probe === "plain") {
      e.nothingToDo = true;
      e.message = t("password.unlock.notEncrypted", { name: e.file.name });
      return;
    }
    if (probe === "needsPassword" && !password) throw new RowError(t("password.unlock.error.needsPassword", { name: e.file.name }), true);
    const result = await engine.run(e.file, decryptArgs(probe === "needsPassword" ? password : undefined), true);
    const outcome = classifyWrite(result);
    if (outcome === "wrongPassword") throw new RowError(t("password.unlock.error.wrongPassword", { name: e.file.name }), true);
    if (outcome !== "ok" || !result.output) throw new RowError(t("password.error.failed", { name: e.file.name }));
    const output = pdfBlob(new Uint8Array(result.output));
    if (classifyProbe(await engine.run(output, probeArgs(), false)) !== "plain") throw new RowError(t("password.error.failed", { name: e.file.name }));
    e.output = output;
    e.message = t(probe === "needsPassword" ? "password.unlock.result.password" : "password.unlock.result.restrictions");
  }

  async function processAll() {
    const todo = entries.filter((e) => e.state === "pending");
    if (todo.length === 0 || busy) return;
    errors.clear();
    rowAlert.textContent = "";
    let password = pwInput.value;
    if (mode === "protect") {
      const checked = newPassword();
      if (checked === null) return;
      password = checked;
    }
    busy = true;
    render();
    let engine: Engine;
    try {
      progress.hidden = false;
      progress.removeAttribute("value");
      status.set(t("password.loadingEngine", { size: formatBytes(QPDF_WASM_BYTES) }));
      engine = await loadEngine();
      engineReady = true;
    } catch (err) {
      console.error(err);
      errors.show(t("password.error.engine"));
      status.set("");
      progress.hidden = true;
      busy = false;
      render();
      return;
    }

    const failures: string[] = [];
    progress.max = todo.length;
    for (const [n, e] of todo.entries()) {
      e.state = "working";
      render();
      progress.value = n;
      status.set(t(k("fileStatus"), { current: n + 1, total: todo.length, name: e.file.name }));
      try {
        if (!looksLikePdf(new Uint8Array(await e.file.slice(0, 1024).arrayBuffer()))) {
          throw new RowError(t("tool.pdf.error.invalid", { name: e.file.name }));
        }
        await (mode === "protect" ? protect(engine, e, password) : unlock(engine, e, password));
        e.state = "done";
      } catch (err) {
        // Never log err for RowError: nothing to debug. Other errors carry no password (worker messages only).
        if (!(err instanceof RowError)) console.error(err);
        e.state = "error";
        e.passwordProblem = err instanceof RowError && err.passwordProblem;
        e.message = err instanceof RowError ? err.message : t("password.error.failed", { name: e.file.name });
        failures.push(e.message);
      }
      render();
    }
    busy = false;
    progress.hidden = true;
    const ready = entries.filter((e) => e.state === "done" && e.output);
    status.set(tPlural(ctx, "password.done", ready.length));
    if (failures.length) rowAlert.textContent = failures.join(" ");
    render();
    if (entries.some((e) => e.passwordProblem)) pwInput.focus();
    else list.querySelector<HTMLButtonElement>(".tool-item[data-state='done'] .tool-actions .btn:not(.btn--ghost)")?.focus();
  }

  async function downloadAllZip() {
    const ready = entries.filter((e) => e.state === "done" && e.output);
    const used = new Set<string>();
    const files = ready.map((e) => {
      let name = outputName(e);
      for (let i = 2; used.has(name); i++) name = renameExtension(outputName(e), `${i}.pdf`);
      used.add(name);
      return { name, blob: e.output! };
    });
    await downloadZip(files, t(k("zipName")));
  }

  return () => {
    for (const input of passwordInputs) input.value = "";
    entries = [];
    tool.remove();
  };
}
