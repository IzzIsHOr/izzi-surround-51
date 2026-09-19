// Reset writes this whole object, so anything missing here survives a reset.
// boost and fill have to be listed even though this page has no control for
// them, or "Reset to defaults" leaves the volume at 5x and the crop switched on.
const DEFAULTS = {
  enabled: true, autoEnable: true,
  surr: 0.6, surrDelay: 15, surrLP: 7000, lfeLP: 120, preamp: -2,
  gFL: 0, gFR: 0, gC: 0, gLFE: 0, gRL: 0, gRR: 0,
  boost: 1, fill: false
};

// A preset captures the sound, not the on/off state -- loading one should never
// silently mute or unmute the extension.
// What a preset captures. Extra volume is part of how something sounds, so it
// belongs; fill screen is a picture setting and does not.
const SOUND_KEYS = ['surr', 'surrDelay', 'surrLP', 'lfeLP', 'preamp', 'boost',
                    'gFL', 'gFR', 'gC', 'gLFE', 'gRL', 'gRR'];

const BUILTINS = {
  Balanced: { surr: 0.6, surrDelay: 15, surrLP: 7000, lfeLP: 120, preamp: -2,
              gFL: 0, gFR: 0, gC: 0, gLFE: 0, gRL: 0, gRR: 0 },
  Subtle:   { surr: 0.35, surrDelay: 12, surrLP: 5500, lfeLP: 100, preamp: -1,
              gFL: 0, gFR: 0, gC: 0, gLFE: 0, gRL: 0, gRR: 0 },
  Cinema:   { surr: 0.85, surrDelay: 20, surrLP: 9000, lfeLP: 140, preamp: -3,
              gFL: 0, gFR: 0, gC: 2, gLFE: 2, gRL: 0, gRR: 0 },
  Music:    { surr: 0.5, surrDelay: 10, surrLP: 12000, lfeLP: 90, preamp: -2,
              gFL: 0, gFR: 0, gC: -1.5, gLFE: 0, gRL: 0, gRR: 0 }
};

const badge = document.getElementById('saved');
let badgeTimer;

function flash(text, warn) {
  badge.textContent = text || 'Saved';
  badge.classList.toggle('warn', !!warn || text === 'Throttled');
  badge.classList.add('on');
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => badge.classList.remove('on'), 1200);
}

// chrome.storage.sync allows roughly 120 writes per minute. Dragging a slider
// fires "input" continuously, so writing on every event blows the quota and
// further writes fail silently -- controls then look dead while the toggles,
// which are written once per click, keep working. Writes are coalesced here and
// the final value is always committed on "change".
const pending = {};
let writeTimer = null;

function commit() {
  writeTimer = null;
  const patch = Object.assign({}, pending);
  for (const k of Object.keys(pending)) delete pending[k];
  if (!Object.keys(patch).length) return;

  chrome.storage.sync.set(patch, () => {
    if (chrome.runtime.lastError) {
      console.warn('[IzzI 5.1 YouTube] write failed:', chrome.runtime.lastError.message);
      flash('Throttled');
    } else {
      flash();
    }
  });
}

function save(patch, immediate) {
  Object.assign(pending, patch);
  if (immediate) {
    clearTimeout(writeTimer);
    commit();
    return;
  }
  if (!writeTimer) writeTimer = setTimeout(commit, 300);
}

// ---------- sliders ----------
let dragging = false;

const sliders = [...document.querySelectorAll('.row[data-key]')].map(row => {
  const key = row.dataset.key;
  const input = row.querySelector('input[type=range]');
  const out = row.querySelector('output');
  const unit = row.dataset.unit || '';

  input.min = row.dataset.min;
  input.max = row.dataset.max;
  input.step = row.dataset.step;

  const render = v => {
    const n = Number(v);
    // show a sign on dB values so a boost reads as a boost
    out.textContent = (unit.trim() === 'dB' && n > 0 ? '+' + n : String(n)) + unit;
  };

  input.addEventListener('pointerdown', () => { dragging = true; });
  input.addEventListener('input', () => {
    dragging = true;
    render(input.value);
    save({ [key]: Number(input.value) });
  });
  // fires when the drag ends, so the final value always reaches storage
  input.addEventListener('change', () => {
    dragging = false;
    save({ [key]: Number(input.value) }, true);
  });

  return { key, input, render };
});

