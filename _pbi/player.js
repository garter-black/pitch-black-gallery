/* PBI GLOBAL PLAYER v1 — shadow-DOM isolated, zero host-page mutation.
   Served same-origin from /_pbi/player.js by the pbi-edge worker. */
(function () {
  "use strict";
  if (window.__PBI_PLAYER__) return;              // never double-mount
  window.__PBI_PLAYER__ = "1";

  var BASE = "https://album.black.gallery/audio/";
  var T = [
    ["01", "DETONATE (Pitch Black)", "01-detonate-pitch-black.mp3"],
    ["02", "The Black Garter · Unburied", "02-the-black-garter-unburied.mp3"],
    ["03", "Don't Cross This Border", "03-dont-cross-this-border.mp3"],
    ["04", "The Witch of Rockdale", "04-the-witch-of-rockdale.mp3"],
    ["05", "Sugar & Switchblades", "05-sugar-and-switchblades.mp3"],
    ["06", "Married to the Lightning", "06-married-to-the-lightning.mp3"],
    ["07", "If You Only Knew Her", "07-if-you-only-knew-her.mp3"],
    ["08", "Cry in My Lamborghini", "08-cry-in-my-lamborghini.mp3"],
    ["09", "The X That Should Be a Check", "09-the-x-that-should-be-a-check.mp3"],
    ["10", "Paint the Black Rose Red", "10-paint-the-black-rose-red.mp3"],
    ["11", "Gold On You", "11-gold-on-you.mp3"],
    ["12", "Stuck on One", "12-stuck-on-one.mp3"],
    ["13", "The Witch's Hourglass", "13-the-witchs-hourglass.mp3"],
    ["14", "Nothing to Lose", "14-nothing-to-lose.mp3"],
    ["15", "The Smallest Knife", "15-the-smallest-knife.mp3"],
    ["16", "Ordinary Gold", "16-ordinary-gold.mp3"],
    ["17", "Deathless", "17-deathless.mp3"],
    ["18", "The Swarm of Fireflies", "18-the-swarm-of-fireflies.mp3"],
    ["19", "The Speed of Grief", "19-the-speed-of-grief.mp3"],
    ["20", "Tout s'arrange", "20-tout-sarrange.mp3"],
    ["21", "Мир (Peace)", "21-mir.mp3"],
    ["22", "说好的八十年 (Duet)", "22-shuohaode-bashinian-duet.mp3"],
    ["23", "Somebody's Brother", "23-somebodys-brother.mp3"],
    ["24", "Xavier's Song", "24-xaviers-song.mp3"],
    ["25", "The Brightest Stars", "25-the-brightest-stars.mp3"],
    ["26", "The Black Garter", "26-the-black-garter.mp3"],
    ["27", "Fell From Heaven (Angel of the Black Garter)", "27-fell-from-heaven.mp3"],
    ["28", "Bin Chicken (빈치킨)", "28-bin-chicken.mp3"],
    ["29", "Honi Soit (堕天)", "29-honi-soit.mp3"],
    ["30", "Sanguis et Ferrum", "30-sanguis-et-ferrum.mp3"],
    ["31", "Hush, Lil One", "31-hush-lil-one.mp3"],
    ["32", "Hera", "32-hera.mp3"]
  ];

  var KEY = "pbi.player.v1";
  var st = { i: 0, t: 0, v: 0.7, open: 0 };
  try { var raw = localStorage.getItem(KEY); if (raw) { var p = JSON.parse(raw); if (p && typeof p === "object") st = Object.assign(st, p); } } catch (e) {}
  if (!(st.i >= 0 && st.i < T.length)) st.i = 0;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  var host = document.createElement("div");
  host.id = "pbi-player-host";
  host.setAttribute("data-pbi", "player");
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;margin:0;padding:0}',
    '.w{position:fixed;left:0;bottom:0;z-index:2147483000;',
    'font-family:"Helvetica Neue",Helvetica,"Neue Haas Grotesk",Arial,sans-serif;',
    '-webkit-font-smoothing:antialiased;color:#FBF9F1;pointer-events:none}',
    '.w *{pointer-events:auto}',
    '.bar{display:flex;align-items:center;gap:14px;height:44px;padding:0 16px;',
    'background:rgba(10,9,8,.94);border-top:1px solid rgba(251,249,241,.16);',
    'border-right:1px solid rgba(251,249,241,.16);max-width:min(94vw,520px)}',
    '@supports (backdrop-filter:blur(6px)){.bar{backdrop-filter:blur(8px)}}',
    'button{background:none;border:0;color:#FBF9F1;cursor:pointer;font:inherit;',
    'line-height:0;opacity:.72;transition:opacity .18s}',
    'button:hover,button:focus-visible{opacity:1}',
    'button:focus-visible{outline:1px solid rgba(251,249,241,.5);outline-offset:3px}',
    'svg{display:block}',
    '.ttl{font-size:9px;letter-spacing:.28em;text-transform:uppercase;white-space:nowrap;',
    'overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;opacity:.86}',
    '.num{font-size:9px;letter-spacing:.24em;opacity:.4;font-variant-numeric:tabular-nums}',
    '.pg{position:absolute;left:0;top:0;height:1px;width:100%;background:rgba(251,249,241,.14);cursor:pointer}',
    '.pg i{display:block;height:100%;width:0;background:#FBF9F1;transition:width .25s linear}',
    '.pg:hover{height:3px;top:-1px}',
    '.lst{display:none;max-height:min(48vh,380px);overflow:auto;background:rgba(10,9,8,.97);',
    'border-top:1px solid rgba(251,249,241,.16);border-right:1px solid rgba(251,249,241,.16);',
    'max-width:min(94vw,520px);scrollbar-width:thin}',
    '.lst.on{display:block}',
    '.lst button{display:flex;gap:12px;width:100%;text-align:left;padding:9px 16px;line-height:1.2;',
    'font-size:9px;letter-spacing:.2em;text-transform:uppercase;opacity:.55}',
    '.lst button:hover{opacity:1;background:rgba(251,249,241,.05)}',
    '.lst button[aria-current="true"]{opacity:1}',
    '.lst button[aria-current="true"] .d:before{content:"— "}',
    '.d{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '@media(max-width:640px){.bar{height:40px;gap:10px;padding:0 12px;max-width:100vw}',
    '.lst,.bar{max-width:100vw}.ttl{font-size:8px;letter-spacing:.22em}}',
    '@media(prefers-reduced-motion:reduce){*{transition:none!important}}'
  ].join("");

  function ico(d, w) {
    return '<svg width="' + (w || 11) + '" height="' + (w || 11) + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + d + "</svg>";
  }
  var I_PLAY = ico("<path d='M7 4v16l13-8z'/>", 12),
      I_PAUSE = ico("<path d='M6 4h4v16H6zM14 4h4v16h-4z'/>", 12),
      I_PREV = ico("<path d='M7 5h2v14H7zM19 5v14l-9-7z'/>"),
      I_NEXT = ico("<path d='M15 5h2v14h-2zM5 5l9 7-9 7z'/>");

  var wrap = document.createElement("div");
  wrap.className = "w";
  wrap.innerHTML =
    '<div class="lst" id="lst" role="listbox" aria-label="Darkest Nights, Brightest Stars — 32 tracks"></div>' +
    '<div class="bar" style="position:relative">' +
      '<div class="pg" id="pg" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="pgi"></i></div>' +
      '<button id="prev" aria-label="Previous track">' + I_PREV + "</button>" +
      '<button id="pp" aria-label="Play">' + I_PLAY + "</button>" +
      '<button id="next" aria-label="Next track">' + I_NEXT + "</button>" +
      '<span class="num" id="num"></span>' +
      '<button class="ttl" id="ttl" aria-expanded="false" aria-controls="lst"></button>' +
    "</div>";

  var style = document.createElement("style");
  style.textContent = CSS;
  root.appendChild(style);
  root.appendChild(wrap);

  var $ = function (id) { return root.getElementById ? root.getElementById(id) : root.querySelector("#" + id); };
  var elLst = $("lst"), elPg = $("pg"), elPgi = $("pgi"), elPP = $("pp"),
      elTtl = $("ttl"), elNum = $("num");

  var au = new Audio();
  au.preload = "none";
  au.volume = st.v;
  au.crossOrigin = "anonymous";

  var frag = document.createDocumentFragment();
  T.forEach(function (t, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "option");
    b.innerHTML = '<span class="num">' + t[0] + '</span><span class="d"></span>';
    b.querySelector(".d").textContent = t[1];
    b.addEventListener("click", function () { load(i, true); });
    frag.appendChild(b);
  });
  elLst.appendChild(frag);
  var rows = elLst.querySelectorAll("button");

  function paint() {
    elNum.textContent = T[st.i][0];
    elTtl.textContent = T[st.i][1];
    elTtl.title = T[st.i][1] + " — Darkest Nights, Brightest Stars";
    for (var i = 0; i < rows.length; i++) rows[i].setAttribute("aria-current", i === st.i ? "true" : "false");
    var playing = !au.paused && !au.ended;
    elPP.innerHTML = playing ? I_PAUSE : I_PLAY;
    elPP.setAttribute("aria-label", playing ? "Pause" : "Play");
  }

  function load(i, play) {
    st.i = ((i % T.length) + T.length) % T.length;
    st.t = 0;
    au.preload = "metadata";
    au.src = BASE + T[st.i][2];
    save(); paint();
    if (play) au.play().catch(function () { paint(); });
    if (rows[st.i] && rows[st.i].scrollIntoView) rows[st.i].scrollIntoView({ block: "nearest" });
  }

  elPP.addEventListener("click", function () {
    if (!au.src) { load(st.i, true); return; }
    if (au.paused) { if (st.t && !au.currentTime) { try { au.currentTime = st.t; } catch (e) {} } au.play().catch(function () {}); }
    else au.pause();
  });
  $("prev").addEventListener("click", function () { load(st.i - 1, !au.paused || !!au.currentTime); });
  $("next").addEventListener("click", function () { load(st.i + 1, true); });

  elTtl.addEventListener("click", function () {
    st.open = st.open ? 0 : 1;
    elLst.classList.toggle("on", !!st.open);
    elTtl.setAttribute("aria-expanded", st.open ? "true" : "false");
    save();
    if (st.open && rows[st.i] && rows[st.i].scrollIntoView) rows[st.i].scrollIntoView({ block: "nearest" });
  });

  function seek(ev) {
    if (!au.duration) return;
    var r = elPg.getBoundingClientRect();
    var x = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) / r.width;
    try { au.currentTime = Math.max(0, Math.min(1, x)) * au.duration; } catch (e) {}
  }
  elPg.addEventListener("click", seek);
  elPg.addEventListener("keydown", function (e) {
    if (!au.duration) return;
    if (e.key === "ArrowRight") { au.currentTime = Math.min(au.duration, au.currentTime + 5); e.preventDefault(); }
    if (e.key === "ArrowLeft") { au.currentTime = Math.max(0, au.currentTime - 5); e.preventDefault(); }
  });

  au.addEventListener("timeupdate", function () {
    if (!au.duration) return;
    var p = (au.currentTime / au.duration) * 100;
    elPgi.style.width = p + "%";
    elPg.setAttribute("aria-valuenow", Math.round(p));
    if (Math.abs(au.currentTime - st.t) > 4) { st.t = au.currentTime; save(); }
  });
  au.addEventListener("play", paint);
  au.addEventListener("pause", paint);
  au.addEventListener("ended", function () { load(st.i + 1, true); });
  au.addEventListener("error", function () { paint(); });

  /* courtesy: if the host page starts its own UNMUTED media, yield to it */
  document.addEventListener("play", function (e) {
    var t = e.target;
    if (t && t !== au && t.tagName && /^(AUDIO|VIDEO)$/.test(t.tagName) && !t.muted && t.volume > 0) au.pause();
  }, true);

  if (st.open) { elLst.classList.add("on"); elTtl.setAttribute("aria-expanded", "true"); }
  paint();

  function mount() {
    if (!document.body || document.getElementById("pbi-player-host")) return;
    document.body.appendChild(host);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();