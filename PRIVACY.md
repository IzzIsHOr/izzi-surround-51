# Privacy policy

**IzzI Surround 5.1 does not collect, transmit, or sell any personal data.**

There is no server, no account, no analytics, no telemetry, and no install or
uninstall ping.

## What is stored, and where

Only your own audio settings: whether the effect is on, rear width, rear delay,
rear low-pass, subwoofer crossover, headroom, the per-channel dB trims, and any
presets you save.

These live in `chrome.storage.sync`, which is Chrome's own sync tied to the
Google account you are already signed into. They follow you to your other
computers the same way your bookmarks do. They go to Google, not to us.

Nothing else is stored. No history, no viewing data, no identifiers.

## Audio

All processing happens locally, in the tab, using the Web Audio API. Audio is
never recorded, never buffered to disk, and never sent anywhere. The extension
builds a routing graph on the page's own video element and that is the whole of
it.

## Network access

The extension makes **no network requests of any kind**. It declares one host
permission, `https://www.youtube.com/*`, and that is used solely to run its own
code inside the YouTube tab. It does not fetch anything, and it runs on no
other site.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Saving your audio settings and presets |
| `https://www.youtube.com/*` | Running the audio graph on the YouTube player and adding the toggle to the player's settings menu |

## Third parties

None. No SDKs, no trackers, no ad networks, no affiliate links.

## Source

The full source is public and MIT licensed:
https://github.com/IzzIsHOr/izzi-surround-51

## Contact

Open an issue on the repository above.
