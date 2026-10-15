/* Pitch Black network chassis enhancer. v1.0-draft. No dependencies. Safe to fail: every element it touches already exists in static HTML.
   Does: sensory dial (full / calm / plain), carries the setting across the network, hides the bar on scroll down,
   opens the all-eight wheel, runs reveals, validates data-ledger numbers. */
(function () {
  "use strict";
  var d = document, html = d.documentElement;
  html.classList.add("js");

  /* 1. sensory setting: URL ?sense= wins, then saved choice, then OS reduced motion */
  var modes = ["full", "calm", "plain"], sense = "full";
  try {
    var q = new URLSearchParams(location.search).get("sense");
    var saved = localStorage.getItem("pb-sense");
    if (modes.indexOf(q) > -1) sense = q;
    else if (modes.indexOf(saved) > -1) sense = saved;
    else if (matchMedia("(prefers-reduced-motion: reduce)").matches) sense = "calm";
  } catch (e) {}
  function applySense(m) {
    sense = m; html.setAttribute("data-sense", m);
    try { localStorage.setItem("pb-sense", m); } catch (e) {}
    d.querySelectorAll("[data-pb-sense]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-pb-sense") === m)); });
    d.querySelectorAll("a[data-pb-net]").forEach(function (a) {
      try { var u = new URL(a.href); if (m === "full") u.searchParams.delete("sense"); else u.searchParams.set("sense", m); a.href = u.toString(); } catch (e) {}
    });
    d.dispatchEvent(new CustomEvent("pb:sense", { detail: m }));
  }
  d.querySelectorAll("[data-pb-sense]").forEach(function (b) { b.addEventListener("click", function () { applySense(b.getAttribute("data-pb-sense")); }); });
  applySense(sense);
  window.PB = window.PB || {}; window.PB.sense = function () { return sense; };

  /* 2. bar: vanish on scroll down, return on scroll up */
  var bar = d.querySelector("[data-pb-bar]"), lastY = window.scrollY;
  if (bar) window.addEventListener("scroll", function () {
    var y = window.scrollY; bar.classList.toggle("is-hidden", y > lastY && y > 120); lastY = y;
  }, { passive: true });

  /* 3. all eight overlay */
  var allBtn = d.querySelector("[data-pb-all]"), all = d.getElementById("pb-all");
  function closeAll() { if (!all) return; all.hidden = true; if (allBtn) { allBtn.setAttribute("aria-expanded", "false"); allBtn.focus(); } }
  if (allBtn && all) {
    allBtn.addEventListener("click", function () { all.hidden = false; allBtn.setAttribute("aria-expanded", "true"); var f = all.querySelector("a,button"); if (f) f.focus(); });
    all.querySelectorAll("[data-pb-close]").forEach(function (c) { c.addEventListener("click", closeAll); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && !all.hidden) closeAll(); });
  }

  /* 4. reveals: only when motion is allowed; content is visible without this */
  var rev = d.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && rev.length) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }); }, { rootMargin: "0px 0px -10% 0px" });
    rev.forEach(function (el) { io.observe(el); });
    setTimeout(function () { rev.forEach(function (el) { el.classList.add("in"); }); }, 4000); /* never strand content */
  } else rev.forEach(function (el) { el.classList.add("in"); });

  /* 5. ledger: static HTML carries the number; this validates it and flags anything unresolved */
  function checkLedger(L) {
    if (!L || !L.keys) return;
    d.querySelectorAll("[data-ledger]").forEach(function (el) {
      var k = el.getAttribute("data-ledger"), row = L.keys[k];
      if (!row) { el.classList.add("pb-placeholder"); console.warn("[pb-ledger] unknown key", k); return; }
      if (row.status === "conflict" || row.status === "placeholder" || row.public === false) { el.classList.add("pb-placeholder"); console.warn("[pb-ledger] not publishable:", k, row.status); return; }
      if (row.value !== null && String(el.textContent).trim() === "") el.textContent = typeof row.value === "number" ? row.value.toLocaleString("en-AU") : row.value;
    });
  }
  if (window.PB_LEDGER) checkLedger(window.PB_LEDGER);
  else if (d.querySelector("[data-ledger]") && window.fetch) fetch("/ledger.json").then(function (r) { return r.ok ? r.json() : null; }).then(checkLedger).catch(function () {});
})();
