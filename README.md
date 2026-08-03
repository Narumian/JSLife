# JSLIFE

JSLIFE is a browser-based creative JavaScript studio for editing and running
multi-file Three.js projects. Projects, drafts, preferences, and Codex chat
history remain on the current device and can be imported or exported as
`.jslife` packages.

## XY / KAOSS pad interaction

Unless a project explicitly specifies a different interaction model, the
graphics stage is touch-first and behaves like an XY/KAOSS pad. A touch, pen
press, or mouse press establishes the control position; dragging updates it,
and releasing keeps the last XY value. Hover movement alone does not change
project parameters. When touch and mouse input overlap, touch takes priority.

The `pointer` object passed to `frame()` contains:

- `x`, `y`: normalized XY values from `-1` to `1`; the last values remain after release.
- `px`, `py`: pixel coordinates inside the graphics stage.
- `down`: `true` only while the active touch, pen, or mouse button is held.
- `pressure`: device pressure when available, otherwise the browser pointer value.
- `kind`: `"touch"`, `"pen"`, or `"mouse"`.

```js
export function frame({ time, pointer }) {
  // Continuous KAOSS-pad parameters: the last touched position stays active.
  effect.speed = THREE.MathUtils.mapLinear(pointer.y, -1, 1, 0.15, 2.0);
  effect.colorShift = pointer.x;

  // Gate an event so it runs only while the surface is pressed.
  effect.energy = pointer.down ? 0.5 + pointer.pressure : 0.08;
  renderer.render(scene, camera);
}
```

## Requirements

- Node.js `>=22.13.0`
- macOS 13 or newer and Xcode Command Line Tools when building the desktop app

## Three ways to run JSLIFE

### 1. JSLIFE desktop app

The distributed macOS app contains the complete React studio, Three.js runtime,
local-file bridge, Node.js runtime, and Codex binary. It opens JSLIFE directly
inside its own WKWebView window; a separate browser or helper window is not
required.

```bash
npm ci
npm run build:app
```

The build creates:

- `build-app/JSLIFE.app`
- `build-app/JSLIFE.dmg`

Use **Codex → ChatGPTでログイン** from the macOS menu when authentication is
needed. This development DMG is ad-hoc signed. Public distribution still
requires an Apple Developer ID signature and notarization.

### 2. Local source checkout

```bash
git clone https://github.com/Narumian/JSLife.git
cd JSLife
npm ci
npm run dev
```

`npm run dev` starts the Vinext UI and local Codex bridge in one long-running
Node process. It does not open a browser. When Codex is handling local
development, the Agent checks the two services first, starts this command only
when needed, and opens `http://localhost:3000` in the built-in browser only for
visual inspection.

`npm run dev` remains available when automatic browser opening is not wanted.

From the project browser, **Move to Local Files** writes the current in-browser
project under `~/Library/Application Support/JSLIFE/Projects/` and immediately
switches it to real-file auto-save. The IndexedDB project remains as a
recoverable browser backup. Right-click the file browser and choose **Open
Project Folder in Finder** to reveal the managed directory. **Open folder** is
still available for projects stored elsewhere.

The project browser is a single folder tree rooted at **Browser**, **Local**,
and **Starters**. Right-click Browser, Local, or a user-created group and choose
**Add Group** to create persistent nested organization folders. Starters is
read-only; project contents remain in the directory browser on the right.

### 3. GitHub Pages showcase

```bash
npm run build:pages
```

The static output is written to `dist-pages/`. The workflow in
`.github/workflows/pages.yml` publishes that directory whenever `main` is
pushed. In GitHub, set **Settings → Pages → Source** to **GitHub Actions**.

The static site runs the editor, renderer, browser storage, and `.jslife`
import/export without a server. Real-folder access still requires the desktop
app or local dev bridge. Codex chat, however, checks for a local bridge
(`npm run dev` or JSLIFE.app) on the same machine and connects to it when
present; when no bridge is reachable, the Desktop panel instead recommends
the latest Release download or cloning the repository and running
`npm run dev`.

## Validation

```bash
npm run lint
npm run build
npm run build:pages
npm run build:desktop
npm run build:app
```

The existing `npm run build` remains the Vinext/Sites build. GitHub Pages uses
the separate static build so the current local and Sites development flows are
preserved.
