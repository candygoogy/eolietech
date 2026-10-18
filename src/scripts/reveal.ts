/**
 * One-shot scroll reveals for marketing pages (styles at the end of global.css).
 *
 * Content is only ever hidden by this script, and only when it starts below the fold, so without
 * JS, in old browsers, for crawlers and for anything already on screen at load, everything is
 * visible from the first paint. Each target reveals once and is then left alone.
 * Runs on every page; does nothing when a page has no [data-reveal] targets.
 */
const targets = document.querySelectorAll<HTMLElement>("[data-reveal]");

if (targets.length > 0 && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-reveal", "in");
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );

  const fold = window.innerHeight;
  for (const el of targets) {
    if (el.getBoundingClientRect().top < fold) continue; // on screen already: never hide it
    el.setAttribute("data-reveal", "pending");
    io.observe(el);
  }
}
