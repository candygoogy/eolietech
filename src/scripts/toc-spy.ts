/**
 * "On this page" lists on long pages (.doc__aside): mark the section being read with aria-current and
 * move the sea-line marker to it (components.css). The section counts as read once its top passes 30%
 * of the viewport; at the very bottom of the page the last section wins, however short it is.
 */
function init(): void {
  const list = document.querySelector<HTMLOListElement>(".doc__aside ol");
  if (!list) return;
  const links = [...list.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const sections = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))));
  let current = -1;

  const mark = (i: number): void => {
    if (i === current || !links[i]) return;
    current = i;
    links.forEach((a, j) => (j === i ? a.setAttribute("aria-current", "location") : a.removeAttribute("aria-current")));
    const a = links[i];
    // CSSOM custom properties (not a style attribute), so the CSP needs no 'unsafe-inline'.
    list.style.setProperty("--toc-y", `${a.offsetTop + a.offsetHeight / 2}px`);
    // First placement: show the marker where it belongs; only later moves slide (the transition is on [data-spy]).
    if (!list.dataset.spy) requestAnimationFrame(() => (list.dataset.spy = "on"));
  };

  const update = (): void => {
    const line = window.innerHeight * 0.3;
    let i = 0;
    sections.forEach((s, j) => {
      if (s && s.getBoundingClientRect().top <= line) i = j;
    });
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    mark(atBottom ? sections.length - 1 : i);
  };

  let queued = false;
  const onScroll = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  };

  links.forEach((a, i) => a.addEventListener("click", () => mark(i)));
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    const i = current;
    current = -1;
    mark(i); // re-measure the marker's position for the new layout
    onScroll();
  });
  update();
}

init();