// ---------- toggles ----------
const toggles = ['enabled', 'autoEnable'].map(key => {
  const input = document.getElementById(key);
  input.addEventListener('change', () => save({ [key]: input.checked }, true));
  return { key, input };
});

function paint(values) {
  sliders.forEach(s => { s.input.value = values[s.key]; s.render(values[s.key]); });
  toggles.forEach(t => { t.input.checked = !!values[t.key]; });
}

chrome.storage.sync.get(DEFAULTS, paint);

// keep in sync with the player toggle, but never yank a slider out from under
// the cursor while it is being dragged
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (!dragging) chrome.storage.sync.get(DEFAULTS, paint);
  if (changes.presets) renderPresets(changes.presets.newValue || {});
});

document.getElementById('reset').addEventListener('click', () => {
  clearTimeout(writeTimer);
  writeTimer = null;
  for (const k of Object.keys(pending)) delete pending[k];
  chrome.storage.sync.set(DEFAULTS, () => { paint(DEFAULTS); flash('Reset'); });
});

// ---------- presets ----------
function applyPreset(values) {
  const patch = {};
  SOUND_KEYS.forEach(k => { if (k in values) patch[k] = values[k]; });
  clearTimeout(writeTimer);
  writeTimer = null;
  chrome.storage.sync.set(patch, () => {
    chrome.storage.sync.get(DEFAULTS, paint);
    flash('Loaded');
  });
}

function currentSound() {
  const snap = {};
  sliders.forEach(s => { if (SOUND_KEYS.includes(s.key)) snap[s.key] = Number(s.input.value); });
  return snap;
}

function describe(v) {
  return `width ${v.surr} · rear ${v.surrDelay} ms / ${(v.surrLP / 1000).toFixed(1)} kHz · sub ${v.lfeLP} Hz`;
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

// built-in quick presets
const builtinBox = document.getElementById('builtins');
Object.keys(BUILTINS).forEach(name => {
  const b = el('button', 'chip-btn', name);
  b.addEventListener('click', () => applyPreset(BUILTINS[name]));
  builtinBox.appendChild(b);
});

const listBox = document.getElementById('presetList');

function renderPresets(presets) {
  listBox.textContent = '';
  const names = Object.keys(presets).sort((a, b) => a.localeCompare(b));

  if (!names.length) {
    listBox.appendChild(el('div', 'empty', 'No saved presets yet.'));
    return;
  }

  names.forEach(name => {
    const row = el('div', 'preset');
    row.appendChild(el('span', 'ico', ''));
    row.firstChild.dataset.ico = 'preset';

    const txt = el('div');
    txt.appendChild(el('div', 'nm', name));
    txt.appendChild(el('div', 'meta', describe(presets[name])));
    row.appendChild(txt);

    const actions = el('div', 'preset-actions');
    const load = el('button', 'link-btn', 'Load');
    load.addEventListener('click', () => applyPreset(presets[name]));
    const del = el('button', 'link-btn danger', 'Delete');
    del.addEventListener('click', () => {
      chrome.storage.sync.get({ presets: {} }, data => {
        delete data.presets[name];
        chrome.storage.sync.set({ presets: data.presets }, () => {
          renderPresets(data.presets);
          flash('Deleted');
        });
      });
    });
    actions.append(load, del);
    row.appendChild(actions);

    listBox.appendChild(row);
  });
}

const nameInput = document.getElementById('presetName');

function savePreset() {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }

  chrome.storage.sync.get({ presets: {} }, data => {
    const existed = name in data.presets;
    data.presets[name] = currentSound();
    chrome.storage.sync.set({ presets: data.presets }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[IzzI 5.1 YouTube] preset save failed:', chrome.runtime.lastError.message);
        flash('Throttled');
        return;
      }
      nameInput.value = '';
      renderPresets(data.presets);
      flash(existed ? 'Updated' : 'Saved');
    });
  });
}

