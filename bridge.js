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
  chrome.storage.sync.set(patch);
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
