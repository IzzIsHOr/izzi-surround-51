// Bridge between chrome.storage and the MAIN-world script.
//
// upmix.js has to run in the MAIN world so it can reach the YouTube player's
// <video> element. MAIN-world scripts get no access to chrome.*, so they cannot
// read settings themselves. This file runs in the isolated world, where
// chrome.storage exists, and passes values across using CustomEvents.

const DEFAULTS = {
  enabled: true, autoEnable: true,
  surr: 0.6, surrDelay: 15, surrLP: 7000, lfeLP: 120, preamp: -2,
  gFL: 0, gFR: 0, gC: 0, gLFE: 0, gRL: 0, gRR: 0,
  boost: 1, fill: false
};


// What a settings patch is allowed to contain.
//
// Both ends of the bridge are reachable from the page: any script on
// youtube.com can dispatch a yt51-save or a yt51-settings CustomEvent, because
// CustomEvents on `document` are not private to the extension. Unchecked, that
// let a page write arbitrary keys into chrome.storage.sync -- filling the
// 100 KB quota so the user's real settings stop saving -- and push arbitrary
// numbers straight into the audio nodes, where a preamp of +60 dB is a genuine
// way to hurt someone wearing headphones.
//
// So nothing crosses without being checked against this. Unknown keys are
// dropped, numbers are clamped, booleans are coerced.
const SCHEMA = {
  enabled:    { type: 'bool' },
  autoEnable: { type: 'bool' },
  fill:       { type: 'bool' },
  surr:       { type: 'num', min: 0,    max: 1.5 },
  surrDelay:  { type: 'num', min: 0,    max: 60 },
  surrLP:     { type: 'num', min: 500,  max: 20000 },
  lfeLP:      { type: 'num', min: 40,   max: 250 },
  preamp:     { type: 'num', min: -24,  max: 6 },
  boost:      { type: 'num', min: 1,    max: 5 },
  gFL:        { type: 'num', min: -24,  max: 12 },
  gFR:        { type: 'num', min: -24,  max: 12 },
  gC:         { type: 'num', min: -24,  max: 12 },
  gLFE:       { type: 'num', min: -24,  max: 12 },
  gRL:        { type: 'num', min: -24,  max: 12 },
  gRR:        { type: 'num', min: -24,  max: 12 }
};

function sanitize(patch) {
  const out = {};
  if (!patch || typeof patch !== 'object') return out;
  for (const key of Object.keys(SCHEMA)) {
    if (!(key in patch)) continue;
    const rule = SCHEMA[key];
    const v = patch[key];
    if (rule.type === 'bool') {
      out[key] = Boolean(v);
    } else {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      out[key] = Math.min(rule.max, Math.max(rule.min, n));
    }
  }
  return out;
}

function push(settings) {
  document.dispatchEvent(new CustomEvent('yt51-settings', { detail: JSON.stringify(settings) }));
}

function load() {
  chrome.storage.sync.get(DEFAULTS, push);
}

// MAIN asks for settings on startup -- it may initialise before we do
document.addEventListener('yt51-request', load);

// MAIN saves, e.g. a toggle in the player settings menu
document.addEventListener('yt51-save', e => {
  let patch;
  try { patch = JSON.parse(e.detail); } catch (err) { return; }
  const clean = sanitize(patch);
  if (Object.keys(clean).length) chrome.storage.sync.set(clean);
});

// changes from the options page or the popup land in open tabs immediately
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') load();
});

// The popup cannot reach the MAIN world, and picture-in-picture is an action
// rather than a stored setting, so it is relayed as a command and the result
// handed back.
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!msg || msg.type !== 'yt51-command') return;

  let answered = false;
  const finish = (r) => {
    if (answered) return;
    answered = true;
    document.removeEventListener('yt51-command-result', onResult);
    reply(r);
  };
  const onResult = (e) => {
    let r;
    try { r = JSON.parse(e.detail); } catch (err) { r = { ok: false, reason: 'bad reply' }; }
    finish(r);
  };

  document.addEventListener('yt51-command-result', onResult);
  document.dispatchEvent(new CustomEvent('yt51-command', { detail: msg.command }));

  // never leave the popup waiting forever
  setTimeout(() => finish({ ok: false, reason: 'the page did not answer' }), 2500);

  return true; // the reply comes later
});

load();
