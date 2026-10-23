# Unfold

An open-source web component, `<unfold-device>`: an iPhone Duo drawn with CSS 3D transforms that opens, folds, turns and takes Apple's postures (closed, landscape, portrait, both ajar, laptop, tent). `unfold.js` is the whole library. `index.html` is the demo page. It started as the iPhone Duo hero on screen.fish.

## Run and check

- Serve the folder (`python3 -m http.server 5190`) and open `index.html`.
- `test.html?p=posture=laptop;posture=closed,yaw=200,finish=night-sky` draws a grid of phones, one per `;`. Check changes there in both Chrome and Safari: every posture, the back, the closed sides and both finishes.
- Look closely at the fold of the inner screen, flat and ajar, in Safari. Any line there is a regression.

## Rules

- iPhone Duo only. One file, no dependencies, no build step.
- Geometry stays in millimetres in `SPEC`, measured from Apple's published sizes and product photos. Pixels only appear in `_layout` and `_render`.
- Keep every 3D piece a direct child of `.world` with its full transform. Safari drops children of a nested 3D container once it is edge-on.
- Hide faces with the eye-point check in `_render`, not `backface-visibility`. Pieces behind the screen (the spine, the camera) also need their own "is it in view" rule or Safari draws them through the screen.
- No Apple logo by default; the `logo` attribute is for people who may use one.
- Releasing (GitHub, npm, a public URL) is Toli's call.
