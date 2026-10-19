/**
 * The readable invoice on the page, built from the same Presented content as the PDF. Every value
 * from the XML goes in through h()'s text / textContent only, never as markup. Tables turn into
 * labelled stacks when the panel is narrow (fattura.css, container query), so a phone at 375px can
 * read every line without scrolling sideways.
 */
import { button, h } from "../ai-shared/dom";
import type { FieldGroup, PartyBlock, Presented, Section, Table } from "./present";

export interface ViewOptions {
  id: string;
  /** Accessible name for an attachment's download button. */
  attachmentLabel: (name: string) => string;
  downloadText: string;
  onAttachment: (index: number) => void;
}

function party(p: PartyBlock): HTMLElement {
  return h(
    "div",
    { className: "fv-party" },
    h("h3", { className: "fv-party__role", text: p.role }),
    h("p", { className: "fv-party__name", text: p.name }),
    ...p.lines.map((line) => h("p", { text: line })),
  );
}

function fields(groups: FieldGroup[]): HTMLElement[] {
  return groups.flatMap((g) => {
    const list = h("dl", { className: "fv-fields" }, ...g.rows.map(([label, value]) => h("div", {}, h("dt", { text: label }), h("dd", { text: value }))));
    return g.title ? [h("h4", { className: "fv-group", text: g.title }), list] : [list];
  });
}

function table(t: Table, caption: string): HTMLElement[] {
  const head = h(
    "tr",
    {},
    ...t.columns.map((c) => h("th", { scope: "col", className: c.align === "right" ? "fv-num" : undefined, text: c.label })),
  );
  const body = t.rows.map((row) =>
    h(
      "tr",
      {},
      ...row.map((cell, i) => {
        const col = t.columns[i]!;
        const className = [col.align === "right" ? "fv-num" : "", col.main ? "fv-main" : ""].filter(Boolean).join(" ");
        return h("td", { className: className || undefined, "data-label": col.label, text: cell });
      }),
    ),
  );
  const out: HTMLElement[] = [
    h("div", { className: "fv-table-wrap" }, h("table", { className: "fv-table" }, h("caption", { className: "visually-hidden", text: caption }), h("thead", {}, head), h("tbody", {}, ...body))),
  ];
  if (t.totals.length) {
    out.push(h("dl", { className: "fv-totals" }, ...t.totals.map(([label, value]) => h("div", {}, h("dt", { text: label }), h("dd", { text: value })))));
  }
  return out;
}

function section(s: Section, opts: ViewOptions): HTMLElement {
  const id = `${opts.id}-${s.id}`;
  const el = h("section", { className: "fv-section", "aria-labelledby": id }, h("h3", { id, text: s.title }));
  if (s.kind === "fields") el.append(...fields(s.groups));
  else if (s.kind === "table") el.append(...table(s.table, s.title));
  else if (s.kind === "text") el.append(...s.paragraphs.map((p) => h("p", { className: "fv-text", text: p })));
  else {
    el.append(
      h(
        "ul",
        { className: "fv-attachments" },
        ...s.items.map((a) =>
          h(
            "li",
            {},
            h("div", {}, h("p", { className: "fv-attachment__name", text: a.name }), a.detail ? h("p", { className: "fv-attachment__detail", text: a.detail }) : null),
            button(opts.downloadText, { ariaLabel: opts.attachmentLabel(a.name), onClick: () => opts.onAttachment(a.index) }),
          ),
        ),
      ),
    );
  }
  return el;
}

/** The whole readable invoice, labelled by its title. */
export function renderInvoice(p: Presented, opts: ViewOptions): HTMLElement {
  const titleId = `${opts.id}-title`;
  return h(
    "article",
    { className: "fv-invoice", id: opts.id, "aria-labelledby": titleId },
    h("h2", { className: "fv-title", id: titleId, text: p.title }),
    p.subtitle ? h("p", { className: "fv-subtitle", text: p.subtitle }) : null,
    h("div", { className: "fv-parties" }, ...p.parties.map(party)),
    ...p.sections.map((s) => section(s, opts)),
    ...p.notes.map((n) => h("p", { className: "fv-note", text: n })),
  );
}
