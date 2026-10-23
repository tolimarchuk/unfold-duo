# Unfold

An open-source web component, `<unfold-device>`: an iPhone Duo in CSS 3D that opens, folds, turns and takes Apple's postures (closed, landscape, portrait, both ajar, laptop, tent). `unfold.js` is the whole library. `index.html` is the demo page. It started as the iPhone Duo hero on screen.fish.

## Run and check

- Serve the folder (`python3 -m http.server 5190`) and open `index.html`.
- `test.html?p=posture=laptop;posture=closed,yaw=200,finish=night-sky` draws a grid of phones, one per `;`. Check changes there in both Chrome and Safari: every posture, the back, the closed sides and both finishes.
- Look closely at the fold of the inner screen, flat and ajar, in Safari. Any line there is a regression.
- Animations should hold 60 frames a second in both browsers.

## Rules

- iPhone Duo only. One file, no dependencies, no build step.
- Geometry lives in `SPEC`, in millimetres: Apple's published sizes for the body, Apple's AR model (the USDZ behind "View in AR" on apple.com/iphone-duo) and spec drawings for everything else. Measure from those, not from guesses. Never ship Apple's model or images.
- Every 3D piece is a flat polygon that is a direct child of `.world`, with one `matrix3d`. Safari drops children of a nested 3D container once it is edge-on.
- Hide faces with the eye-point check in `_render`. Pieces behind the screen or on the back (the hinge cover, the camera) also need their own "is that side in view" rule, or Safari draws them through the screen.
- Along the fold only the face's own edge may meet the other half; anything darker under that edge shows as a line in Safari.
- No Apple logo by default; the `logo` attribute is for people who may use one.
- Releasing (GitHub, npm, a public URL) is Toli's call.
