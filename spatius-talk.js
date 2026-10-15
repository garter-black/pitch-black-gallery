// spatius-talk.js - conversation desk for the god profile dialog.
// Browser -> Worker proxy (umbra-spatius) -> Spatius console API. The Spatius API key never reaches
// this page: the only thing this module ever asks for is a short-lived Direct Mode session token.
// Honest states only: a desk either has a provisioned face and a verified service, or it says so.
(() => {
  const wrap = document.getElementById('god-profile');
  if (!wrap) return;
  let panel = null;

  const style = 'margin-top:14px;border-top:1px solid rgba(220,229,234,.25);padding-top:12px';
  const btnStyle = 'background:#101820;color:#dce5ea;border:1px solid rgba(220,229,234,.45);padding:7px 12px;letter-spacing:.12em;font-size:11px;cursor:pointer';
  const noteStyle = 'font-size:12px;color:#9fb0ba;margin-top:8px;line-height:1.5';

  function rosterFor(godName) {
    const s = window.WORLD_SETTINGS && window.WORLD_SETTINGS.settings;
    const roster = s && Array.isArray(s['npc.roster']) ? s['npc.roster'] : [];
    const key = String(godName || '').trim().toLowerCase();
    return roster.find(r => String(r.id || '').toLowerCase() === key) || null;
  }
  function spatiusCfg() {
    const s = window.WORLD_SETTINGS && window.WORLD_SETTINGS.settings;
    return (s && s['spatius']) || null;
  }

  function build() {
    panel = document.createElement('section');
    panel.id = 'spatius-talk';
    panel.setAttribute('style', style);
    // Static markup only; every dynamic value below is written with textContent (no XSS surface).
    panel.innerHTML =
      '<p class="eyebrow" style="margin:0 0 6px">CONVERSATION DESK / SPATIUS</p>' +
      '<p id="spatius-face" style="' + noteStyle + ';margin-top:0"></p>' +
      '<button id="spatius-check" style="' + btnStyle + '">CHECK CONVERSATION SERVICE</button>' +
      '<p id="spatius-state" style="' + noteStyle + '" role="status">Not checked yet.</p>' +
      '<p style="' + noteStyle + '">Voice conversations are not yet enabled on this desk. This panel verifies the ' +
      'conversation service live; it never fakes a reply.</p>';
    const target = wrap.querySelector('.profile-layout') || wrap;
    target.appendChild(panel);
    panel.querySelector('#spatius-check').addEventListener('click', check);
  }

  function faceLine() {
    const god = document.getElementById('profile-title').textContent;
    const row = rosterFor(god);
    const cfg = spatiusCfg();
    const host = document.getElementById('spatius-face');
    if (!row) { host.textContent = 'Library face: not mapped.'; return; }
    const slug = row.spatius_slug || null;
    const id = row.spatius_avatar_id || null;
    if (slug && id) host.textContent = 'Library face ' + slug.toUpperCase() + ' reserved for this desk (character ' + id.slice(0, 8) + '\u2026).';
    else if (id) host.textContent = 'Face reserved for this desk (character ' + id.slice(0, 8) + '\u2026).';
    else if (cfg && cfg.avatar_ids && cfg.avatar_ids.hecate_ii && row.id === 'hecate') host.textContent = 'Main character face provisioned (custom avatar).';
    else host.textContent = 'Library face: not yet provisioned for this desk.';
  }

  async function check() {
    const state = document.getElementById('spatius-state');
    const cfg = spatiusCfg();
    const button = document.getElementById('spatius-check');
    if (!cfg || !cfg.proxy) { state.textContent = 'Offline: no conversation proxy is configured for this build.'; return; }
    button.disabled = true; state.textContent = 'Checking the conversation service\u2026';
    const started = performance.now();
    try {
      const res = await fetch(cfg.proxy.replace(/\/$/, '') + '/session', { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10000) });
      const data = await res.json().catch(() => ({}));
      const ms = Math.round(performance.now() - started);
      if (res.ok && data.ok && data.sessionToken) {
        const t = new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
        state.textContent = 'Service VERIFIED ' + t + ' (' + ms + ' ms) \u2014 session token minted for region ' + (data.region || 'us-west') + '. Voice connection arrives with the avatar SDK pass.';
      } else {
        state.textContent = 'Offline: the conversation service answered with "' + (data.error || res.status) + '". The desk stays read-only.';
      }
    } catch (err) {
      state.textContent = 'Offline: ' + String((err && err.message) || err).slice(0, 120) + '. The desk stays read-only.';
    } finally { button.disabled = false; }
  }

  function refresh(attempt) {
    if (!panel) build();
    const title = document.getElementById('profile-title').textContent;
    if (!title && (attempt || 0) < 6) { setTimeout(() => refresh((attempt || 0) + 1), 60); return; }
    faceLine();
  }
  new MutationObserver(() => { if (wrap.open) refresh(); }).observe(wrap, { attributes: true, attributeFilter: ['open'] });
  window.addEventListener('world-settings-ready', () => { if (wrap.open) refresh(); });
  if (wrap.open) refresh();
})();
