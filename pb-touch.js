/* pb-touch.js v1.0 (24 Sep 2026) — one mobile controller for every Pitch Black virtual world.
 * Left half: dynamic joystick (appears under the thumb) = MOVE. Right half: drag = LOOK. Buttons bottom right.
 * Contract (identical in every world, so nothing can be "reversed"):
 *   PBTouch.move.x  -1..1   +1 = strafe RIGHT          PBTouch.move.y  -1..1   +1 = walk FORWARD
 *   onLook(dx, dy)   pixels  dx > 0 = turn RIGHT        dy > 0 = look DOWN  (camera follows the finger)
 *   three.js YXZ camera: yaw -= dx * k; pitch -= dy * k.
 * Integration: PBTouch.init({...}) once; read PBTouch.move each frame (or keys:true to emulate W/A/S/D + Shift).
 * Tap (short, still touch) passes through to whatever is under the finger, so doors/NPCs/buttons still work.
 * Only shows on touch devices (pointer: coarse) unless ?touch=1. QA hook: PBTouch.getPose() from the world adapter.
 */
(function () {
  'use strict';
  if (window.PBTouch && window.PBTouch.version) return;
  const q = new URLSearchParams(location.search);
  const isTouch = q.get('touch') === '1' || (q.get('touch') !== '0' &&
    ((window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0));
  const KEYCODES = { KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, ShiftLeft: 16, Space: 32, KeyE: 69, KeyF: 70, KeyV: 86, KeyX: 88,
    KeyQ: 81, KeyR: 82, KeyC: 67, Enter: 13, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 };
  const KEYNAMES = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', ShiftLeft: 'Shift', Space: ' ', KeyE: 'e', KeyF: 'f', KeyV: 'v',
    KeyX: 'x', KeyQ: 'q', KeyR: 'r', KeyC: 'c', Enter: 'Enter', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight' };
  const held = new Set();
  function key(code, down) {
    if (down === held.has(code)) return;
    down ? held.add(code) : held.delete(code);
    const ev = new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: KEYNAMES[code] || code, bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'keyCode', { get: () => KEYCODES[code] || 0 });
    Object.defineProperty(ev, 'which', { get: () => KEYCODES[code] || 0 });
    ev.pbTouch = true;
    (document.activeElement && document.activeElement !== document.body ? document.activeElement : document).dispatchEvent(ev);
  }

  const CSS = `
#pbt{position:fixed;inset:0;z-index:2147483000;pointer-events:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#pbt[hidden]{display:none!important}
#pbt .z{position:absolute;bottom:0;top:var(--pbt-top,38%);pointer-events:auto;touch-action:none}
#pbt .zl{left:0;width:50%}#pbt .zr{right:0;width:50%}
#pbt .base,#pbt .look{pointer-events:none}
#pbt .base{position:absolute;width:132px;height:132px;margin:-66px 0 0 -66px;border-radius:50%;border:1px solid rgba(251,249,241,.55);
 background:radial-gradient(circle,rgba(10,10,10,.10),rgba(10,10,10,.34));box-shadow:0 0 0 1px rgba(10,10,10,.35) inset;opacity:0;transition:opacity .12s}
#pbt .knob{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;
 background:rgba(251,249,241,.82);box-shadow:0 2px 10px rgba(0,0,0,.45)}
#pbt .on{opacity:1}#pbt .ghost{opacity:.38}
#pbt .look{position:absolute;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;border:1px dashed rgba(251,249,241,.5);opacity:0}
#pbt .btns{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:calc(max(14px,env(safe-area-inset-bottom)) + 150px);display:flex;flex-direction:column;gap:10px;pointer-events:none}
#pbt .b{pointer-events:auto;touch-action:none;min-width:58px;height:58px;padding:0 10px;border-radius:29px;border:1px solid rgba(251,249,241,.6);
 background:rgba(10,10,10,.45);color:#FBF9F1;font:600 11px/58px Helvetica,Arial,sans-serif;letter-spacing:.18em;text-align:center;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
#pbt .b.down{background:rgba(251,249,241,.85);color:#0a0a0a}
#pbt .hint{position:absolute;left:50%;bottom:calc(max(12px,env(safe-area-inset-bottom)) + 4px);transform:translateX(-50%);color:rgba(251,249,241,.8);
 font:500 10px Helvetica,Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase;white-space:nowrap;text-shadow:0 1px 4px #000;transition:opacity .6s}
`;
  const cfg = { keys: false, runKey: 'ShiftLeft', top: '38%', deadzone: 0.14, radius: 56, lookScale: 1, onLook: null,
    buttons: [], hide: [], getPose: null, lookTarget: null, active: true, hint: 'Left thumb: move · Right thumb: look' };
  const api = { version: '1.1', ready: false, isTouch, move: { x: 0, y: 0, mag: 0 }, look: { dx: 0, dy: 0 },
    debug: { moveEvents: 0, lookEvents: 0, taps: 0, keys: [] }, held };
  let root, zl, zr, base, knob, lookRing, hintEl;
  const px = v => v + 'px';

  // ---- tap-through: a short, still touch acts on whatever is under the finger ----
  function tapThrough(x, y) {
    root.style.visibility = 'hidden';
    const el = document.elementFromPoint(x, y);
    root.style.visibility = '';
    if (!el) return;
    api.debug.taps++;
    const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window, button: 0 };
    const pid = 1000000 + api.debug.taps;
    try { el.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ pointerId: pid, pointerType: 'touch', isPrimary: true, buttons: 1 }, o))); } catch (e) {}
    el.dispatchEvent(new MouseEvent('mousedown', Object.assign({ buttons: 1 }, o)));
    try { el.dispatchEvent(new PointerEvent('pointerup', Object.assign({ pointerId: pid, pointerType: 'touch', isPrimary: true, buttons: 0 }, o))); } catch (e) {}
    el.dispatchEvent(new MouseEvent('mouseup', o));
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) el.focus();
    el.dispatchEvent(new MouseEvent('click', o));
  }

  // ---- movement stick ----
  let mv = null; // {id, ox, oy, sx, sy, t}
  function setMove(nx, ny) {
    const m = Math.min(1, Math.hypot(nx, ny));
    const s = m < cfg.deadzone ? 0 : (m - cfg.deadzone) / (1 - cfg.deadzone);
    const k = m > 0 ? s / m : 0;
    api.move.x = +(nx * k).toFixed(3); api.move.y = +(-ny * k).toFixed(3); api.move.mag = +s.toFixed(3);
    api.debug.moveEvents++;
    if (cfg.keys) {
      key('KeyW', api.move.y > 0.3); key('KeyS', api.move.y < -0.3);
      key('KeyD', api.move.x > 0.3); key('KeyA', api.move.x < -0.3);
      if (cfg.runKey) key(cfg.runKey, s > 0.92);
    }
  }
  function moveDown(e) {
    if (mv) return;
    const r = zl.getBoundingClientRect(), pad = 72;
    const ox = Math.min(Math.max(e.clientX, r.left + pad), r.right - pad);
    const oy = Math.min(Math.max(e.clientY, r.top + pad), r.bottom - pad);
    mv = { id: e.pointerId, ox, oy, sx: e.clientX, sy: e.clientY, t: performance.now(), far: 0 };
    try { zl.setPointerCapture(e.pointerId); } catch (_) {}
    base.style.left = px(ox); base.style.top = px(oy); base.classList.add('on'); base.classList.remove('ghost');
    moveTo(e);
    e.preventDefault();
  }
  function moveTo(e) {
    if (!mv || e.pointerId !== mv.id) return;
    let dx = e.clientX - mv.ox, dy = e.clientY - mv.oy;
    const d = Math.hypot(dx, dy), R = cfg.radius, maxD = R * 1.6;
    mv.far = Math.max(mv.far, Math.hypot(e.clientX - mv.sx, e.clientY - mv.sy));
    if (d > maxD) { // floating base follows the thumb
      mv.ox += dx * (1 - maxD / d); mv.oy += dy * (1 - maxD / d);
      base.style.left = px(mv.ox); base.style.top = px(mv.oy);
      dx = e.clientX - mv.ox; dy = e.clientY - mv.oy;
    }
    const dd = Math.hypot(dx, dy), c = dd > R ? R / dd : 1;
    knob.style.transform = `translate(${px(dx * c)},${px(dy * c)})`;
    setMove(dx / R, dy / R);
    e.preventDefault();
  }
  function moveUp(e) {
    if (!mv || e.pointerId !== mv.id) return;
    const tap = performance.now() - mv.t < 260 && mv.far < 10;
    mv = null; knob.style.transform = ''; base.classList.remove('on'); base.classList.add('ghost');
    setMove(0, 0);
    if (tap && e.type === 'pointerup') tapThrough(e.clientX, e.clientY);
  }

  // ---- look pad ----
  let lk = null; // {id, x, y, sx, sy, t, far}
  function lookDown(e) {
    if (lk) return;
    lk = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), far: 0 };
    try { zr.setPointerCapture(e.pointerId); } catch (_) {}
    lookRing.style.left = px(e.clientX); lookRing.style.top = px(e.clientY); lookRing.style.opacity = '1';
    e.preventDefault();
  }
  function lookTo(e) {
    if (!lk || e.pointerId !== lk.id) return;
    const dx = (e.clientX - lk.x) * cfg.lookScale, dy = (e.clientY - lk.y) * cfg.lookScale;
    lk.x = e.clientX; lk.y = e.clientY;
    lk.far = Math.max(lk.far, Math.hypot(e.clientX - lk.sx, e.clientY - lk.sy));
    lookRing.style.left = px(e.clientX); lookRing.style.top = px(e.clientY);
    if (dx || dy) {
      api.look.dx += dx; api.look.dy += dy; api.debug.lookEvents++;
      if (cfg.onLook) { try { cfg.onLook(dx, dy); } catch (err) { console.warn('[pb-touch] onLook', err); } }
    }
    e.preventDefault();
  }
  function lookUp(e) {
    if (!lk || e.pointerId !== lk.id) return;
    const tap = performance.now() - lk.t < 260 && lk.far < 10;
    lk = null; lookRing.style.opacity = '0';
    if (tap && e.type === 'pointerup') tapThrough(e.clientX, e.clientY);
  }

  // ---- buttons ----
  function makeButton(b) {
    const el = document.createElement('div');
    el.className = 'b'; el.textContent = b.label; el.setAttribute('role', 'button'); el.setAttribute('aria-label', b.label);
    let on = false;
    const press = e => {
      e.preventDefault(); e.stopPropagation();
      if (b.toggle) { on = !on; el.classList.toggle('down', on); if (b.key) key(b.key, on); if (b.onPress) b.onPress(on); return; }
      el.classList.add('down'); if (b.key) key(b.key, true); if (b.onPress) b.onPress(true);
    };
    const release = e => {
      if (b.toggle) return;
      el.classList.remove('down'); if (b.key) key(b.key, false); if (b.onRelease) b.onRelease();
    };
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release); el.addEventListener('pointercancel', release); el.addEventListener('pointerleave', release);
    return el;
  }

  function releaseAll() {
    if (mv) moveUp({ pointerId: mv.id, type: 'cancel' });
    if (lk) lookUp({ pointerId: lk.id, type: 'cancel' });
    [...held].forEach(c => key(c, false));
  }

  function build() {
    const st = document.createElement('style'); st.id = 'pbt-css';
    st.textContent = CSS + (cfg.hide.length ? cfg.hide.join(',') + '{display:none!important}' : '');
    document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'pbt';
    root.style.setProperty('--pbt-top', cfg.top);
    zl = document.createElement('div'); zl.className = 'z zl';
    zr = document.createElement('div'); zr.className = 'z zr';
    base = document.createElement('div'); base.className = 'base ghost';
    knob = document.createElement('div'); knob.className = 'knob'; base.appendChild(knob);
    lookRing = document.createElement('div'); lookRing.className = 'look';
    // v1.1: stick + look ring live in the full-screen fixed layer so client (viewport) coordinates land under the thumb.
    // v1.0 parented them to the zones (which start at 38% height), drawing the joystick 38% of the screen below the finger/offscreen.
    const btns = document.createElement('div'); btns.className = 'btns';
    cfg.buttons.forEach(b => btns.appendChild(makeButton(b)));
    hintEl = document.createElement('div'); hintEl.className = 'hint'; hintEl.textContent = cfg.hint;
    root.append(zl, zr, base, lookRing, btns, hintEl);
    document.body.appendChild(root);
    const placeGhost = () => { const r = zl.getBoundingClientRect(); if (!r.width) return; base.style.left = px(r.left + 96); base.style.top = px(r.bottom - 150); };
    root._placeGhost = placeGhost; placeGhost(); addEventListener('resize', () => { if (!mv) placeGhost(); });
    zl.addEventListener('pointerdown', moveDown, { passive: false });
    zl.addEventListener('pointermove', moveTo, { passive: false });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => zl.addEventListener(t, moveUp));
    zr.addEventListener('pointerdown', lookDown, { passive: false });
    zr.addEventListener('pointermove', lookTo, { passive: false });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => zr.addEventListener(t, lookUp));
    // iOS: stop the page from scrolling/zooming under the controls
    [zl, zr].forEach(z => z.addEventListener('touchstart', e => e.preventDefault(), { passive: false }));
    [zl, zr].forEach(z => z.addEventListener('touchmove', e => e.preventDefault(), { passive: false }));
    addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
    setTimeout(() => { if (hintEl) hintEl.style.opacity = '0'; }, 6000);
  }

  api.init = function (opts) {
    Object.assign(cfg, opts || {});
    api.getPose = cfg.getPose || null;
    if (!isTouch) { api.ready = true; return api; }
    const go = () => {
      if (!root) build();
      document.documentElement.style.overscrollBehavior = 'none';
      if (cfg.lookTarget) { const t = typeof cfg.lookTarget === 'string' ? document.querySelector(cfg.lookTarget) : cfg.lookTarget; if (t) t.style.touchAction = 'none'; }
      api.setActive(cfg.active !== false);
      api.ready = true;
    };
    document.body ? go() : addEventListener('DOMContentLoaded', go);
    return api;
  };
  api.setActive = function (on) { if (!root) return; root.hidden = !on; if (!on) releaseAll(); else if (!mv && root._placeGhost) root._placeGhost(); };
  api.takeLook = function () { const l = { dx: api.look.dx, dy: api.look.dy }; api.look.dx = 0; api.look.dy = 0; return l; };
  api.config = cfg;
  window.PBTouch = api;
})();
