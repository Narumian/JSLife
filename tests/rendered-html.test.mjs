import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the JSLIFE studio", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>JSLIFE — Creative JavaScript Studio<\/title>/i);
  assert.match(html, /Export \.jslife/);
  assert.match(html, /EDITOR/);
  assert.match(html, /Add assets/);
  assert.match(html, /CODEX PAIR/);
  assert.doesNotMatch(html, /codex-preview|Building your site/);
});

test("ships storage, packaging, chat, and all three launch routes", async () => {
  const [playground, store, packaging, runtime, bridge, packageJson, nativeApp] = await Promise.all([
    readFile(new URL("../app/Playground.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/project-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/jslife-package.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/project-runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/codex-bridge.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../companion/JSLifeCompanion.swift", import.meta.url), "utf8"),
  ]);
  assert.match(store, /indexedDB\.open/);
  assert.match(packaging, /zipSync/);
  assert.match(packaging, /unzipSync/);
  assert.match(runtime, /resolvePath/);
  assert.match(runtime, /assetUrl/);
  assert.match(playground, /type="file" multiple/);
  assert.match(playground, /conversation\.projectId === activeProjectId/);
  assert.match(playground, /activeChatStorageKey\(activeProjectId\)/);
  assert.match(playground, /\/workspaces\/open/);
  assert.match(playground, /\/workspaces\/move/);
  assert.match(playground, /Move to Local Files/);
  assert.match(playground, /Open Project Folder in Finder/);
  assert.match(playground, /STORAGE_PROJECT_GROUPS/);
  assert.match(playground, /Add Group/);
  assert.match(playground, />Browser</);
  assert.match(playground, />Local</);
  assert.match(playground, />Starters</);
  assert.match(playground, /setPointerCapture/);
  assert.match(playground, /activePointer/);
  assert.match(playground, /Saved to folder/);
  assert.match(bridge, /"write", "delete", "move"/);
  assert.match(bridge, /safeWorkspacePath/);
  assert.match(bridge, /workspaceSyncMatch/);
  assert.match(bridge, /\/workspaces\/move/);
  assert.match(bridge, /moveToWorkspace/);
  assert.match(bridge, /Application Support", "JSLIFE", "Projects/);
  assert.match(bridge, /\/reveal/);
  assert.match(packageJson, /"fflate"/);
  assert.match(packageJson, /VITE_JSLIFE_MODE=pages/);
  assert.match(packageJson, /VITE_JSLIFE_MODE=desktop/);
  assert.match(playground, /このページはブラウザ体験版です/);
  assert.match(playground, /IS_STATIC_SHOWCASE/);
  assert.match(nativeApp, /WKWebView/);
  assert.match(nativeApp, /JSLIFE_UI_ROOT/);
  assert.match(packageJson, /"dev": "node scripts\/dev\.mjs"/);
  assert.match(playground, /npm run dev/);
});
