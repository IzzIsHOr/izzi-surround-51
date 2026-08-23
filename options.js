const DEFAULTS = {
  enabled: true, autoEnable: true,
  surr: 0.6, surrDelay: 15, surrLP: 7000, lfeLP: 120, preamp: -2,
  gFL: 0, gFR: 0, gC: 0, gLFE: 0, gRL: 0, gRR: 0
};

const badge = document.getElementById('saved');
let badgeTimer;

function flash() {
  badge.classList.add('on');
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => badge.classList.remove('on'), 1200);
}

function save(patch) {
  chrome.storage.sync.set(patch, flash);
}

// ---------- sliders ----------
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

  input.addEventListener('input', () => {
    render(input.value);
    save({ [key]: Number(input.value) });
  });

  return { key, input, render };
});

// ---------- toggles ----------
const toggles = ['enabled', 'autoEnable'].map(key => {
  const input = document.getElementById(key);
  input.addEventListener('change', () => save({ [key]: input.checked }));
  return { key, input };
});

function paint(values) {
  sliders.forEach(s => { s.input.value = values[s.key]; s.render(values[s.key]); });
  toggles.forEach(t => { t.input.checked = !!values[t.key]; });
}

chrome.storage.sync.get(DEFAULTS, paint);

// keep in sync with the player toggle while this page is open
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') chrome.storage.sync.get(DEFAULTS, paint);
});

document.getElementById('reset').addEventListener('click', () => {
  chrome.storage.sync.set(DEFAULTS, () => { paint(DEFAULTS); flash(); });
});

// ---------- speaker configuration check ----------
// The output device is the same one YouTube tabs render to, so probing it here
// tells the user straight away whether 5.1 is even reachable.
(function checkOutput() {
  const dot = document.getElementById('dot');
  const text = document.getElementById('statusText');
  let ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
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
