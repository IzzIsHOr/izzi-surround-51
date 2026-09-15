# Chrome Web Store submission

Copy-paste material for the developer dashboard at
https://chrome.google.com/webstore/devconsole

This is an **update** to an item that is already published, so the flow is:
the item → **Package** → **Upload new package** → the zip from `dist/` → then
replace the listing text and images below → **Submit for review**.

Build everything first:

```
node dev/build.cjs      # the zip
node dev/server.cjs     # then, in another shell:
node dev/shots.cjs      # screenshots and the store icon
node dev/promo.cjs      # promo tiles
```

---

## Name

```
IzzI 5.1 YouTube Enhancements
```

## Short description

No field for this in the dashboard: the store uses the manifest's
`description`, and Chrome rejects the upload past **132 characters**.
Currently 100.

```
Real 5.1 surround for YouTube, plus extra volume, fill-screen crop and one-click picture-in-picture.
```

## Detailed description

```
Four things YouTube does not give you, in one panel.

REAL 5.1 SURROUND

Turns YouTube's stereo into discrete 5.1, using nothing but your browser. No
Equalizer APO, no virtual audio device, no separate media player. It runs inside
the YouTube tab, so your games and every other application are left untouched.

Rather than copying the front channels to the back, which just makes everything
louder, it uses a Dolby Surround / Hafler style matrix:

  • Centre carries the sum of left and right, anchoring dialogue and vocals
  • The rears carry the difference, so anything centred in the mix cancels out
    and only ambience and reverb reach the back
  • The subwoofer gets a low-passed feed
  • A 15 ms Haas delay on the rears keeps the source localised up front

The result is a genuine sense of space, not the same sound from six directions.

EXTRA VOLUME

Some videos are simply mixed too quietly, and YouTube's own slider stops at
100%. This one goes to 500%. A limiter catches the peaks so a boosted track
does not clip, and it stays out of the way entirely while the volume is
untouched.

FILL SCREEN

A 16:9 video on a 4:3 or ultrawide monitor letterboxes, and the black bars
waste the screen. This crops the picture to fill instead. You lose the edges
and gain the space.

PICTURE-IN-PICTURE

One click puts the video in a floating window with no border and no title bar,
sized to the video and resizable from the corner, staying on top of everything
else. The surround processing keeps running while it is open.

WHERE THE CONTROLS ARE

All four sit in the toolbar panel. Surround, fill screen and picture-in-picture
are also in the player's own settings gear, next to Voice boost. The options
page holds the full mixer: rear width, rear delay, rear low-pass, subwoofer
crossover, headroom, and individual dB trim for all six channels, with savable
presets.

REQUIREMENTS

For 5.1 your speakers must be configured as 5.1 in Windows (Sound Control
Panel, your device, Configure, 5.1 Surround). The options page checks this and
tells you plainly if the output device reports fewer than six channels. The
other three features work on any setup.

PRIVACY

No data collection, no network requests, no tracking, no analytics. All
processing happens locally in the tab. The storage permission holds nothing but
your own settings.

Open source, MIT licensed: https://github.com/IzzIsHOr/izzi-surround-51

Free, and staying that way. If it made your evening sound better and you feel
like it: https://buymeacoffee.com/izzishor
```

## Category

`Entertainment`.

It was `Accessibility` when the item was only about dialogue clarity on the
centre channel. With picture controls in it too, Entertainment is the honest
fit.

## Language

English

---

## Permission justifications

**Unchanged from the published version.** Nothing new is requested, which is
worth knowing: an update that adds features without adding permissions is the
easy kind to review.

**`storage`**

```
Stores the user's own settings (enable state, extra volume, fill screen,
surround width, filter frequencies, per-channel gain trims and saved presets)
so they persist between sessions and sync across the user's devices. No other
data is stored.
```

**Host permission `https://www.youtube.com/*`**

```
The extension processes audio and video from the YouTube player. It needs to run
a content script on youtube.com to reach the player's video element through the
Web Audio API, to apply the fill-screen CSS, to open picture-in-picture, and to
add its toggles to the player's settings menu. It runs on no other site and
makes no network requests.
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

The scope grew, so this needed rewording. A list of four features reads as a
bundle and invites the single-purpose question; one sentence about playback
does not.

```
Improve the playback of YouTube videos, in sound and in picture, from within the YouTube player.
```

## Privacy policy URL

```
https://github.com/IzzIsHOr/izzi-surround-51/blob/main/PRIVACY.md
```

---

## Assets

All generated. Replace the existing listing images with these: the interface
changed, so the old screenshots no longer show what ships.

- **Store icon** (128x128): `dist/promo/store-icon-128.png`

  Not `icons/icon128.png`. The listing icon is uploaded separately from the
  packaged ones, and Google asks for 96x96 of artwork inside a 128px canvas.

- **Screenshots** (1280x800), in this order:

  | | |
  |---|---|
  | `dist/shots/00-panel.png` | the toolbar panel, all four controls |
  | `dist/shots/01-options.png` | playback and the surround matrix |
  | `dist/shots/02-options.png` | the channel mixer |
  | `dist/shots/03-options.png` | output and presets |

  Put `00-panel.png` first. It is the one on the listing card, and it shows the
  whole feature set at a glance.

- **Small promo tile** (440x280): `dist/promo/small-promo-440x280.png`
- **Marquee promo tile** (1400x560): `dist/promo/marquee-promo-1400x560.png`

- **Worth adding by hand**: a shot of the YouTube player with the three toggles
  in the settings gear. It cannot be captured headlessly, because it needs a
  real YouTube page with the extension loaded. Open a video, click the gear,
  and screenshot at 1280x800.

## Review notes

The version must be higher than what is published. This one is 4.0.0 against
3.2.1.

Permissions are unchanged, there is no remote code and no data collection, so
the parts that usually slow a review down are the same as the version that was
already approved.
