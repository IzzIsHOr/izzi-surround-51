const DEFAULTS = {
  enabled: true, autoEnable: true,
  surr: 0.6, surrDelay: 15, surrLP: 7000, lfeLP: 120, preamp: -2,
  gFL: 0, gFR: 0, gC: 0, gLFE: 0, gRL: 0, gRR: 0
};

const badge = document.getElementById('saved');
let badgeTimer;

function flash(text) {
  badge.textContent = text || 'Saved';
  badge.classList.toggle('warn', text === 'Throttled');
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
      console.warn('[IzzI Surround 5.1] write failed:', chrome.runtime.lastError.message);
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
  if (area !== 'sync' || dragging) return;
  chrome.storage.sync.get(DEFAULTS, paint);
});

document.getElementById('reset').addEventListener('click', () => {
  clearTimeout(writeTimer);
  writeTimer = null;
  for (const k of Object.keys(pending)) delete pending[k];
  chrome.storage.sync.set(DEFAULTS, () => { paint(DEFAULTS); flash(); });
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
