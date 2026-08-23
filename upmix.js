// IzzI Surround 5.1
// https://github.com/IzzIsHOr/izzi-surround-51
//
// Lifts YouTube audio to discrete 5.1 in the browser, using Web Audio.
// Nothing is installed system-wide and the format manifest is left alone.
//
// Dolby Surround / Hafler style matrix:
//   FL = L                      FR = R
//   C  = (L+R)/2                LFE = low-passed (L+R)/2
//   RL = (L-R)*width            RR = (R-L)*width   -> low-pass + delay
//
// The rears carry the DIFFERENCE, not a copy. Anything common to both channels
// (dialogue, bass, whatever sits centred in the mix) cancels out and never
// reaches the back; what survives is ambience and reverb. The delay is the Haas
// effect, which keeps the source localised up front.
//
// This runs in the MAIN world so it can reach the player's <video> element,
// which means no access to chrome.* -- settings arrive from bridge.js as events.

(function () {
  'use strict';

  const TAG = '[IzzI Surround 5.1]';
  const NS = 'http://www.w3.org/2000/svg';
  const LABEL = 'IzzI Surround 5.1';

  const S = {
    enabled: true, autoEnable: true,
    surr: 0.6, surrDelay: 15, surrLP: 7000, lfeLP: 120, preamp: -2,
    gFL: 0, gFR: 0, gC: 0, gLFE: 0, gRL: 0, gRR: 0
  };

  const dB = v => Math.pow(10, v / 20);

  let ctx, src, video, gBypass, gOut, N = null;
  let built = false;

  // ---------------------------- audio graph ----------------------------
  function build(v) {
    if (built) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const dst = ctx.destination;

      if (dst.maxChannelCount < 6) {
        console.warn(TAG, 'output device reports only', dst.maxChannelCount,
          'channels. Set the speakers to 5.1 in Windows.');
        return false;
      }

      src = ctx.createMediaElementSource(v);

      // Safety: createMediaElementSource diverts audio away from the default
      // output. The bypass is wired first, at unity, so any failure below
      // leaves sound playing instead of killing it.
      gBypass = ctx.createGain();
      gBypass.gain.value = 1;
      src.connect(gBypass);
      gBypass.connect(dst);

      dst.channelCount = 6;
      dst.channelCountMode = 'explicit';
      dst.channelInterpretation = 'discrete';

      const gain = val => { const n = ctx.createGain(); n.gain.value = val; return n; };
      const lowpass = f => { const n = ctx.createBiquadFilter(); n.type = 'lowpass'; n.frequency.value = f; return n; };

      const sp = ctx.createChannelSplitter(2);
      src.connect(sp);
      const mg = ctx.createChannelMerger(6);

      // (L+R)/2 feeds centre and LFE
      const sum = gain(0.5);
      sp.connect(sum, 0);
      sp.connect(sum, 1);

      // L-R and R-L feed the rears
      const negR = gain(-1); sp.connect(negR, 1);
      const mLR = gain(S.surr); sp.connect(mLR, 0); negR.connect(mLR);
      const negL = gain(-1); sp.connect(negL, 0);
      const mRL = gain(S.surr); sp.connect(mRL, 1); negL.connect(mRL);

      const rlF = lowpass(S.surrLP), rlD = ctx.createDelay(0.2);
      rlD.delayTime.value = S.surrDelay / 1000;
      mLR.connect(rlF); rlF.connect(rlD);

      const rrF = lowpass(S.surrLP), rrD = ctx.createDelay(0.2);
      rrD.delayTime.value = S.surrDelay / 1000;
      mRL.connect(rrF); rrF.connect(rrD);

      const lfeF = lowpass(S.lfeLP);
      sum.connect(lfeF);

      // per-channel trim, right before the merger
      const oFL = gain(dB(S.gFL)); sp.connect(oFL, 0);
      const oFR = gain(dB(S.gFR)); sp.connect(oFR, 1);
      const oC = gain(dB(S.gC)); sum.connect(oC);
      const oLFE = gain(dB(S.gLFE)); lfeF.connect(oLFE);
      const oRL = gain(dB(S.gRL)); rlD.connect(oRL);
      const oRR = gain(dB(S.gRR)); rrD.connect(oRR);

      oFL.connect(mg, 0, 0);
      oFR.connect(mg, 0, 1);
      oC.connect(mg, 0, 2);
      oLFE.connect(mg, 0, 3);
      oRL.connect(mg, 0, 4);
      oRR.connect(mg, 0, 5);

      gOut = ctx.createGain();
      // channelCount MUST be set to 6 explicitly. A GainNode starts at
      // channelCount = 2; with channelCountMode 'explicit' and that 2 left in
      // place, the node DOWNMIXES the six channels back to stereo and only
      // FL/FR reach the speakers.
      gOut.channelCount = 6;
      gOut.channelCountMode = 'explicit';
      gOut.channelInterpretation = 'discrete';
      gOut.gain.value = 0;
      mg.connect(gOut);
      gOut.connect(dst);

      N = { mLR, mRL, rlF, rrF, rlD, rrD, lfeF, oFL, oFR, oC, oLFE, oRL, oRR };
      built = true;
      applyAll();
      console.log(TAG, 'graph built, output on', dst.channelCount, 'channels');
      return true;
    } catch (e) {
      if (gBypass) gBypass.gain.value = 1;
      console.error(TAG, 'build failed:', e.message);
      return false;
    }
  }

  function applyAll() {
    if (!built) return;
    N.mLR.gain.value = S.surr;
    N.mRL.gain.value = S.surr;
    N.rlF.frequency.value = S.surrLP;
    N.rrF.frequency.value = S.surrLP;
    N.rlD.delayTime.value = S.surrDelay / 1000;
    N.rrD.delayTime.value = S.surrDelay / 1000;
    N.lfeF.frequency.value = S.lfeLP;
    N.oFL.gain.value = dB(S.gFL);
    N.oFR.gain.value = dB(S.gFR);
    N.oC.gain.value = dB(S.gC);
    N.oLFE.gain.value = dB(S.gLFE);
    N.oRL.gain.value = dB(S.gRL);
    N.oRR.gain.value = dB(S.gRR);
    gOut.gain.value = S.enabled ? dB(S.preamp) : 0;
    gBypass.gain.value = S.enabled ? 0 : 1;
    document.querySelectorAll('.izzi-surround-item').forEach(el =>
      el.setAttribute('aria-checked', S.enabled ? 'true' : 'false'));
  }

  function save(patch) {
    document.dispatchEvent(new CustomEvent('yt51-save', { detail: JSON.stringify(patch) }));
  }

  function setEnabled(v) {
    S.enabled = v;
    applyAll();
    save({ enabled: v });
    console.log(TAG, v ? 'on' : 'off');
  }

  // settings arrive from bridge.js
  document.addEventListener('yt51-settings', e => {
    let incoming;
    try { incoming = JSON.parse(e.detail); } catch (err) { return; }
    Object.assign(S, incoming);
    applyAll();
  });
  document.dispatchEvent(new CustomEvent('yt51-request'));

  // ------------------- toggle inside the player settings -------------------
  // No innerHTML anywhere: YouTube enforces Trusted Types and would throw.
  function el(tag, cls) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function icon() {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('height', '24');
    svg.setAttribute('width', '24');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', '#fff');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', 'M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-5.2l1.7 2.4-.8.6-2.1-3H8.4l-2.1 3-.8-.6L7.2 16H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm0 1v9h16V6H4zm8 1.6a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8zm0 1.2a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zM5.6 7.2h1.6v1.6H5.6V7.2zm11.2 0h1.6v1.6h-1.6V7.2z');
    svg.appendChild(p);
    return svg;
  }

  function injectMenuItem() {
    const menu = document.querySelector('.ytp-settings-menu .ytp-panel-menu');
    if (!menu || menu.querySelector('.izzi-surround-item')) return;

    const item = el('div', 'ytp-menuitem izzi-surround-item');
    item.setAttribute('role', 'menuitemcheckbox');
    item.setAttribute('aria-checked', S.enabled ? 'true' : 'false');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', LABEL);

    const ic = el('div', 'ytp-menuitem-icon');
    ic.appendChild(icon());
    const lb = el('div', 'ytp-menuitem-label');
    lb.textContent = LABEL;
    const ct = el('div', 'ytp-menuitem-content');
    ct.appendChild(el('div', 'ytp-menuitem-toggle-checkbox'));
    item.append(ic, lb, ct);
    item.addEventListener('click', e => {
      e.stopPropagation();
      setEnabled(!S.enabled);
    });

    // sit right under "Voice boost", falling back to "Stable Volume"
    const lab = e => (e.getAttribute('aria-label') || '');
    const kids = Array.prototype.slice.call(menu.children);
    const anchor = kids.find(e => /voice boost/i.test(lab(e)))
      || kids.find(e => /stable volume/i.test(lab(e)));
    if (anchor) menu.insertBefore(item, anchor.nextSibling);
    else menu.appendChild(item);
  }

  // ------------------------------ startup ------------------------------
  function attach() {
    const v = document.querySelector('video');
    if (v && v !== video) {
      video = v;
      if (build(v) && S.autoEnable && !S.enabled) setEnabled(true);
    }
    injectMenuItem();
  }

  const resume = () => { if (ctx && ctx.state === 'suspended') ctx.resume(); };
  ['click', 'keydown', 'play', 'pointerdown'].forEach(e =>
    document.addEventListener(e, resume, true));

  document.addEventListener('keydown', e => {
    if (e.altKey && e.code === 'Digit5') { e.preventDefault(); setEnabled(!S.enabled); }
  }, true);

  new MutationObserver(attach).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('yt-navigate-finish', () => setTimeout(attach, 600));
  setInterval(attach, 2000);
  attach();

  window.izziSurround = {
    status: () => ({
      enabled: S.enabled,
      built: built,
      ctx: ctx && ctx.state,
      destinationChannels: ctx && ctx.destination.channelCount,
      // if this is not 6, audio reaches the speakers downmixed
      outputChannels: gOut && gOut.channelCount,
      settings: Object.assign({}, S)
    }),
    set: patch => { Object.assign(S, patch); applyAll(); save(patch); return S; },
    on: setEnabled
  };

  console.log(TAG, 'ready');
})();
