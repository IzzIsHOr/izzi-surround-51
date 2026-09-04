// A stand-in for the chrome.* APIs the options page uses, so it can be opened
// in an ordinary browser and captured for the store. Not part of the extension.

(function () {
  const store = {};

  window.chrome = {
    runtime: { lastError: null },
    storage: {
      sync: {
        // The page passes its DEFAULTS in, so echoing them back paints the page
        // exactly as a fresh install looks, which is what a screenshot wants.
        get(defaults, cb) {
          cb(Object.assign({}, defaults, store));
        },
        set(patch, cb) {
          Object.assign(store, patch);
          if (cb) cb();
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
