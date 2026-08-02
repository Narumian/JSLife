# JSLIFE

JSLIFE is a browser-based creative JavaScript studio for editing and running
multi-file Three.js projects. Projects, drafts, preferences, and Codex chat
history remain on the current device and can be imported or exported as
`.jslife` packages.

## Requirements

- Node.js `>=22.13.0`
- macOS 13 or newer and Xcode Command Line Tools when building Companion

## Local development

```bash
npm ci
npm run dev
```

`npm run dev` starts both the Vinext web preview at `http://localhost:3000`
and the local Codex bridge at `http://127.0.0.1:4317`.

## GitHub Pages

```bash
npm run build:pages
```

The static output is written to `dist-pages/`. The workflow in
`.github/workflows/pages.yml` publishes that directory whenever `main` is
pushed. In GitHub, set **Settings → Pages → Source** to **GitHub Actions**.

The static site runs the editor, renderer, browser storage, and project
import/export without a server. Codex chat connects to JSLIFE Companion on the
user's Mac.

## JSLIFE Companion

```bash
npm run build:companion
```

The build downloads a checksum-verified official Node.js runtime, bundles the
current Apple Silicon or Intel Codex binary, builds the native Swift shell, and
creates:

- `build-companion/JSLIFE Companion.app`
- `build-companion/JSLIFE-Companion.dmg`

This development DMG is ad-hoc signed. Public distribution still requires an
Apple Developer ID signature and notarization.

The browser opens `jslife-companion://pair` with its return URL. Companion
returns a device-local pairing token, which the page stores in its own browser
storage. Remote HTTPS origins may reach the loopback bridge only with that
token. ChatGPT authentication remains in the bundled Codex runtime; API keys
are not exposed to the static site.

## Validation

```bash
npm run lint
npm run build
npm run build:pages
npm run build:companion
```

The existing `npm run build` remains the Vinext/Sites build. GitHub Pages uses
the separate static build so the current local and Sites development flows are
preserved.
