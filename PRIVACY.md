# Privacy policy

**IzzI 5.1 YouTube Enhancements does not collect, transmit, or sell any
personal data.**

There is no server, no account, no analytics, no telemetry, and no install or
uninstall ping.

## What is stored, and where

Only your own settings: whether surround is on, the extra volume level, whether
fill screen is on, rear width, rear delay, rear low-pass, subwoofer crossover,
headroom, the per-channel dB trims, and any presets you save.

These live in `chrome.storage.sync`, which is Chrome's own sync tied to the
Google account you are already signed into. They follow you to your other
computers the same way your bookmarks do. They go to Google, not to us.

Nothing else is stored. No history, no viewing data, no identifiers.

## Audio and video

All processing happens locally, in the tab. Audio is routed through a Web Audio
graph built on the page's own video element; it is never recorded, never
buffered to disk, and never sent anywhere. Fill screen is nothing but a CSS
rule applied to that same element. Picture-in-picture hands the element to the
browser's own floating window. No frame and no sample ever leaves the machine.

## Network access

The extension makes **no network requests of any kind**. It declares one host
permission, `https://www.youtube.com/*`, and that is used solely to run its own
code inside the YouTube tab. It does not fetch anything, and it runs on no
other site.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Saving your settings and presets |
| `https://www.youtube.com/*` | Running the audio graph on the YouTube player, applying the fill-screen rule, opening picture-in-picture, and adding the toggles to the player's settings menu |

## Third parties

None. No SDKs, no trackers, no ad networks, no affiliate links.

## Source

The full source is public and MIT licensed:
https://github.com/IzzIsHOr/izzi-surround-51

## Contact

Open an issue on the repository above.
