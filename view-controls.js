// Camera preferences only. No identity, room, movement capability or agent state.
// Storage may be unavailable in private/restricted browsing; controls still work.
// https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
export const VIEW_PREFERENCE_KEY = 'black-garter.view.v1';
export const DEFAULT_VIEW = Object.freeze({ mode: 'third-person', shoulder: 'right' });

function normalize(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return { ...DEFAULT_VIEW };
  return {
    mode: value.mode === 'first-person' ? 'first-person' : 'third-person',
    shoulder: value.shoulder === 'left' ? 'left' : 'right',
  };
}

export function readViewPreferences(storageProvider = () => globalThis.localStorage) {
  try { return normalize(JSON.parse(storageProvider()?.getItem(VIEW_PREFERENCE_KEY) ?? 'null')); }
  catch { return { ...DEFAULT_VIEW }; }
}

export function saveViewPreferences(preferences, storageProvider = () => globalThis.localStorage) {
  try {
    const storage = storageProvider();
    if (!storage) return false;
    const value = normalize({ version: 1, mode: preferences.mode, shoulder: preferences.shoulder });
    storage.setItem(VIEW_PREFERENCE_KEY, JSON.stringify({ version: 1, ...value }));
    return true;
  } catch { return false; }
}

// Ignore held keys, text entry and normal browser shortcuts such as Ctrl/Cmd+C.
// closest() also covers a span/SVG inside a focused interactive element.
export function cameraShortcut(event, { started = false, dialogOpen = false } = {}) {
  if (!started || dialogOpen || event.defaultPrevented || event.repeat || event.isComposing
      || event.ctrlKey || event.metaKey || event.altKey) return null;
  if (event.target?.isContentEditable || event.target?.closest?.('input,select,textarea,button,a,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="slider"],[role="button"]')) return null;
  return event.code === 'KeyV' ? 'view' : event.code === 'KeyC' ? 'shoulder' : null;
}
