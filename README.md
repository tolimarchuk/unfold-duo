# Unfold

An iPhone Duo you can put on any web page. It opens, folds, turns and stands up like the real one, and shows your own screens. One file, no dependencies.

**Try it at [unfold.foo](https://unfold.foo).**

![iPhone Duo, open like a book](media/unfold.png)

## Use it

Load it as a module, straight from unfold.foo or from your own copy of `unfold.js`.

```html
<script type="module" src="https://unfold.foo/unfold.js"></script>

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

To run the demo page locally, serve this folder and open it:

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
| `--unfold-hinge`, `--unfold-antenna` | Colours of the hinge cover and the antenna lines. |
| `--unfold-shadow` | How dark the shadow is, 0 to 1. Default 0.3. |
| `::part()` | `stage`, `shadow`, `screen`, `back-glass` and `camera`. |

## Your own finishes and postures

Both are plain objects. Add one, then use it by name.

```js
import { addFinish, POSTURES } from './unfold.js';

addFinish('sage', { metal: '#a9b7a5', back: '#c3cdbf', hinge: '#97a393', antenna: 'rgba(60, 70, 58, .4)' });
POSTURES.reading = { fold: 120, roll: 0, anchor: 0.5, lean: 0, yaw: -20, pitch: 10 };
```

```html
<unfold-device finish="sage" posture="reading"></unfold-device>
```

In a posture, `anchor` and `lean` set how the phone sits: the right half turns about the hinge by `lean - anchor * (180 - fold)` degrees and the left half by that plus `180 - fold`. The built-in postures all use `anchor: 0.5`, so between any two of them both halves turn at a steady rate. `lean: 0` keeps the halves even, `lean: 90` closes it facing you.

## How it is built

The body follows Apple's published dimensions: 164.6 by 117.8 by 5.2 mm open, 84.1 by 117.8 by 11.3 mm closed. Everything else is measured from Apple's own 3D model of the phone and its spec drawings:
- the continuous corners, and the band's rounded profile, 0.7 mm round the inner screen and rolling 1.3 mm into the back
- the hinge cover, 1.8 mm out of the side when closed, and the 0.9 mm gap between the halves
- the camera plateau, 3.6 mm proud, its two raised lens rings, mic and flash
- the buttons, the antenna lines, the speaker holes, the microphones and USB-C, and the cover screen's hole punch

It is all in `SPEC` at the top of `unfold.js`, in millimetres.

The phone is about three hundred flat polygons: the band's rounded profile is lofted from rings, and so are the camera and the lenses. Each polygon is a plain element with one `matrix3d`, worked out in JavaScript whenever the pose changes. They all sit side by side in one 3D container rather than nested, because Safari stops drawing the children of a 3D container once it turns edge-on. Faces that point away are hidden by hand, using the real eye position, and every surface is lit from a fixed studio: the titanium reflects it, the frosted glass scatters it.

The halves turn about a line half the closed gap in front of the inner screen, just as the real hinge does, and both halves of the screen run on a little past the fold so the picture never breaks. As it opens, a soft shadow slides off the inner screen towards the cover side, laid out across both halves like the picture so the halves always match at the fold.

Moves between postures glide the framing (scale and centre) to where the new posture will sit, rather than chasing the phone's box every frame, so a phone turning from landscape to portrait shrinks steadily instead of pulsing.

Each phone builds itself when it first comes near the screen and stops drawing while it is scrolled away.

## Browsers

Tested in current Chrome and Safari, on desktop and on phones, at 60 frames a second. On a touchscreen a sideways drag turns it and a vertical swipe still scrolls the page.

## License

MIT. Not affiliated with Apple. iPhone and iPhone Duo are trademarks of Apple Inc.
