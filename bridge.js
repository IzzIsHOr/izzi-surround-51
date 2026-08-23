// Bridge between chrome.storage and the MAIN-world script.
//
// upmix.js has to run in the MAIN world so it can reach the YouTube player's
// <video> element. MAIN-world scripts get no access to chrome.*, so they cannot
// read settings themselves. This file runs in the isolated world, where
// chrome.storage exists, and passes values across using CustomEvents.

const DEFAULTS = {
  enabled: true, autoEnable: true,
  surr: 0.6, surrDelay: 15, surrLP: 7000, lfeLP: 120, preamp: -2,
  gFL: 0, gFR: 0, gC: 0, gLFE: 0, gRL: 0, gRR: 0
};

function push(settings) {
  document.dispatchEvent(new CustomEvent('yt51-settings', { detail: JSON.stringify(settings) }));
}

function load() {
  chrome.storage.sync.get(DEFAULTS, push);
}

// MAIN asks for settings on startup -- it may initialise before we do
document.addEventListener('yt51-request', load);

// MAIN saves, e.g. the toggle in the player settings menu
document.addEventListener('yt51-save', e => {
  let patch;
  try { patch = JSON.parse(e.detail); } catch (err) { return; }
  chrome.storage.sync.set(patch);
});

// changes made on the options page land in open tabs immediately
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') load();
});

load();
