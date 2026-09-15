// The toolbar panel.
//
// Everything except picture-in-picture is state: the popup writes to
// chrome.storage.sync, bridge.js notices and pushes the new values into the
// page, so a change lands in every open YouTube tab at once.
//
// Picture-in-picture is an action rather than a setting, and the browser only
// grants it in response to a real gesture in the page, so it is relayed to the
// content script and the answer reported honestly if it is refused.

const DEFAULTS = {
  enabled: true, autoEnable: true,
  surr: 0.6, surrDelay: 15, surrLP: 7000, lfeLP: 120, preamp: -2,
  gFL: 0, gFR: 0, gC: 0, gLFE: 0, gRL: 0, gRR: 0,
  boost: 1, fill: false
};

const $ = (id) => document.getElementById(id);
const boost = $("boost");
const boostVal = $("boostVal");
const note = $("note");

let tabId = null;

function paintBoost(v) {
  boost.value = v;
  boost.style.setProperty("--fill", ((v - 1) / 4) * 100 + "%");
  boostVal.textContent = Number(v).toFixed(1) + "×";
  $("boostHint").textContent =
    v > 2.5 ? "Loud. A limiter keeps peaks from clipping" : "Past YouTube's own ceiling";
}

function save(patch) {
  chrome.storage.sync.set(patch);
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function init() {
  const tab = await activeTab();
  const onYouTube = tab && /^https:\/\/www\.youtube\.com\//.test(tab.url || "");
  tabId = onYouTube ? tab.id : null;

  $("where").textContent = onYouTube
    ? "Controlling this tab"
    : "Open a YouTube tab to use these";
  document.body.classList.toggle("inactive", !onYouTube);

  const s = await chrome.storage.sync.get(DEFAULTS);
  paintBoost(s.boost);
  $("enabled").checked = !!s.enabled;
  $("fill").checked = !!s.fill;
}

// Writing on every input event would hit the sync write rate limit, which is
// about 120 a minute, and the failures are silent. Coalesce instead.
let pending = null;
boost.addEventListener("input", (e) => {
  const v = Number(e.target.value);
  paintBoost(v);
  clearTimeout(pending);
  pending = setTimeout(() => save({ boost: v }), 150);
});

$("enabled").addEventListener("change", (e) => save({ enabled: e.target.checked }));
$("fill").addEventListener("change", (e) => save({ fill: e.target.checked }));

$("options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

$("pip").addEventListener("click", async () => {
  if (!tabId) return;
  const btn = $("pip");
  btn.disabled = true;
  try {
    const r = await chrome.tabs.sendMessage(tabId, { type: "yt51-command", command: "pip" });
    if (r && r.ok) {
      btn.textContent = r.active ? "Close" : "Open";
      btn.classList.toggle("on", !!r.active);
      note.hidden = true;
    } else {
      note.className = "note warn";
      note.hidden = false;
      note.textContent = (r && r.reason) || "Picture-in-picture was refused.";
    }
  } catch {
    note.className = "note warn";
    note.hidden = false;
    note.textContent = "Reload the YouTube tab, then try again.";
  }
  btn.disabled = false;
});

init();
