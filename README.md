# IzzI 5.1 YouTube Enhancements

Four things YouTube does not give you, in one extension.

Everything runs inside the YouTube tab. No drivers, no virtual audio devices,
nothing installed system-wide, and no network requests of any kind.

<a href="https://buymeacoffee.com/izzishor">☕ Buy me a coffee</a> if it made
your evening sound better.

---

## What it does

**Real 5.1 surround.** Turns YouTube's stereo into six discrete channels.
Centre carries L+R so dialogue is anchored, the rears carry L−R so only
ambience reaches the back, the subwoofer gets a low-passed feed, and a 15 ms
delay keeps the sound localised up front. Not the old trick of copying the
front channels to the back.

**Extra volume,** up to 500%, for videos mixed too quietly. A limiter catches
the peaks, and gets out of the way entirely while the volume is untouched.

**Fill screen.** A 16:9 video on a 4:3 or ultrawide monitor letterboxes. This
crops it to fill instead: you lose the edges and gain the screen.

**Picture-in-picture.** A floating window with no border and no title bar,
sized to the video and resizable from the corner. The surround keeps running
while it is open.

## Where the controls are

Click the toolbar button for all four. Surround, fill screen and
picture-in-picture are also in the player's settings gear, next to Voice boost.

The options page has the full mixer: rear width, rear delay, rear low-pass,
subwoofer crossover, headroom, and individual dB trim for all six channels,
with savable presets.

## Install

From the [Chrome Web Store](https://chrome.google.com/webstore), or grab the
zip from [Releases](https://github.com/IzzIsHOr/izzi-surround-51/releases) and
load it unpacked through `chrome://extensions` with Developer mode on.

## For 5.1 you need 5.1

Your speakers must be set to 5.1 in Windows: Sound Control Panel → your device
→ Configure → 5.1 Surround.

The options page checks this and says plainly if the output device reports
fewer than six channels. The other three features work on any setup.

## Privacy

No data collection, no network requests, no tracking, no analytics. The only
thing stored is your own settings, and they live in your browser profile.

Full policy in [PRIVACY.md](PRIVACY.md).

## Notes for anyone reading the source

Three things cost real time and are easy to hit again:

- A `GainNode` starts at `channelCount = 2`. Setting `channelCountMode` to
  `explicit` without also setting `channelCount = 6` silently downmixes six
  channels to stereo, and the graph still measures as correct internally.
- YouTube enforces Trusted Types, so any `innerHTML` assignment throws.
- `chrome.storage.sync` allows roughly 120 writes a minute, so slider handlers
  have to coalesce their writes or they fail with no error.

Native picture-in-picture is safe to combine with the audio graph: it mirrors
the frames and leaves the `<video>` element in the page, so
`createMediaElementSource` stays bound. Document PiP is not — it moves the
element into another document, and the source node cannot be created twice on
the same element.

Measuring the graph's internal nodes proves nothing about what reaches the
speakers. `izziSurround.meters()` reports the live level per channel, and
`izziSurround.debug()` reads the values back off the nodes themselves.

## Development

`dev/` and `dev-preview.html` are not part of the extension. They fake the
`chrome.*` APIs so the pages open in an ordinary browser.

```bash
node dev/server.cjs   # then http://localhost:5178
node dev/build.cjs    # the zip, into dist/
node dev/shots.cjs    # store screenshots
node dev/promo.cjs    # promo tiles
```

## Licence

MIT.
