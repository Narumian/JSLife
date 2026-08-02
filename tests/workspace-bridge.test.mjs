import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("reads and syncs only files inside a registered local workspace", async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "jslife-workspace-test-"));
  const dataDirectory = join(temporaryRoot, "data");
  const workspace = join(temporaryRoot, "project");
  const managedProjects = join(temporaryRoot, "managed-projects");
  const workspaceId = "91e5f7bc-6d83-45e7-a443-bd49f33a7899";
  await mkdir(join(workspace, "lib"), { recursive: true });
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(join(workspace, "main.js"), "export const value = 1;\n");
  await writeFile(join(workspace, "remove.txt"), "remove me\n");
  await writeFile(join(dataDirectory, "workspaces.json"), JSON.stringify({ [workspaceId]: workspace }));

  process.env.JSLIFE_COMPANION_DATA_DIR = dataDirectory;
  process.env.JSLIFE_PROJECTS_DIR = managedProjects;
  process.env.JSLIFE_BRIDGE_NO_LISTEN = "1";
  try {
    const bridgeUrl = new URL("../scripts/codex-bridge.mjs", import.meta.url);
    bridgeUrl.searchParams.set("test", String(Date.now()));
    const { moveToWorkspace, readWorkspace, syncWorkspace } = await import(bridgeUrl.href);
    const project = await readWorkspace(workspaceId);
    assert.equal(project.name, "project");
    assert.equal(project.files.find((file) => file.path === "main.js")?.content, "export const value = 1;\n");

    await syncWorkspace(workspaceId, {
      files: [
        { path: "main.js", kind: "text", content: "export const value = 2;\n" },
        { path: "lib/new.js", kind: "text", content: "export default 3;\n" },
      ],
      removedPaths: ["remove.txt"],
    });
    assert.equal(await readFile(join(workspace, "main.js"), "utf8"), "export const value = 2;\n");
    assert.equal(await readFile(join(workspace, "lib", "new.js"), "utf8"), "export default 3;\n");

    const moved = await moveToWorkspace({
      projectName: "Managed Project",
      files: [{ path: "main.js", kind: "text", content: "export const managed = true;\n" }],
    });
    assert.equal(moved.name, "Managed Project");
    assert.match(moved.folderName, /^Managed Project-[a-f0-9]{8}$/);
    assert.equal(await readFile(join(managedProjects, moved.folderName, "main.js"), "utf8"), "export const managed = true;\n");

    await assert.rejects(
      syncWorkspace(workspaceId, { files: [{ path: "../outside.js", kind: "text", content: "no" }], removedPaths: [] }),
      /Path leaves the selected workspace/,
    );
  } finally {
    delete process.env.JSLIFE_COMPANION_DATA_DIR;
    delete process.env.JSLIFE_PROJECTS_DIR;
    delete process.env.JSLIFE_BRIDGE_NO_LISTEN;
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