document.getElementById('savePreset').addEventListener('click', savePreset);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') savePreset(); });

chrome.storage.sync.get({ presets: {} }, data => renderPresets(data.presets));

// ---------- export / import ----------
// The same file IzzI 5.1 for Windows reads and writes: these key names, inside
// { app, format, presets }. Windows adds "fade", which is simply not used here,
// and has no "boost", which falls back to 1x. Anything in a file is untrusted:
// only the sound keys are kept, each a finite number clamped to the range the
// content script accepts (bridge.js SCHEMA), and a preset without "surr" is not
// taken for a preset at all.
const RANGES = {
  surr: [0, 1.5], surrDelay: [0, 60], surrLP: [500, 20000], lfeLP: [40, 250], preamp: [-24, 6], boost: [1, 5],
  gFL: [-24, 12], gFR: [-24, 12], gC: [-24, 12], gLFE: [-24, 12], gRL: [-24, 12], gRR: [-24, 12]
};

function cleanPreset(p) {
  if (!p || typeof p !== 'object' || typeof p.surr !== 'number') return null;
  const out = {};
  for (const [k, [lo, hi]] of Object.entries(RANGES)) {
    const fallback = k === 'boost' ? 1 : BUILTINS.Balanced[k];
    const v = Number(k in p ? p[k] : fallback);
    if (!Number.isFinite(v)) return null;
    out[k] = Math.min(hi, Math.max(lo, v));
  }
  return out;
}

document.getElementById('exportPresets').addEventListener('click', () => {
  chrome.storage.sync.get({ presets: {} }, data => {
    if (!Object.keys(data.presets).length) { flash('Save one first', true); return; }
    const file = { app: 'IzzI 5.1', format: 1, presets: data.presets };
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2) + '\n'], { type: 'application/json' }));
    const a = el('a');
    a.href = url;
    a.download = 'IzzI 5.1 presets.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash('Exported');
  });
});

const importFile = document.getElementById('importFile');
document.getElementById('importPresets').addEventListener('click', () => importFile.click());
importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  importFile.value = '';
  if (!file) return;
  if (file.size > 256 * 1024) { flash('Not a preset file', true); return; }
  file.text().then(text => {
    let root;
    try { root = JSON.parse(text); } catch (e) { flash('Not a preset file', true); return; }
    // an export file, or the bare { name: preset } map this page keeps in storage
    const map = root && typeof root.presets === 'object' ? root.presets : root;
    const found = {};
    if (map && typeof map === 'object') {
      for (const [name, p] of Object.entries(map)) {
        const n = String(name).replace(/[ -]/g, '').trim().slice(0, 32);
        const clean = cleanPreset(p);
        if (n && clean && !(n in BUILTINS)) found[n] = clean;
      }
    }
    const count = Object.keys(found).length;
    if (!count) { flash('No presets in it', true); return; }
    chrome.storage.sync.get({ presets: {} }, data => {
      const merged = Object.assign({}, data.presets, found);
      chrome.storage.sync.set({ presets: merged }, () => {
        // sync storage holds about 8 KB per item: some forty presets
        if (chrome.runtime.lastError) { flash('Too many presets', true); return; }
        renderPresets(merged);
        flash(count === 1 ? 'Imported 1' : `Imported ${count}`);
      });
    });
  });
});

// ---------- speaker configuration check ----------
// The output device is the same one YouTube tabs render to, so probing it here
// tells the user straight away whether 5.1 is even reachable.
(function checkOutput() {
  const dot = document.getElementById('dot');
  const text = document.getElementById('statusText');
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const max = ctx.destination.maxChannelCount;
    ctx.close();

    if (max >= 6) {
      dot.className = 'dot ok';
      text.textContent = `Output device reports ${max} channels — 5.1 is available.`;
    } else {
      dot.className = 'dot bad';
      text.textContent = `Output device reports only ${max} channel${max === 1 ? '' : 's'}. `
        + 'Set your speakers to 5.1 in Windows: Sound Control Panel → your device → Configure → 5.1 Surround.';
    }
  } catch (e) {
    dot.className = 'dot bad';
    text.textContent = 'Could not query the audio output device.';
  }
})();
