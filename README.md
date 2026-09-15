# IzzI 5.1 YouTube Enhancements

Four things YouTube does not give you, in one extension: real 5.1 surround,
extra volume, a fill-screen crop, and borderless picture-in-picture.

Everything runs inside the YouTube tab. Nothing is installed system-wide, no
drivers, no virtual audio devices, and no network requests of any kind.

## What it does

**Real 5.1 surround.** A Dolby Surround / Hafler style matrix: centre carries
L+R so dialogue is anchored, the rears carry L-R so only ambience reaches the
back, the subwoofer gets a low-passed feed, and a 15 ms Haas delay keeps the
source localised up front. Your speakers must be set to 5.1 in Windows; the
options page says plainly if the output device reports fewer than six channels.

**Extra volume,** up to 500%, for videos mixed too quietly. A limiter catches
the peaks, and its ratio follows the boost so it is a straight wire at 1x
rather than quietly compressing everything.

**Fill screen.** A 16:9 video on a 4:3 or ultrawide monitor letterboxes; this
crops it to fill instead. CSS only, so it cannot disturb the audio graph.

**Picture-in-picture.** Native, so the window has no border and no title bar,
sizes itself to the video and stays on top. It leaves the video element in the
page, which is why the six channel graph keeps running while it is open;
Document PiP would move the element and strand the audio source node.

## Where the controls are

The toolbar panel has all four. Surround, fill screen and picture-in-picture
are also in the player's settings gear, next to Voice boost. The options page
holds the full mixer: rear width, rear delay, rear low-pass, subwoofer
crossover, headroom, per-channel dB trim, and savable presets.

## Install

1. Download or clone this repository
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. **Load unpacked** → select the folder

It turns itself on. The state is remembered between sessions.

## Using it

- **Toolbar panel**: click the extension's button for all four controls
- **In the player**: settings gear → **IzzI 5.1 surround**, **Fill screen** and
  **Picture-in-picture**, right under *Voice boost*
- **Full mixer**: the gear inside the panel, or right-click the toolbar icon → *Options*

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
or unmute the extension. Extra volume is part of a preset; fill screen is a picture setting
and stays out of them.

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
