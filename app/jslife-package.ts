import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import type { ProjectFile, ProjectRecord } from "./project-store";

type Manifest = {
  format: "jslife-project";
  version: 1;
  name: string;
  entry: string;
  runtimeId: "three";
  files: Array<{ path: string; kind: ProjectFile["kind"]; mimeType: string }>;
};

const normalizePath = (path: string) => {
  const normalized = path.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error(`Unsafe project path: ${path}`);
  }
  return normalized;
};

const compressible = (mimeType: string) => mimeType.startsWith("text/") || /json|javascript|xml|svg/.test(mimeType);

export async function packProject(project: ProjectRecord): Promise<Blob> {
  const manifest: Manifest = {
    format: "jslife-project",
    version: 1,
    name: project.name,
    entry: project.entry,
    runtimeId: project.runtimeId,
    files: project.files.map((file) => ({ path: normalizePath(file.path), kind: file.kind, mimeType: file.mimeType })),
  };
  const entries: Zippable = {
    "manifest.json": [strToU8(JSON.stringify(manifest, null, 2)), { level: 6 }],
  };
  for (const file of project.files) {
    const bytes = file.kind === "text" ? strToU8(file.content) : new Uint8Array(await file.content.arrayBuffer());
    entries[normalizePath(file.path)] = [bytes, { level: compressible(file.mimeType) ? 6 : 0 }];
  }
  return new Blob([zipSync(entries)], { type: "application/x-jslife-project" });
}

export async function unpackProject(file: File): Promise<ProjectRecord> {
  const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const manifestBytes = entries["manifest.json"];
  if (!manifestBytes) throw new Error("This .jslife file has no manifest.json");
  const manifest = JSON.parse(strFromU8(manifestBytes)) as Manifest;
  if (manifest.format !== "jslife-project" || manifest.version !== 1 || !Array.isArray(manifest.files)) {
    throw new Error("Unsupported .jslife project format");
  }
  const files = manifest.files.map<ProjectFile>((description) => {
    const path = normalizePath(description.path);
    const bytes = entries[path];
    if (!bytes) throw new Error(`Missing packaged file: ${path}`);
    return description.kind === "text"
      ? { path, kind: "text", mimeType: description.mimeType, content: strFromU8(bytes) }
      : { path, kind: "asset", mimeType: description.mimeType, content: new Blob([bytes], { type: description.mimeType }) };
  });
  const entry = normalizePath(manifest.entry);
  if (!files.some((candidate) => candidate.path === entry && candidate.kind === "text")) throw new Error(`Entry file not found: ${entry}`);
  return {
    id: crypto.randomUUID(),
    name: manifest.name || file.name.replace(/\.jslife$/i, ""),
    entry,
    runtimeId: manifest.runtimeId === "three" ? "three" : "three",
    files,
    updatedAt: new Date().toISOString(),
  };
}
