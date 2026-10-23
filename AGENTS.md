# Unfold

An open-source web component, `<unfold-device>`: a foldable phone (and a regular one) drawn with CSS 3D transforms. `unfold.js` is the whole library. `index.html` is the demo page. It started as the iPhone Duo hero on screen.fish.

## Run and check

- Serve the folder (`python3 -m http.server 5190`) and open `index.html`.
- `test.html?p=fold=90,yaw=-30;fold=0,yaw=200,finish=silver` draws a grid of poses, one per `;`. Check changes there in both Chrome and Safari: open, closed, half open, the back, portrait, silver and `model=bar`.
- Look closely at the hinge on the open inner screen. Any dark line down the middle is a regression.

## Rules

- One file, no dependencies, no build step.
- Geometry stays in millimetres. Pixels only appear in `_layout` and `_render`.
- Keep every 3D piece a direct child of `.world` with its full transform. Safari drops children of a nested 3D container once it is edge-on.
- Hide faces with the eye-point check in `_render`, not `backface-visibility`.
- Nothing names Apple or claims to be an official model.
- Releasing (GitHub, npm, a public URL) is Toli's call.
