# Chrome Web Store submission

Copy-paste material for the developer dashboard. Upload `izzi-surround-51-v3.2.0.zip`.

> Publishing requires a Chrome Web Store developer account (one-time $5 registration fee)
> and has to be done from the dashboard by the account owner:
> https://chrome.google.com/webstore/devconsole

---

## Name

```
IzzI Surround 5.1
```

## Short description (132 characters max)

```
Real 5.1 surround for YouTube, right in the browser. No drivers, no virtual devices, nothing installed on your system.
```

## Detailed description

```
IzzI Surround 5.1 turns YouTube's stereo audio into discrete 5.1 surround, using nothing but
your browser.

No Equalizer APO. No virtual audio device. No separate media player. It runs inside the YouTube
tab, so your games and every other application are left completely untouched.

HOW IT SOUNDS

Rather than copying the front channels to the back — the old trick that just makes everything
louder — it uses a Dolby Surround / Hafler style matrix:

  • Centre carries the sum of left and right, anchoring dialogue and vocals
  • The rears carry the difference, so anything centred in the mix cancels out and only
    ambience and reverb reach the back
  • The subwoofer gets a low-passed feed
  • A 15 ms Haas delay on the rears keeps the source localised up front

The result is a genuine sense of space, not the same sound coming from six directions.

CONTROLS

  • Toggle from the player: settings gear, right under Voice boost
  • Keyboard shortcut: Alt+5
  • Options page: rear width, rear delay, rear low-pass, subwoofer crossover, headroom,
    and individual dB trim for all six channels

It turns itself on and remembers your settings.

REQUIREMENTS

Your speakers must be configured as 5.1 in Windows (Sound Control Panel, your device,
Configure, 5.1 Surround). The options page checks this and tells you plainly if the output
device reports fewer than six channels.

PRIVACY

No data collection, no network requests, no tracking, no analytics. All audio processing
happens locally in the tab. The storage permission holds nothing but your own settings.

Open source, MIT licensed: https://github.com/IzzIsHOr/izzi-surround-51
```

## Category

`Accessibility` — or `Entertainment`. Accessibility is the better fit: dialogue clarity on the
centre channel is a real accessibility benefit.

## Language

English

---

## Permission justifications

The dashboard asks for one per permission. These have to be specific or review pushes back.

**`storage`**

```
Stores the user's own audio settings (enable state, surround width, filter frequencies,
per-channel gain trims) so they persist between sessions and sync across the user's devices.
No other data is stored.
```

**Host permission `https://www.youtube.com/*`**

```
The extension processes audio from the YouTube player. It needs to run a content script on
youtube.com to access the player's video element via the Web Audio API and to add a toggle to
the player's settings menu. It runs on no other site.
```

**Remote code**

```
No. All code is contained in the package.
```

**Data usage disclosures** — tick nothing. Then confirm all three:

- Not being sold to third parties
- Not being used or transferred for purposes unrelated to the item's single purpose
- Not being used or transferred to determine creditworthiness or for lending purposes

## Single purpose statement

```
Upmix YouTube's stereo audio to discrete 5.1 surround for playback on 5.1 speaker systems.
```

---

## Assets

- **Store icon**: `icons/icon128.png` already covers it.
- **Screenshot**: `dist/shots/01-options.png`, 1280×800, the options page.

  Regenerate it by running the dev server and capturing with headless Chrome:

  ```
  node dev/server.cjs
  "C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu ^
    --hide-scrollbars --window-size=1280,800 --virtual-time-budget=5000 ^
    --screenshot=dist/shots/01-options.png "http://localhost:5178/dev-preview.html?nofx=1"
  ```

  `dev/` and `dev-preview.html` are not part of the extension; the shim only fakes the
  chrome.* calls the options page makes so it can render outside the browser extension
  context.

- **Still worth adding by hand**: a shot of the YouTube player with the toggle in place,
  under the settings gear. That one cannot be captured headlessly because it needs a real
  YouTube page with the extension loaded. Take it with a normal screenshot tool at
  1280×800.
- **Small promo tile** (optional but recommended): 440×280 PNG.

`icons/icon128.png` already covers the store icon requirement.

## Review notes

First-time submissions typically take a few days. Extensions that request host permissions and
inject content scripts get a closer look; the single purpose statement and the youtube.com-only
host permission are what keep it straightforward.
