import { chmod, cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const outputRoot = join(root, "build-companion");
const appName = "JSLIFE Companion.app";
const appRoot = join(outputRoot, appName);
const contents = join(appRoot, "Contents");
const macOS = join(contents, "MacOS");
const resources = join(contents, "Resources");
const runtime = join(resources, "runtime");
const server = join(resources, "server");
const executable = join(macOS, "JSLifeCompanion");
const target = process.arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
const platformPackage = process.arch === "arm64" ? "codex-darwin-arm64" : "codex-darwin-x64";
const vendor = join(root, "node_modules", "@openai", platformPackage, "vendor", target);
const nodeVersion = process.env.JSLIFE_NODE_VERSION || "22.19.0";
const nodeArchiveName = `node-v${nodeVersion}-darwin-${process.arch}.tar.gz`;
const runtimeCache = join(root, ".companion-cache", `node-v${nodeVersion}-darwin-${process.arch}`);

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      CLANG_MODULE_CACHE_PATH: join(outputRoot, ".module-cache"),
      SWIFT_MODULECACHE_PATH: join(outputRoot, ".module-cache"),
    },
  });
  if (result.status !== 0) throw new Error(`${command} failed with status ${result.status}`);
};

const exists = async (path) => {
  try { await stat(path); return true; } catch { return false; }
};

const companionNode = async () => {
  if (process.env.JSLIFE_NODE_BINARY) return resolve(process.env.JSLIFE_NODE_BINARY);
  const cachedNode = join(runtimeCache, "bin", "node");
  if (await exists(cachedNode)) return cachedNode;

  const downloadRoot = join(root, ".companion-cache", "downloads");
  const archive = join(downloadRoot, nodeArchiveName);
  const checksums = join(downloadRoot, `SHASUMS256-v${nodeVersion}.txt`);
  await mkdir(downloadRoot, { recursive: true });
  run("curl", ["-fsSL", `https://nodejs.org/dist/v${nodeVersion}/SHASUMS256.txt`, "-o", checksums]);
  run("curl", ["-fsSL", `https://nodejs.org/dist/v${nodeVersion}/${nodeArchiveName}`, "-o", archive]);
  const checksumText = await readFile(checksums, "utf8");
  const expected = checksumText.split("\n").find((line) => line.endsWith(`  ${nodeArchiveName}`))?.split(/\s+/)[0];
  const actual = createHash("sha256").update(await readFile(archive)).digest("hex");
  if (!expected || actual !== expected) throw new Error("Downloaded Node.js runtime checksum did not match");
  await mkdir(dirname(runtimeCache), { recursive: true });
  run("tar", ["-xzf", archive, "-C", dirname(runtimeCache)]);
  return cachedNode;
};

await rm(outputRoot, { recursive: true, force: true });
await Promise.all([
  mkdir(macOS, { recursive: true }),
  mkdir(join(runtime, "bin"), { recursive: true }),
  mkdir(join(runtime, "codex-path"), { recursive: true }),
  mkdir(join(server, "node_modules", "@openai", "codex-sdk"), { recursive: true }),
  mkdir(join(outputRoot, ".module-cache"), { recursive: true }),
]);

run("xcrun", [
  "swiftc",
  "-parse-as-library",
  "-framework", "AppKit",
  join(root, "companion", "JSLifeCompanion.swift"),
  "-o", executable,
]);

const nodeExecutable = await companionNode();
await Promise.all([
  cp(nodeExecutable, join(runtime, "bin", "node")),
  cp(join(vendor, "bin", "codex"), join(runtime, "bin", "codex")),
  cp(join(vendor, "bin", "codex-code-mode-host"), join(runtime, "bin", "codex-code-mode-host")),
  cp(join(vendor, "codex-path", "rg"), join(runtime, "codex-path", "rg")),
  cp(join(root, "scripts", "codex-bridge.mjs"), join(server, "codex-bridge.mjs")),
  cp(join(root, "node_modules", "@openai", "codex-sdk", "dist"), join(server, "node_modules", "@openai", "codex-sdk", "dist"), { recursive: true }),
  cp(join(root, "node_modules", "@openai", "codex-sdk", "package.json"), join(server, "node_modules", "@openai", "codex-sdk", "package.json")),
]);

await Promise.all([
  chmod(executable, 0o755),
  chmod(join(runtime, "bin", "node"), 0o755),
  chmod(join(runtime, "bin", "codex"), 0o755),
  chmod(join(runtime, "bin", "codex-code-mode-host"), 0o755),
  chmod(join(runtime, "codex-path", "rg"), 0o755),
]);

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleDisplayName</key><string>JSLIFE Companion</string>
  <key>CFBundleExecutable</key><string>JSLifeCompanion</string>
  <key>CFBundleIdentifier</key><string>studio.jslife.companion</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>JSLIFE Companion</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>CFBundleURLTypes</key><array><dict>
    <key>CFBundleURLName</key><string>studio.jslife.companion</string>
    <key>CFBundleURLSchemes</key><array><string>jslife-companion</string></array>
  </dict></array>
</dict></plist>`;
await writeFile(join(contents, "Info.plist"), plist);

for (const binary of [
  join(runtime, "bin", "node"),
  join(runtime, "bin", "codex"),
  join(runtime, "bin", "codex-code-mode-host"),
  join(runtime, "codex-path", "rg"),
]) run("codesign", ["--force", "--sign", "-", binary]);
run("codesign", ["--force", "--deep", "--sign", "-", appRoot]);

const dmg = join(outputRoot, "JSLIFE-Companion.dmg");
run("hdiutil", ["create", "-volname", "JSLIFE Companion", "-srcfolder", appRoot, "-ov", "-format", "UDZO", dmg]);
process.stdout.write(`${appRoot}\n${dmg}\n`);
