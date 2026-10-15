// settings-loader.js - the world reads its settings only from ./settings.json.
// Exported from PostgreSQL `worlds.site_settings` (cortex DB) by scripts/worlds_settings.py.
// No hard-coded world settings in JS: identity, roster, main character and Spatius config
// arrive from that file. If it is missing the world keeps running with built-in copy.
(async () => {
  const state = { status: 'loading', settings: null, error: null, rosterCount: 0, mainCharacter: null, spatius: null };
  window.WORLD_SETTINGS = state;
  try {
    const res = await fetch('./settings.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const s = await res.json();
    state.settings = s;
    state.status = 'ready';
    const roster = s['npc.roster'];
    state.rosterCount = Array.isArray(roster) ? roster.length : 0;
    state.mainCharacter = (s['main_character'] || {}).id || null;
    state.spatius = s['spatius'] || null;
    const id = s['site.identity'] || {};
    document.documentElement.dataset.settings = 'ready';
    window.dispatchEvent(new CustomEvent('world-settings-ready', { detail: { domain: id.domain, rosterCount: state.rosterCount, spatius: !!state.spatius } }));
  } catch (err) {
    state.status = 'error';
    state.error = String((err && err.message) || err);
    document.documentElement.dataset.settings = 'error';
    console.warn('settings.json unavailable; the world continues with built-in copy.', err);
  }
})();
