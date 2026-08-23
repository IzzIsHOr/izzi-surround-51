<img src="icons/icon128.png" width="72" align="right" alt="">

# IzzI Surround 5.1

Discrete **5.1 upmixing for YouTube**, running entirely in the browser.

Nothing is installed system-wide — no Equalizer APO, no virtual audio device, no separate
player. It lives inside the YouTube tab, so games and every other application are left
completely untouched.

This exists because nothing like it did. Firefox has *Stereo to 7.1 Surround Upmixer*.
Chrome had nothing.

---

## How it works

Chrome can output **six discrete channels** from a tab. With speakers configured as 5.1 in
Windows, `AudioDestinationNode.maxChannelCount` reports `6`. The widely repeated claim that
"Chrome only does stereo" is out of date.

The extension builds a Web Audio graph on the player's `<video>` element and spreads the
stereo signal across those six channels using a **Dolby Surround / Hafler style matrix**:

```
FL  = L                        FR  = R
C   = (L+R)/2                  LFE = low-passed (L+R)/2
RL  = (L−R) × width            RR  = (R−L) × width      → low-pass + Haas delay
```

The rears carry the **difference**, not a copy. Anything common to both channels — dialogue,
bass, whatever sits centred in the mix — cancels out and never reaches the back. What survives
is ambience and reverb. The delay is the Haas effect: the brain keeps localising the source up
front while the rears supply the sense of a room.

Measured on *Big Buck Bunny*, with an analyser on every branch, the rears sit between
**−11.5 dB** (centred content) and **−0.6 dB** (wide ambience) relative to the front channels.
The ratio tracks how decorrelated the source is, which is exactly what a matrix should do —
a plain copy of L/R would sit at a fixed offset.

## Install

1. Download or clone this repository
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. **Load unpacked** → select the folder

It turns itself on. The state is remembered between sessions.

## Using it

- **In the player**: settings gear → **IzzI Surround 5.1**, right under *Voice boost*
- **Shortcut**: <kbd>Alt</kbd>+<kbd>5</kbd>
- **Settings**: right-click the toolbar icon → *Options*

### What you can tune

| Setting | What it does |
| --- | --- |
| Rear width | How much difference signal reaches the back. 0.4 subtle, 0.8 aggressive. |
| Rear delay | Haas effect, in milliseconds |
| Rear low-pass | Above this frequency the rears stay quiet |
| Subwoofer crossover | Only content below this reaches the sub |
| Channel mixer | Individual trim in dB for FL, FR, C, LFE, RL, RR |
| Headroom | Lower it if loud passages distort |

### Presets

Four built-in starting points — **Balanced**, **Subtle**, **Cinema**, **Music** — plus your own:
name the current settings and save them. Saved presets live in your Chrome profile and sync
across devices. **Reset to defaults** is always there if you want to start over.

Presets carry the sound only, never the on/off state, so loading one can never silently mute
or unmute the extension.

## Requirements

Your speakers must be configured as **5.1 in Windows**
(Sound Control Panel → your device → Configure → 5.1 Surround). The options page checks this
for you and says so plainly if the device reports fewer than six channels.

To check from a YouTube tab, in the console (F12):

```js
izziSurround.status()
```

`outputChannels` must be **6**. If it reads `2`, audio is reaching the speakers downmixed.

## What it deliberately does not do

YouTube really does carry native 5.1 tracks — itag 258 (AAC-LC, 6 channels, 390 kbps), plus
256, 328 and 380 — delivered in the same manifest as stereo to desktop Chrome. Chrome can even
decode them: `mediaCapabilities.decodingInfo` returns `supported: true` for 6-channel AAC.
The player simply picks Opus stereo instead.

An earlier version stripped the stereo entries from the manifest to force the native 5.1 track.
**That does not work.** YouTube uses SABR, where format selection is driven server-side; the
player ends up with nothing it can request and shows *"Your browser can't play this video"*.
That code path is gone.

The upmix covers every video anyway, including the large majority that have no native 5.1
track at all.

## Notes for anyone reading the source

Two details cost real debugging time and are worth knowing:

- **`GainNode` starts at `channelCount = 2`.** Setting `channelCountMode = 'explicit'` without
  also setting `channelCount = 6` makes the node downmix six channels back to stereo. The graph
  measures perfectly correct internally while only the front speakers make any sound.
- **YouTube enforces Trusted Types.** Any `innerHTML` assignment throws, so the injected menu
  item is built with `createElement` / `createElementNS` throughout.

## Privacy

No data collection, no network requests, no tracking. The `storage` permission holds nothing
but your settings, synced through your Chrome profile. All audio processing happens locally
in the tab.

## License

MIT — see [LICENSE](LICENSE).

---

by **IzzIsHOr**
