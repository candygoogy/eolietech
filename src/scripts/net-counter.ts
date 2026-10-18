/**
 * The home's live counter ([data-counter] in index.astro): how many other servers this page has
 * talked to, from the browser's own resource timing (the navigation, every resource so far, and a
 * PerformanceObserver for the ones that follow), counted by foreignOrigins() (net-origins.ts).
 * Pressing it shows the list. The counter is hidden without this script, so the page never shows a
 * number nobody measured. It observes; it guarantees nothing (the CSP does that), and the copy says so.
 */
import { interpolate } from "../i18n/interpolate";
import { foreignOrigins } from "./net-origins";

const box = document.querySelector<HTMLElement>("[data-counter]");

if (box && typeof performance !== "undefined" && typeof performance.getEntriesByType === "function") {
  const toggle = box.querySelector<HTMLButtonElement>(".counter__toggle")!;
  const count = box.querySelector<HTMLElement>(".counter__n")!;
  const more = box.querySelector<HTMLElement>(".counter__more")!;
  const panel = box.querySelector<HTMLElement>(".counter__panel")!;
  const host = location.host;
  const str = (key: string) => interpolate(box.dataset[key] ?? "", { host });

  const entries: { name: string }[] = [
    ...performance.getEntriesByType("navigation"),
    ...performance.getEntriesByType("resource"),
  ];
  let shown: string[] = [];

  const renderList = () => {
    if (shown.length === 0) {
      const none = document.createElement("p");
      none.className = "counter__none";
      none.textContent = str("none");
      panel.replaceChildren(none);
      return;
    }
    const list = document.createElement("ul");
    list.className = "counter__list";
    list.setAttribute("aria-label", str("listLabel"));
    for (const origin of shown) {
      const li = document.createElement("li");
      li.textContent = origin;
      list.append(li);
    }
    panel.replaceChildren(list);
  };

  const update = () => {
    const next = foreignOrigins(entries, location.origin);
    if (next.length === shown.length && next.every((o, i) => o === shown[i]) && panel.childElementCount > 0) return;
    shown = next;
    count.textContent = String(shown.length);
    box.dataset.count = String(shown.length);
    renderList();
  };

  if (typeof PerformanceObserver === "function") {
    try {
      new PerformanceObserver((list) => {
        entries.push(...list.getEntries());
        update();
      }).observe({ type: "resource" });
    } catch {
      /* no observer: the count stays as of page load */
    }
  }

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    more.textContent = str(open ? "hide" : "show");
  });

  update();
  box.hidden = false;
}
