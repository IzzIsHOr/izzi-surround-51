// A stand-in for the chrome.* APIs the options page uses, so it can be opened
// in an ordinary browser and captured for the store. Not part of the extension.

(function () {
  const store = {};

  window.chrome = {
    runtime: {
      lastError: null,
      openOptionsPage() { console.warn('[shim] openOptionsPage'); }
    },
    // the popup asks which tab is in front, and talks to the content script
    tabs: {
      async query() {
        return [{ id: 1, url: 'https://www.youtube.com/watch?v=demo', title: 'YouTube' }];
      },
      async sendMessage() { return { ok: true, active: false }; }
    },
    storage: {
      sync: {
        // The page passes its DEFAULTS in, so echoing them back paints it
        // exactly as a fresh install looks, which is what a screenshot wants.
        // Both call styles have to work: options.js passes a callback, the
        // popup awaits the promise.
        get(defaults, cb) {
          const out = Object.assign({}, defaults, store);
          if (typeof cb === 'function') return cb(out);
          return Promise.resolve(out);
        },
        set(patch, cb) {
          Object.assign(store, patch);
          if (typeof cb === 'function') return cb();
          return Promise.resolve();
        }
      },
      onChanged: { addListener() {} }
    }
  };

  // Headless capture runs on virtual time, which does not let CSS transitions
  // settle, so a screenshot can catch a control mid-animation.
  if (new URLSearchParams(location.search).has("nofx")) {
    window.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent =
        "*,*::before,*::after{transition:none!important;animation:none!important}";
      document.head.appendChild(style);
    });
  }

  console.warn("[shim] chrome.* is faked. This is a plain page, not the extension.");
})();
