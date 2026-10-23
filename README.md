# Unfold

An iPhone Duo you can put on any web page. It opens, folds, turns and stands up like the real one, and shows your own screens. One file, no dependencies.

![iPhone Duo, open like a book](media/unfold.png)

## Use it

Copy `unfold.js` into your project and load it as a module.

```html
<script type="module" src="unfold.js"></script>

<unfold-device
  inner="open.png"
  cover="closed.png"
  posture="landscape-ajar"
  finish="night-sky"
  interactive>
</unfold-device>
```

Every method returns a promise, so moves can follow one another.

```js
const phone = document.querySelector('unfold-device');

await phone.setPosture('closed');
await phone.setPosture('laptop');
await phone.animateTo({ yaw: 160, pitch: 14 }, { duration: 1200 });
```

To see the demo page, serve this folder and open it:

```sh
python3 -m http.server 5190
# then open http://localhost:5190
```

## Postures

| Name | How it is held |
| --- | --- |
| `closed` | Shut, cover screen towards you. |
| `landscape` | Open flat, hinge upright. |
| `landscape-ajar` | Open like a book, both halves tipped towards you. |
| `portrait` | Open flat, turned so the hinge runs across. |
| `portrait-ajar` | Like a book on its side. |
| `laptop` | Bottom half flat on the table, top half standing. |
| `tent` | Standing on its two edges, cover screen out. |

## Attributes

| Name | Values | What it does |
| --- | --- | --- |
| `posture` | see above | How it is held. Changing it animates to the new posture. Default `landscape`. |
| `inner` | URL | Image or video on the big inside screen. |
| `cover` | URL | Image or video on the outside screen. |
| `finish` | `star-white`, `night-sky` | The colour of the frame, back and hinge. |
| `fold` | 0 to 180 | Angle between the two halves of the inner screen. 0 is shut, 180 is flat. |
| `yaw` | degrees | Turns it left or right. |
| `pitch` | -90 to 90 | How far above it you look from. Below zero looks up at it. |
| `roll` | degrees | Turns it on the page. |
| `interactive` | present or not | Drag to turn, click to flip, arrow keys to turn, F to fold. |
| `click` | `flip`, `fold`, `none` | What a click does when it is interactive. Default `flip`. |
| `logo` | URL | A logo in the middle of the back. None by default. |
| `zoom` | number | Scales the phone within the element. Default 1. |
| `shadow` | `none` | Hides the shadow underneath. |
| `label` | text | What screen readers call it. Default "iPhone Duo". |

Screens take images or videos. Videos play muted and loop, and the two halves of the inner screen stay in sync. A portrait picture on the inner screen, or a landscape one on the cover, is turned a quarter so it stands upright when the phone is held that way.

## Methods and properties

| Name | What it does |
| --- | --- |
| `setPosture(name, options)` | Moves to a posture. Same as setting the attribute, but returns a promise. |
| `open(options)` | Unfolds it flat. |
| `close(options)` | Folds it shut. |
| `toggle(options)` | Opens it if it is mostly closed, closes it otherwise. |
| `flip(options)` | Turns it around to show the other side. |
| `spin(turns, options)` | Spins it one full turn, or `turns` turns. Negative spins the other way. |
| `animateTo(target, options)` | Animates any of `fold`, `yaw`, `pitch` and `roll`. Options are `duration` in ms, `easing` (a CSS easing name or `cubic-bezier()`) and `delay`. Resolves `true` when it finishes, or `false` if something else moved it first. |
| `stop()` | Stops every animation where it is. |
| `setScreen(name, src)` | Puts a URL, File or Blob on `inner` or `cover`. Handy for a file picker or a drop. `null` clears it. |
| `fold`, `yaw`, `pitch`, `roll` | Read or set the pose right away, with no animation. |
| `posture`, `state` | The last posture asked for, and the current pose as one object. |

Animations respect `prefers-reduced-motion`: they jump straight to the end unless you pass `force: true`.

## Events

| Name | When |
| --- | --- |
| `change` | Every time it moves. `event.detail` is `{ fold, yaw, pitch, roll, posture }`. |
| `activate` | On a click, Enter or Space when it is interactive. `event.detail.action` says what it did. |

## Styling

The element is a block, 16:10 by default. Give it any width and height and the phone scales to fit, in every posture.

| Name | What it does |
| --- | --- |
| `--unfold-metal` | Colour of the frame and buttons. Overrides the finish. |
| `--unfold-back` | Colour of the back glass and camera plateau. |
| `--unfold-hinge`, `--unfold-ring` | Colours of the hinge cover and the lens rings. |
| `--unfold-shadow` | How dark the shadow is, 0 to 1. Default 0.3. |
| `::part()` | `stage`, `shadow`, `screen`, `back-glass` and `camera`. |

## Your own finishes and postures

Both are plain objects. Add one, then use it by name.

```js
import { addFinish, POSTURES } from './unfold.js';

addFinish('sage', { metal: '#8d9a8a', back: '#b9c4b4', hinge: '#7f8a7c', ring: '#9aa697' });
POSTURES.reading = { fold: 120, roll: 0, anchor: 0.5, lean: 0, yaw: -20, pitch: 10 };
```

```html
<unfold-device finish="sage" posture="reading"></unfold-device>
```

In a posture, `anchor` and `lean` say which part keeps still as it folds. The whole phone turns about the hinge by `lean - anchor * (180 - fold)` degrees: `anchor: 0.5, lean: 0` keeps both halves even, `anchor: 1, lean: 90` keeps the lower half flat like a laptop.

## How it is built

The body follows Apple's published dimensions: 84.1 by 117.8 by 11.3 mm closed and 164.6 by 117.8 mm open. The camera plateau, lenses, mic, flash, buttons and the cover screen's hole punch are measured from Apple's product photos. All of it is in `SPEC` at the top of `unfold.js`, in millimetres.

Every part is a plain element with a CSS 3D transform: the faces and a polished band of strips for each half, the hinge cover, the buttons, and the camera plateau and lenses standing proud of the back. The transforms are worked out in JavaScript whenever the pose changes. All the pieces sit side by side in one 3D container rather than nested by half, because Safari stops drawing the children of a 3D container once it turns edge-on.

The two halves turn about the line where the two sides of the inner screen meet, so there is never a gap in the picture at the fold. Each half is 5.65 mm deep so the phone closes to its real 11.3 mm; the real one is a little thinner open, where its hinge takes up the difference.

Faces that point away from the viewer are hidden by hand, using the real eye position, instead of with `backface-visibility`. Every surface is lit from a fixed light each frame, and a soft glare slides across the glass as it turns.

## Browsers

Tested in current Chrome and Safari, on desktop and on phones. On a touchscreen a sideways drag turns it and a vertical swipe still scrolls the page.

## License

MIT. Not affiliated with Apple. iPhone and iPhone Duo are trademarks of Apple Inc.
