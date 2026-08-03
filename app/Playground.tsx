"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { packProject, unpackProject } from "./jslife-package";
import { compileProject, disposeScene, validateProject, type GraphicsRuntime, type PointerState, type ResizeArgs } from "./project-runtime";
import { getDraft, listChatConversations, listProjects, putChatConversation, putDraft, putProject, removeProject, type ChatConversationRecord, type ProjectFile, type ProjectRecord, type StoredChatFileAction, type StoredChatMessage } from "./project-store";

type Preset = { name: string; accent: string; code: string };
type LegacyProject = { id: string; name: string; code: string; updatedAt: string };
type LegacyDraft = { projectName?: string; code?: string; activeProjectId?: string | null; saved?: boolean };
type StudioPreferences = { chatOpen?: boolean; autoRun?: boolean; editorOpen?: boolean; openPaths?: string[]; sidebarMode?: "files" | "library" };
type ProjectBrowserRow = { path: string; name: string; depth: number; kind: "folder" | "file"; file?: ProjectFile };
type FileAction = StoredChatFileAction;
type ChatMessage = StoredChatMessage;
type CodexResult = { message: string; action: "none" | "changes"; changes: FileAction[] };
type LocalWorkspaceFile = { path: string; kind: "text"; mimeType: string; content: string } | { path: string; kind: "asset"; mimeType: string; base64: string };
type LocalWorkspaceResponse = { workspaceId: string; name: string; folderName?: string; files: LocalWorkspaceFile[] };
type ProjectGroup = { id: string; name: string; root: "browser" | "local"; parentId: string | null };

const STORAGE_LIBRARY = "jslife-library-v1";
const STORAGE_DRAFT = "jslife-three-draft-v1";
const STORAGE_CHAT = "jslife-codex-chat-v1";
const STORAGE_THREAD = "jslife-codex-thread-v1";
const STORAGE_ACTIVE_CHAT = "jslife-active-chat-v2";
const STORAGE_COMPANION_TOKEN = "jslife-companion-token-v1";
const STORAGE_PREFERENCES = "jslife-preferences-v1";
const STORAGE_PROJECT_GROUPS = "jslife-project-groups-v1";
const CODEX_BRIDGE = "http://127.0.0.1:4317";
const APP_MODE = import.meta.env.VITE_JSLIFE_MODE || "local";
const IS_STATIC_SHOWCASE = APP_MODE === "pages";
const COMPANION_DOWNLOAD_URL = import.meta.env.VITE_COMPANION_DOWNLOAD_URL || "";
const RELEASE_URL = "https://github.com/Narumian/JSLife/releases/latest";
const RELEASE_DOWNLOAD_URL = "https://github.com/Narumian/JSLife/releases/latest/download/JSLIFE.dmg";
const REPOSITORY_URL = "https://github.com/Narumian/JSLife";

const activeChatStorageKey = (projectId: string | null) => `${STORAGE_ACTIVE_CHAT}:${projectId ?? "unscoped"}`;
const formatProjectTimestamp = (value: string) => {
  const date = new Date(value);
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${date.toLocaleDateString()} ${time}`;
};

const initialProjectGroups = (): ProjectGroup[] => {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_PROJECT_GROUPS) || "[]") as ProjectGroup[];
    return Array.isArray(parsed) ? parsed.filter((group) => group && typeof group.id === "string" && typeof group.name === "string" && (group.root === "browser" || group.root === "local")) : [];
  } catch { return []; }
};

const localWorkspaceFiles = (workspace: LocalWorkspaceResponse): ProjectFile[] => workspace.files.map((file) => file.kind === "text"
  ? file
  : { path: file.path, kind: "asset", mimeType: file.mimeType, content: new Blob([Uint8Array.from(atob(file.base64), (character) => character.charCodeAt(0))], { type: file.mimeType }) });

const blobBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",", 2)[1] || "");
  reader.onerror = () => reject(reader.error ?? new Error("Could not read asset"));
  reader.readAsDataURL(blob);
});

const serializeWorkspaceFiles = (files: ProjectFile[]) => Promise.all(files.map(async (file) => file.kind === "text"
  ? { path: file.path, kind: file.kind, mimeType: file.mimeType, content: file.content }
  : { path: file.path, kind: file.kind, mimeType: file.mimeType, base64: await blobBase64(file.content) }));

const sameProjectFile = (left: ProjectFile | undefined, right: ProjectFile) => Boolean(left
  && left.kind === right.kind
  && left.mimeType === right.mimeType
  && (left.kind === "text" && right.kind === "text" ? left.content === right.content : left.kind === "asset" && right.kind === "asset" && left.content === right.content));

const PRESETS: Preset[] = [
  {
    name: "Neon Knot",
    accent: "#c8ff45",
    code: `import * as THREE from "three";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a0d);
scene.fog = new THREE.FogExp2(0x070a0d, 0.045);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
camera.position.set(0, 0, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
mount.appendChild(renderer.domElement);

const geometry = new THREE.TorusKnotGeometry(1.45, 0.34, 240, 32);
const material = new THREE.MeshPhysicalMaterial({
  color: 0xc8ff45,
  metalness: 0.18,
  roughness: 0.24,
  clearcoat: 1,
  emissive: 0x1b2708,
});
const knot = new THREE.Mesh(geometry, material);
scene.add(knot);

const wire = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.8, 0.012, 240, 8),
  new THREE.MeshBasicMaterial({ color: 0x8a5cff, transparent: true, opacity: 0.7 })
);
scene.add(wire);

const key = new THREE.PointLight(0xc8ff45, 55, 18);
key.position.set(3, 3, 4);
scene.add(key);
const fill = new THREE.PointLight(0x8a5cff, 45, 16);
fill.position.set(-4, -2, 3);
scene.add(fill);

export function frame({ time, pointer }) {
  knot.rotation.x = time * 0.24 + pointer.y * 0.22;
  knot.rotation.y = time * 0.38 + pointer.x * 0.35;
  wire.rotation.y = -time * 0.18;
  camera.position.x += (pointer.x * 0.7 - camera.position.x) * 0.035;
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}

export function resize({ width, height, pixelRatio }) {
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function dispose() {
  geometry.dispose();
  material.dispose();
  wire.geometry.dispose();
  wire.material.dispose();
  renderer.dispose();
}`,
  },
  {
    name: "Particle Current",
    accent: "#6fe7ff",
    code: `import * as THREE from "three";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x061013);
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
camera.position.z = 7;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
mount.appendChild(renderer.domElement);

const count = 12000;
const positions = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);
const lime = new THREE.Color(0xc8ff45);
const cyan = new THREE.Color(0x6fe7ff);
for (let i = 0; i < count; i++) {
  const radius = Math.pow(Math.random(), 0.62) * 4.2;
  const angle = Math.random() * Math.PI * 2;
  positions[i * 3] = Math.cos(angle) * radius;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 3.8;
  positions[i * 3 + 2] = Math.sin(angle) * radius * 0.45;
  const color = i % 5 === 0 ? lime : cyan;
  colors.set([color.r, color.g, color.b], i * 3);
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
const material = new THREE.PointsMaterial({
  size: 0.025, vertexColors: true, transparent: true, opacity: 0.82,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const particles = new THREE.Points(geometry, material);
scene.add(particles);

export function frame({ time, pointer }) {
  particles.rotation.y = time * 0.08 + pointer.x * 0.2;
  particles.rotation.x = Math.sin(time * 0.2) * 0.16 + pointer.y * 0.12;
  const scale = 1 + Math.sin(time * 0.8) * 0.025;
  particles.scale.setScalar(scale);
  renderer.render(scene, camera);
}

export function resize({ width, height, pixelRatio }) {
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function dispose() {
  geometry.dispose();
  material.dispose();
  renderer.dispose();
}`,
  },
  {
    name: "Instanced Field",
    accent: "#ff7456",
    code: `import * as THREE from "three";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x09080f);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(6, 6, 8);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x8a5cff, 0x08080b, 2.2));
const light = new THREE.DirectionalLight(0xc8ff45, 4);
light.position.set(4, 7, 5);
scene.add(light);

const size = 26;
const geometry = new THREE.BoxGeometry(0.15, 1, 0.15);
const material = new THREE.MeshStandardMaterial({
  color: 0xff7456, metalness: 0.45, roughness: 0.38,
});
const field = new THREE.InstancedMesh(geometry, material, size * size);
const dummy = new THREE.Object3D();
scene.add(field);

export function frame({ time, pointer }) {
  let index = 0;
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const px = (x - size / 2) * 0.24;
      const pz = (z - size / 2) * 0.24;
      const wave = 0.6 + (Math.sin(px * 2.2 + time * 1.5) + Math.cos(pz * 2 - time)) * 0.28;
      dummy.position.set(px, wave * 0.5 - 0.5, pz);
      dummy.scale.set(1, Math.max(0.08, wave), 1);
      dummy.rotation.y = time * 0.15 + pointer.x * 0.4;
      dummy.updateMatrix();
      field.setMatrixAt(index++, dummy.matrix);
    }
  }
  field.instanceMatrix.needsUpdate = true;
  field.rotation.y = time * 0.08;
  renderer.render(scene, camera);
}

export function resize({ width, height, pixelRatio }) {
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function dispose() {
  geometry.dispose();
  material.dispose();
  renderer.dispose();
}`,
  },
];

const BLANK_PROJECT = `import * as THREE from "three";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080b0d);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
mount.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const material = new THREE.MeshNormalMaterial();
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

export function frame({ time }) {
  mesh.rotation.x = time * 0.35;
  mesh.rotation.y = time * 0.55;
  renderer.render(scene, camera);
}

export function resize({ width, height, pixelRatio }) {
  renderer.setPixelRatio(Math.min(pixelRatio, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function dispose() {
  geometry.dispose();
  material.dispose();
  renderer.dispose();
  renderer.domElement.remove();
}`;

const safeName = (value: string) => value.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "sketch";
const mainFile = (content: string): ProjectFile => ({ path: "main.js", kind: "text", mimeType: "text/javascript", content });
const isEditable = (file: ProjectFile) => file.kind === "text";
const chatTitle = (messages: ChatMessage[]) => {
  const firstRequest = messages.find((message) => message.role === "user")?.text.trim();
  return firstRequest ? `${firstRequest.slice(0, 34)}${firstRequest.length > 34 ? "…" : ""}` : "新しい会話";
};
const initialCompanionToken = () => {
  if (typeof window === "undefined") return "";
  return new URL(window.location.href).searchParams.get("companion_token") || localStorage.getItem(STORAGE_COMPANION_TOKEN) || "";
};
const normalizedProjectPath = (value: string) => value.trim().replace(/\\/g, "/").replace(/^\.\//, "");

const buildProjectBrowserRows = (files: ProjectFile[], collapsedFolders: Set<string>): ProjectBrowserRow[] => {
  const folders = new Set<string>();
  for (const file of files) {
    const parts = file.path.split("/");
    for (let index = 1; index < parts.length; index += 1) folders.add(parts.slice(0, index).join("/"));
  }
  const rows: ProjectBrowserRow[] = [
    ...[...folders].map((path) => ({ path, name: path.split("/").pop() || path, depth: path.split("/").length - 1, kind: "folder" as const })),
    ...files.map((file) => ({ path: file.path, name: file.path.split("/").pop() || file.path, depth: file.path.split("/").length - 1, kind: "file" as const, file })),
  ].sort((left, right) => left.path.localeCompare(right.path, undefined, { numeric: true }));

  return rows.filter((row) => {
    const parts = row.path.split("/");
    return !parts.slice(0, -1).some((_part, index) => collapsedFolders.has(parts.slice(0, index + 1).join("/")));
  });
};

const findCodeMatches = (source: string, query: string) => {
  if (!query) return [];
  const matches: number[] = [];
  const haystack = source.toLocaleLowerCase();
  const needle = query.toLocaleLowerCase();
  let offset = 0;
  while (offset <= haystack.length - needle.length) {
    const match = haystack.indexOf(needle, offset);
    if (match === -1) break;
    matches.push(match);
    offset = match + Math.max(needle.length, 1);
  }
  return matches;
};

function Icon({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true">{children}</span>;
}

export default function Playground() {
  const [presetIndex, setPresetIndex] = useState(0);
  const [projectName, setProjectName] = useState(PRESETS[0].name);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [code, setCode] = useState(PRESETS[0].code);
  const [files, setFiles] = useState<ProjectFile[]>([mainFile(PRESETS[0].code)]);
  const [activePath, setActivePath] = useState("main.js");
  const [openPaths, setOpenPaths] = useState<string[]>(["main.js"]);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [library, setLibrary] = useState<ProjectRecord[]>([]);
  const [sidebarMode, setSidebarMode] = useState<"files" | "library">("files");
  const [selectedProjectKey, setSelectedProjectKey] = useState("workspace");
  const [previewCollapsedFolders, setPreviewCollapsedFolders] = useState<Set<string>>(new Set());
  const [collapsedProjectGroups, setCollapsedProjectGroups] = useState<Set<string>>(new Set());
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>(initialProjectGroups);
  const [projectTreeMenu, setProjectTreeMenu] = useState<{ x: number; y: number; root: "browser" | "local"; parentId: string | null } | null>(null);
  const [codeSearchOpen, setCodeSearchOpen] = useState(false);
  const [codeSearchQuery, setCodeSearchQuery] = useState("");
  const [codeSearchIndex, setCodeSearchIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const [autoRun, setAutoRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(60);
  const [elapsed, setElapsed] = useState(0);
  const [resolution, setResolution] = useState({ width: 0, height: 0 });
  const [saved, setSaved] = useState(true);
  const [editorOpen, setEditorOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatConversations, setChatConversations] = useState<ChatConversationRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatOnline, setChatOnline] = useState<boolean | null>(null);
  const [companionNeedsPairing, setCompanionNeedsPairing] = useState(false);
  const [companionToken] = useState(initialCompanionToken);
  const [chatProgress, setChatProgress] = useState("");
  const [codexThreadId, setCodexThreadId] = useState<string | null>(null);
  const [undoFiles, setUndoFiles] = useState<ProjectFile[] | null>(null);
  const [fileBrowserMenu, setFileBrowserMenu] = useState<{ x: number; y: number } | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<GraphicsRuntime | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const assetRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const codeSearchRef = useRef<HTMLInputElement>(null);
  const pointer = useRef<PointerState>({ x: 0, y: 0, px: 0, py: 0, down: false, pressure: 0, kind: "touch" });
  const activePointer = useRef<{ id: number; kind: PointerState["kind"] } | null>(null);
  const startTime = useRef(0);
  const pausedAt = useRef(0);
  const lastFrame = useRef(0);
  const frameCount = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0, pixelRatio: 1 });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatConversationsRef = useRef<ChatConversationRecord[]>([]);
  const chatProjectIdRef = useRef<string | null>(null);
  const workspaceFilesRef = useRef<ProjectFile[]>([]);
  const hydratedWorkspaceRef = useRef<string | null>(null);
  const draftReadyRef = useRef(false);
  const preferencesReadyRef = useRef(false);
  const conversationsReadyRef = useRef(false);
  const codeRef = useRef(code);
  const autoRunRef = useRef(autoRun);
  const chatAbortRef = useRef<AbortController | null>(null);

  const lines = useMemo(() => code.split("\n").length, [code]);
  const projectFiles = useMemo(() => files.map((file) => file.path === activePath && file.kind === "text" ? { ...file, content: code } : file), [activePath, code, files]);
  const projectBrowserRows = useMemo(() => buildProjectBrowserRows(projectFiles, collapsedFolders), [collapsedFolders, projectFiles]);
  const visibleLibrary = useMemo(
    () => library.filter((project) => !(workspaceId && project.id === activeProjectId)),
    [activeProjectId, library, workspaceId],
  );
  const showWorkspaceInExplorer = Boolean(workspaceId || selectedProjectKey === "workspace");
  const projectSelectionKeys = useMemo(() => [
    ...(showWorkspaceInExplorer ? ["workspace"] : []),
    ...visibleLibrary.map((project) => `saved:${project.id}`),
    "starter:blank",
    ...PRESETS.map((_preset, index) => `starter:${index}`),
  ], [showWorkspaceInExplorer, visibleLibrary]);
  const selectedProject = useMemo(() => {
    if (selectedProjectKey.startsWith("saved:")) {
      const project = library.find((candidate) => `saved:${candidate.id}` === selectedProjectKey);
      if (project) return { name: project.name, files: project.files, detail: `Saved ${formatProjectTimestamp(project.updatedAt)}` };
    }
    if (selectedProjectKey === "starter:blank") return { name: "Blank Three.js", files: [mainFile(BLANK_PROJECT)], detail: "Starter · Three.js" };
    if (selectedProjectKey.startsWith("starter:")) {
      const preset = PRESETS[Number(selectedProjectKey.slice("starter:".length))];
      if (preset) return { name: preset.name, files: [mainFile(preset.code)], detail: "Starter · Three.js" };
    }
    return { name: projectName, files: projectFiles, detail: `Workspace · ${saved ? "saved" : "unsaved"}` };
  }, [library, projectFiles, projectName, saved, selectedProjectKey]);
  const selectedProjectRows = useMemo(
    () => buildProjectBrowserRows(selectedProject.files, previewCollapsedFolders),
    [previewCollapsedFolders, selectedProject.files],
  );
  const openFiles = useMemo(() => openPaths.map((path) => projectFiles.find((file) => file.path === path && file.kind === "text")).filter((file): file is ProjectFile & { kind: "text" } => Boolean(file)), [openPaths, projectFiles]);
  const codeSearchMatches = useMemo(() => findCodeMatches(code, codeSearchQuery), [code, codeSearchQuery]);
  const activeCodeSearchIndex = codeSearchMatches.length ? codeSearchIndex % codeSearchMatches.length : 0;
  const projectChatConversations = useMemo(
    () => chatConversations.filter((conversation) => conversation.projectId === activeProjectId),
    [activeProjectId, chatConversations],
  );

  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { autoRunRef.current = autoRun; }, [autoRun]);
  useEffect(() => { chatConversationsRef.current = chatConversations; }, [chatConversations]);
  useEffect(() => { localStorage.setItem(STORAGE_PROJECT_GROUPS, JSON.stringify(projectGroups)); }, [projectGroups]);
  useEffect(() => {
    const url = new URL(window.location.href);
    const pairedToken = url.searchParams.get("companion_token");
    if (!pairedToken) return;
    localStorage.setItem(STORAGE_COMPANION_TOKEN, pairedToken);
    url.searchParams.delete("companion_token");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
  useEffect(() => {
    if (sidebarMode !== "library") return;
    const id = `project-${selectedProjectKey.replace(/[^a-z0-9_-]/gi, "-")}`;
    document.getElementById(id)?.scrollIntoView({ block: "nearest" });
  }, [selectedProjectKey, sidebarMode]);
  useEffect(() => {
    if (!codeSearchOpen) return;
    const timer = window.setTimeout(() => codeSearchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [codeSearchOpen]);
  useEffect(() => {
    const editor = editorRef.current;
    const offset = codeSearchMatches[activeCodeSearchIndex];
    if (!editor || offset === undefined) return;
    editor.setSelectionRange(offset, offset + codeSearchQuery.length);
    const line = code.slice(0, offset).split("\n").length - 1;
    editor.scrollTop = Math.max(0, line * 18.7 - editor.clientHeight / 2);
  }, [activeCodeSearchIndex, code, codeSearchMatches, codeSearchQuery]);

  const teardown = useCallback(() => {
    const runtime = runtimeRef.current;
    if (runtime) {
      try { runtime.dispose?.(); } catch { /* user cleanup must not block restart */ }
      if (!runtime.dispose) {
        disposeScene(runtime.scene);
        runtime.renderer?.dispose();
      }
    }
    runtimeRef.current = null;
    mountRef.current?.replaceChildren();
  }, []);

  const currentViewport = useCallback((): ResizeArgs => {
    const stage = stageRef.current;
    const rect = stage?.getBoundingClientRect();
    return {
      width: Math.max(1, Math.floor(rect?.width ?? 1)),
      height: Math.max(1, Math.floor(rect?.height ?? 1)),
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    };
  }, []);

  const runSource = useCallback((sourceFiles: ProjectFile[], entry = "main.js") => {
    const mount = mountRef.current;
    if (!mount) return "Preview mount is unavailable";
    teardown();
    try {
      const viewport = currentViewport();
      const runtime = compileProject(sourceFiles, entry, mount, viewport);
      runtimeRef.current = runtime;
      runtime.resize?.(viewport);
      runtime.frame?.({ time: 0, delta: 0, frame: 0, pointer: pointer.current });
      sizeRef.current = viewport;
      setResolution({ width: viewport.width, height: viewport.height });
      const now = performance.now();
      startTime.current = now;
      lastFrame.current = now;
      setElapsed(0);
      setError(null);
      setRunning(true);
      return null;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Import error";
      setError(message);
      setRunning(false);
      return message;
    }
  }, [currentViewport, teardown]);

  const runCode = useCallback(() => {
    const mount = mountRef.current;
    if (!mount) return;
    teardown();
    try {
      const viewport = currentViewport();
      const runtime = compileProject(projectFiles, "main.js", mount, viewport);
      runtimeRef.current = runtime;
      runtime.resize?.(viewport);
      runtime.frame?.({ time: 0, delta: 0, frame: 0, pointer: pointer.current });
      sizeRef.current = viewport;
      setResolution({ width: viewport.width, height: viewport.height });
      setError(null);
      setSaved(false);
      void putDraft({ id: "current", projectId: activeProjectId, name: projectName, entry: "main.js", runtimeId: "three", files: projectFiles, activePath, saved, workspaceId, workspaceName });
      startTime.current = performance.now();
      lastFrame.current = startTime.current;
      frameCount.current = 0;
      setElapsed(0);
      setRunning(true);
    } catch (caught) {
      teardown();
      setError(caught instanceof Error ? caught.message : "Unknown module error");
      setRunning(false);
    }
  }, [activePath, activeProjectId, currentViewport, projectFiles, projectName, saved, teardown, workspaceId, workspaceName]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let sourceToRestore: ProjectFile[] = [mainFile(PRESETS[0].code)];
      try {
        let storedProjects = await listProjects();
        if (!storedProjects.length) {
          const legacy = JSON.parse(localStorage.getItem(STORAGE_LIBRARY) ?? "[]") as LegacyProject[];
          if (Array.isArray(legacy)) {
            storedProjects = legacy.filter((item) => item?.code).map((item) => ({
              id: item.id, name: item.name, entry: "main.js", runtimeId: "three", files: [mainFile(item.code)], updatedAt: item.updatedAt,
            }));
            await Promise.all(storedProjects.map(putProject));
          }
        }
        if (!cancelled) setLibrary(storedProjects);
        let draft = await getDraft();
        if (!draft) {
          const legacyDraft = JSON.parse(localStorage.getItem(STORAGE_DRAFT) ?? "null") as LegacyDraft | null;
          if (legacyDraft?.code) {
            draft = {
              id: "current", projectId: legacyDraft.activeProjectId ?? null, name: legacyDraft.projectName || "Untitled sketch", entry: "main.js",
              runtimeId: "three", files: [mainFile(legacyDraft.code)], activePath: "main.js", saved: legacyDraft.saved ?? false,
            };
          }
        }
        const restoredProjectId = draft?.projectId ?? crypto.randomUUID();
        if (draft?.files.length) {
          sourceToRestore = draft.files;
          const restoredPath = draft.files.some((file) => file.path === draft.activePath && file.kind === "text") ? draft.activePath : draft.entry;
          const restoredFile = draft.files.find((file) => file.path === restoredPath);
          if (!cancelled && restoredFile?.kind === "text") {
            setFiles(draft.files);
            setActivePath(restoredPath);
            setOpenPaths([restoredPath]);
            setCode(restoredFile.content);
            setProjectName(draft.name || "Untitled sketch");
            setActiveProjectId(restoredProjectId);
            setWorkspaceId(draft.workspaceId ?? null);
            setWorkspaceName(draft.workspaceName ?? null);
            workspaceFilesRef.current = draft.workspaceId ? draft.files : [];
            setSaved(draft.saved);
          }
        } else if (!cancelled) {
          setActiveProjectId(restoredProjectId);
        }
        const legacyMessages = JSON.parse(localStorage.getItem(STORAGE_CHAT) ?? "[]") as ChatMessage[];
        const legacyThreadId = localStorage.getItem(STORAGE_THREAD);
        let conversations = await listChatConversations();
        const unscopedConversations = conversations.filter((conversation) => conversation.projectId === null);
        if (unscopedConversations.length) {
          const migratedConversations = unscopedConversations.map((conversation) => ({
            ...conversation,
            projectId: restoredProjectId,
            projectName: draft?.name || conversation.projectName || PRESETS[0].name,
          }));
          await Promise.all(migratedConversations.map(putChatConversation));
          conversations = conversations.map((conversation) => migratedConversations.find((migrated) => migrated.id === conversation.id) ?? conversation);
        }
        let projectConversations = conversations.filter((conversation) => conversation.projectId === restoredProjectId);
        if (!projectConversations.length) {
          const now = new Date().toISOString();
          const migrated: ChatConversationRecord = {
            id: crypto.randomUUID(),
            title: chatTitle(Array.isArray(legacyMessages) ? legacyMessages : []),
            threadId: legacyThreadId,
            projectId: restoredProjectId,
            projectName: draft?.name || PRESETS[0].name,
            messages: Array.isArray(legacyMessages) ? legacyMessages : [],
            createdAt: now,
            updatedAt: now,
          };
          await putChatConversation(migrated);
          conversations = [migrated, ...conversations];
          projectConversations = [migrated];
        }
        const storedActiveId = localStorage.getItem(activeChatStorageKey(restoredProjectId)) ?? localStorage.getItem(STORAGE_ACTIVE_CHAT);
        const activeConversation = projectConversations.find((conversation) => conversation.id === storedActiveId) ?? projectConversations[0];
        if (!cancelled && activeConversation) {
          setChatConversations(conversations);
          setActiveConversationId(activeConversation.id);
          setChatMessages(activeConversation.messages);
          setCodexThreadId(activeConversation.threadId);
          localStorage.setItem(activeChatStorageKey(restoredProjectId), activeConversation.id);
          chatProjectIdRef.current = restoredProjectId;
          conversationsReadyRef.current = true;
        }
        const preferences = JSON.parse(localStorage.getItem(STORAGE_PREFERENCES) ?? "{}") as StudioPreferences;
        if (!cancelled) {
          setChatOpen(preferences.chatOpen ?? false);
          setAutoRun(preferences.autoRun ?? false);
          setEditorOpen(preferences.editorOpen ?? true);
          setSidebarMode(preferences.sidebarMode === "library" ? "library" : "files");
          if (Array.isArray(preferences.openPaths)) {
            const restoredOpenPaths = preferences.openPaths.filter((path) => sourceToRestore.some((file) => file.path === path && file.kind === "text"));
            setOpenPaths(restoredOpenPaths.length ? restoredOpenPaths : [draft?.entry || "main.js"]);
          }
        }
      } catch { /* fall back to the starter project */ }
      if (cancelled) return;
      draftReadyRef.current = true;
      preferencesReadyRef.current = true;
      runSource(sourceToRestore);
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!draftReadyRef.current) return;
    const timer = window.setTimeout(() => {
      void putDraft({ id: "current", projectId: activeProjectId, name: projectName, entry: "main.js", runtimeId: "three", files: projectFiles, activePath, saved, workspaceId, workspaceName });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activePath, activeProjectId, projectFiles, projectName, saved, workspaceId, workspaceName]);

  useEffect(() => {
    if (!draftReadyRef.current || !workspaceId) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const previous = workspaceFilesRef.current;
        const previousByPath = new Map(previous.map((file) => [file.path, file]));
        const currentPaths = new Set(projectFiles.map((file) => file.path));
        const changed = projectFiles.filter((file) => !sameProjectFile(previousByPath.get(file.path), file));
        const removedPaths = previous.filter((file) => !currentPaths.has(file.path)).map((file) => file.path);
        if (!changed.length && !removedPaths.length) return;
        try {
          const serialized = await serializeWorkspaceFiles(changed);
          const response = await fetch(`${CODEX_BRIDGE}/workspaces/${workspaceId}/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(companionToken ? { "X-JSLIFE-Companion-Token": companionToken } : {}),
            },
            body: JSON.stringify({ files: serialized, removedPaths }),
          });
          if (!response.ok) {
            const body = await response.json().catch(() => ({})) as { error?: string };
            throw new Error(body.error || `Companion returned ${response.status}`);
          }
          if (cancelled) return;
          workspaceFilesRef.current = projectFiles;
          setSaved(true);
        } catch (caught) {
          if (!cancelled) setError(`Local save failed: ${caught instanceof Error ? caught.message : "Companion is unavailable"}`);
        }
      })();
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [companionToken, projectFiles, workspaceId]);

  useEffect(() => {
    if (!draftReadyRef.current || !workspaceId || hydratedWorkspaceRef.current === workspaceId) return;
    hydratedWorkspaceRef.current = workspaceId;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`${CODEX_BRIDGE}/workspaces/${workspaceId}`, {
          headers: companionToken ? { "X-JSLIFE-Companion-Token": companionToken } : undefined,
        });
        if (!response.ok) return;
        const workspace = await response.json() as LocalWorkspaceResponse;
        const nextFiles = localWorkspaceFiles(workspace);
        const entryFile = nextFiles.find((file) => file.path === "main.js" && file.kind === "text");
        if (cancelled || !entryFile || entryFile.kind !== "text") return;
        workspaceFilesRef.current = nextFiles;
        setFiles(nextFiles);
        setWorkspaceName(workspace.folderName ?? workspace.name);
        setProjectName(workspace.name);
        const nextActivePath = nextFiles.some((file) => file.path === activePath && file.kind === "text") ? activePath : "main.js";
        const activeFile = nextFiles.find((file) => file.path === nextActivePath);
        setActivePath(nextActivePath);
        setOpenPaths((current) => current.filter((path) => nextFiles.some((file) => file.path === path && file.kind === "text")));
        if (activeFile?.kind === "text") setCode(activeFile.content);
        setSaved(true);
        runSource(nextFiles);
      } catch { /* keep the IndexedDB draft when Companion is offline */ }
    })();
    return () => { cancelled = true; };
  }, [activePath, companionToken, runSource, workspaceId]);

  useEffect(() => {
    if (!preferencesReadyRef.current) return;
    localStorage.setItem(STORAGE_PREFERENCES, JSON.stringify({ chatOpen, autoRun, editorOpen, openPaths, sidebarMode }));
  }, [autoRun, chatOpen, editorOpen, openPaths, sidebarMode]);

  useEffect(() => {
    if (!conversationsReadyRef.current || !activeConversationId) return;
    const timer = window.setTimeout(() => {
      const existing = chatConversationsRef.current.find((conversation) => conversation.id === activeConversationId);
      if (!existing) return;
      const updated: ChatConversationRecord = {
        ...existing,
        projectName,
        title: chatTitle(chatMessages),
        threadId: codexThreadId,
        messages: chatMessages,
        updatedAt: new Date().toISOString(),
      };
      const next = [updated, ...chatConversationsRef.current.filter((conversation) => conversation.id !== activeConversationId)];
      chatConversationsRef.current = next;
      setChatConversations(next);
      void putChatConversation(updated);
      localStorage.setItem(activeChatStorageKey(existing.projectId), activeConversationId);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [activeConversationId, chatMessages, codexThreadId, projectName]);

  useEffect(() => {
    if (!conversationsReadyRef.current || !activeProjectId || chatProjectIdRef.current === activeProjectId) return;
    chatProjectIdRef.current = activeProjectId;
    const projectConversations = chatConversationsRef.current.filter((conversation) => conversation.projectId === activeProjectId);
    const storedActiveId = localStorage.getItem(activeChatStorageKey(activeProjectId));
    const activeConversation = projectConversations.find((conversation) => conversation.id === storedActiveId) ?? projectConversations[0];
    if (activeConversation) {
      setActiveConversationId(activeConversation.id);
      setChatMessages(activeConversation.messages);
      setCodexThreadId(activeConversation.threadId);
      localStorage.setItem(activeChatStorageKey(activeProjectId), activeConversation.id);
      return;
    }
    const now = new Date().toISOString();
    const conversation: ChatConversationRecord = {
      id: crypto.randomUUID(),
      title: "新しい会話",
      threadId: null,
      projectId: activeProjectId,
      projectName,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    const next = [conversation, ...chatConversationsRef.current];
    chatConversationsRef.current = next;
    setChatConversations(next);
    setActiveConversationId(conversation.id);
    setChatMessages([]);
    setCodexThreadId(null);
    localStorage.setItem(activeChatStorageKey(activeProjectId), conversation.id);
    void putChatConversation(conversation);
  }, [activeProjectId, projectName]);

  const checkCodex = useCallback(async () => {
    if (IS_STATIC_SHOWCASE) {
      setChatOnline(false);
      return;
    }
    setChatOnline(null);
    try {
      const response = await fetch(`${CODEX_BRIDGE}/health`, {
        cache: "no-store",
        headers: companionToken ? { "X-JSLIFE-Companion-Token": companionToken } : undefined,
      });
      setCompanionNeedsPairing(response.status === 401);
      setChatOnline(response.ok);
    } catch {
      setCompanionNeedsPairing(false);
      setChatOnline(false);
    }
  }, [companionToken]);

  useEffect(() => {
    const timer = window.setTimeout(checkCodex, 0);
    return () => window.clearTimeout(timer);
  }, [checkCodex]);

  useEffect(() => {
    const timer = window.setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    return () => window.clearTimeout(timer);
  }, [chatMessages, chatBusy, chatOpen]);

  useEffect(() => {
    if (!autoRun) return;
    const timer = window.setTimeout(runCode, 700);
    return () => window.clearTimeout(timer);
  }, [autoRun, code, runCode]);

  useEffect(() => {
    let raf = 0;
    let sampleFrames = 0;
    let sampleStarted = performance.now();
    const draw = (now: number) => {
      const runtime = runtimeRef.current;
      if (runtime && running) {
        const viewport = currentViewport();
        const previous = sizeRef.current;
        if (viewport.width !== previous.width || viewport.height !== previous.height || viewport.pixelRatio !== previous.pixelRatio) {
          runtime.resize?.(viewport);
          sizeRef.current = viewport;
          setResolution({ width: viewport.width, height: viewport.height });
        }
        const time = (now - startTime.current) / 1000;
        const delta = Math.min((now - lastFrame.current) / 1000, 0.1);
        try {
          runtime.frame?.({ time, delta, frame: frameCount.current, pointer: pointer.current });
          setElapsed(time);
          setError(null);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Runtime error");
          setRunning(false);
        }
        lastFrame.current = now;
        frameCount.current += 1;
        sampleFrames += 1;
        if (now - sampleStarted > 700) {
          setFps(Math.round((sampleFrames * 1000) / (now - sampleStarted)));
          sampleFrames = 0;
          sampleStarted = now;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [currentViewport, running]);

  useEffect(() => () => teardown(), [teardown]);

  const saveProject = async () => {
    const now = new Date().toISOString();
    const id = activeProjectId ?? crypto.randomUUID();
    const project: ProjectRecord = {
      id, name: projectName.trim() || "Untitled sketch", entry: "main.js", runtimeId: "three", files: projectFiles, updatedAt: now,
    };
    await putProject(project);
    const next = [project, ...library.filter((item) => item.id !== id)];
    setLibrary(next);
    setActiveProjectId(id);
    setSelectedProjectKey(`saved:${id}`);
    setSaved(true);
  };

  const loadProject = (project: ProjectRecord, stayInProjectBrowser = false) => {
    const entryFile = project.files.find((file) => file.path === project.entry);
    if (!entryFile || entryFile.kind !== "text") return;
    saveCurrentConversation();
    setWorkspaceId(null);
    setWorkspaceName(null);
    workspaceFilesRef.current = [];
    hydratedWorkspaceRef.current = null;
    setProjectName(project.name);
    setFiles(project.files);
    setActivePath(project.entry);
    setOpenPaths([project.entry]);
    setCode(entryFile.content);
    setActiveProjectId(project.id);
    setSelectedProjectKey(`saved:${project.id}`);
    setSaved(true);
    if (!stayInProjectBrowser) setSidebarMode("files");
    window.setTimeout(() => runSource(project.files, project.entry), 0);
  };

  const selectFile = (path: string) => {
    const nextFiles = projectFiles;
    const file = nextFiles.find((candidate) => candidate.path === path);
    setFiles(nextFiles);
    setActivePath(path);
    if (file?.kind === "text") {
      setOpenPaths((current) => current.includes(path) ? current : [...current, path]);
      setCode(file.content);
    }
  };

  const closeFileTab = (path: string) => {
    const nextOpenPaths = openPaths.filter((candidate) => candidate !== path);
    if (path !== activePath) return setOpenPaths(nextOpenPaths);
    const fallbackPath = nextOpenPaths.find((candidate) => projectFiles.some((file) => file.path === candidate && file.kind === "text"))
      || projectFiles.find((file) => file.path === "main.js" && file.kind === "text")?.path
      || projectFiles.find((file) => file.kind === "text")?.path;
    if (!fallbackPath) return;
    setOpenPaths(nextOpenPaths.includes(fallbackPath) ? nextOpenPaths : [...nextOpenPaths, fallbackPath]);
    selectFile(fallbackPath);
  };

  const renameProjectFile = (path: string) => {
    if (path === "main.js") return setError("main.js is the project entry and cannot be renamed");
    const requested = window.prompt("Rename project file", path);
    if (!requested) return;
    const destination = normalizedProjectPath(requested);
    if (!destination || destination.startsWith("/") || destination.split("/").includes("..")) return setError("Choose a relative project path");
    if (projectFiles.some((file) => file.path === destination)) return setError("A project file already exists at that path");
    const nextFiles = projectFiles.map((file) => file.path === path ? { ...file, path: destination } : file);
    setFiles(nextFiles);
    setOpenPaths((current) => current.map((candidate) => candidate === path ? destination : candidate));
    if (activePath === path) setActivePath(destination);
    setSaved(false);
  };

  const deleteProjectFile = (path: string) => {
    if (path === "main.js") return setError("main.js is the project entry and cannot be deleted");
    if (!window.confirm(`Delete ${path} from this project?`)) return;
    const nextFiles = projectFiles.filter((file) => file.path !== path);
    setFiles(nextFiles);
    setOpenPaths((current) => current.filter((candidate) => candidate !== path));
    if (activePath === path) {
      const fallback = nextFiles.find((file) => file.path === "main.js" && file.kind === "text") || nextFiles.find((file) => file.kind === "text");
      if (fallback?.kind === "text") {
        setActivePath(fallback.path);
        setOpenPaths((current) => current.includes(fallback.path) ? current : [...current, fallback.path]);
        setCode(fallback.content);
      }
    }
    setSaved(false);
  };

  const addTextFile = () => {
    const requested = window.prompt("New project file", "module.js");
    if (!requested) return;
    const path = normalizedProjectPath(requested);
    if (!path || path.startsWith("/") || path.split("/").includes("..")) return setError("Choose a relative project path");
    if (projectFiles.some((file) => file.path === path)) return selectFile(path);
    const mimeType = path.endsWith(".glsl") || path.endsWith(".frag") || path.endsWith(".vert") ? "text/plain" : path.endsWith(".json") ? "application/json" : "text/javascript";
    const file: ProjectFile = { path, kind: "text", mimeType, content: "" };
    setFiles([...projectFiles, file]);
    setActivePath(path);
    setOpenPaths((current) => [...current, path]);
    setCode("");
    setSaved(false);
  };

  const addAssets = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = [...(event.target.files ?? [])];
    if (!incoming.length) return;
    const next = [...projectFiles];
    for (const file of incoming) {
      const path = `assets/${file.name}`;
      const replacement: ProjectFile = { path, kind: "asset", mimeType: file.type || "application/octet-stream", content: file };
      const index = next.findIndex((candidate) => candidate.path === path);
      if (index === -1) next.push(replacement); else next[index] = replacement;
    }
    setFiles(next);
    setSaved(false);
    event.target.value = "";
  };

  const openCodeSearch = () => {
    const editor = editorRef.current;
    const selection = editor?.value.slice(editor.selectionStart, editor.selectionEnd) ?? "";
    if (selection && !selection.includes("\n")) setCodeSearchQuery(selection);
    setCodeSearchIndex(0);
    setCodeSearchOpen(true);
  };

  const closeCodeSearch = () => {
    setCodeSearchOpen(false);
    window.setTimeout(() => editorRef.current?.focus(), 0);
  };

  const toggleEditor = () => {
    if (editorOpen) setCodeSearchOpen(false);
    setEditorOpen(!editorOpen);
  };

  const stepCodeSearch = (direction: 1 | -1) => {
    if (!codeSearchMatches.length) return;
    setCodeSearchIndex((index) => (index + direction + codeSearchMatches.length) % codeSearchMatches.length);
  };

  const choosePreset = (index: number, stayInProjectBrowser = false) => {
    const preset = PRESETS[index];
    const nextFiles = [mainFile(preset.code)];
    saveCurrentConversation();
    setWorkspaceId(null);
    setWorkspaceName(null);
    workspaceFilesRef.current = [];
    hydratedWorkspaceRef.current = null;
    setPresetIndex(index);
    setProjectName(preset.name);
    setFiles(nextFiles);
    setActivePath("main.js");
    setOpenPaths(["main.js"]);
    setCode(preset.code);
    setActiveProjectId(crypto.randomUUID());
    setSelectedProjectKey(`starter:${index}`);
    setSaved(false);
    if (!stayInProjectBrowser) setSidebarMode("files");
    runSource(nextFiles);
  };

  const createBlankProject = (stayInProjectBrowser = false) => {
    if (!saved && !window.confirm("Discard the current unsaved changes and create a blank project?")) return;
    const nextFiles = [mainFile(BLANK_PROJECT)];
    saveCurrentConversation();
    setWorkspaceId(null);
    setWorkspaceName(null);
    workspaceFilesRef.current = [];
    hydratedWorkspaceRef.current = null;
    setPresetIndex(0);
    setProjectName("Untitled Project");
    setFiles(nextFiles);
    setActivePath("main.js");
    setOpenPaths(["main.js"]);
    setCode(BLANK_PROJECT);
    setActiveProjectId(crypto.randomUUID());
    setSelectedProjectKey("starter:blank");
    setUndoFiles(null);
    setSaved(false);
    if (!stayInProjectBrowser) setSidebarMode("files");
    runSource(nextFiles);
  };

  const openLocalWorkspace = async () => {
    if (IS_STATIC_SHOWCASE) {
      setChatOpen(true);
      return;
    }
    try {
      const response = await fetch(`${CODEX_BRIDGE}/workspaces/open`, {
        method: "POST",
        headers: companionToken ? { "X-JSLIFE-Companion-Token": companionToken } : undefined,
      });
      const body = await response.json() as LocalWorkspaceResponse & { error?: string };
      if (!response.ok) {
        if (response.status === 409) return;
        throw new Error(body.error || `Companion returned ${response.status}`);
      }
      const nextFiles = localWorkspaceFiles(body);
      const entryFile = nextFiles.find((file) => file.path === "main.js" && file.kind === "text");
      if (!entryFile || entryFile.kind !== "text") throw new Error("Selected folder needs a text main.js file");
      saveCurrentConversation();
      workspaceFilesRef.current = nextFiles;
      hydratedWorkspaceRef.current = body.workspaceId;
      setWorkspaceId(body.workspaceId);
      setWorkspaceName(body.folderName ?? body.name);
      setProjectName(body.name);
      setFiles(nextFiles);
      setActivePath("main.js");
      setOpenPaths(["main.js"]);
      setCode(entryFile.content);
      setActiveProjectId(`local:${body.workspaceId}`);
      setSelectedProjectKey("workspace");
      setUndoFiles(null);
      setSaved(true);
      setSidebarMode("files");
      runSource(nextFiles);
      setError(null);
    } catch (caught) {
      setError(`Could not open local folder: ${caught instanceof Error ? caught.message : "Companion is unavailable"}`);
    }
  };

  const moveToLocalWorkspace = async () => {
    if (IS_STATIC_SHOWCASE || workspaceId) return;
    const confirmed = window.confirm("Move this project to ~/Library/Application Support/JSLIFE/Projects/? The browser-saved version will be kept as a backup.");
    if (!confirmed) return;
    try {
      const serialized = await serializeWorkspaceFiles(projectFiles);
      const response = await fetch(`${CODEX_BRIDGE}/workspaces/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(companionToken ? { "X-JSLIFE-Companion-Token": companionToken } : {}),
        },
        body: JSON.stringify({ projectName, files: serialized }),
      });
      const body = await response.json() as LocalWorkspaceResponse & { error?: string };
      if (!response.ok) {
        if (response.status === 409) return;
        throw new Error(body.error || `Desktop service returned ${response.status}`);
      }
      const nextFiles = localWorkspaceFiles(body);
      const entryFile = nextFiles.find((file) => file.path === "main.js" && file.kind === "text");
      if (!entryFile || entryFile.kind !== "text") throw new Error("The selected folder could not be opened as a JSLIFE project");

      const now = new Date().toISOString();
      const backupId = activeProjectId ?? crypto.randomUUID();
      const backup: ProjectRecord = {
        id: backupId,
        name: projectName.trim() || "Untitled sketch",
        entry: "main.js",
        runtimeId: "three",
        files: projectFiles,
        updatedAt: now,
      };
      await putProject(backup);
      setLibrary((current) => [backup, ...current.filter((project) => project.id !== backupId)]);
      workspaceFilesRef.current = nextFiles;
      hydratedWorkspaceRef.current = body.workspaceId;
      setWorkspaceId(body.workspaceId);
      setWorkspaceName(body.folderName ?? body.name);
      setProjectName(body.name);
      setFiles(nextFiles);
      setActivePath("main.js");
      setOpenPaths(["main.js"]);
      setCode(entryFile.content);
      setActiveProjectId(backupId);
      setSelectedProjectKey("workspace");
      setUndoFiles(null);
      setSaved(true);
      setSidebarMode("files");
      runSource(nextFiles);
      setError(null);
    } catch (caught) {
      setError(`Could not move project: ${caught instanceof Error ? caught.message : "Desktop service is unavailable"}`);
    }
  };

  const revealLocalWorkspace = async () => {
    if (!workspaceId) return;
    setFileBrowserMenu(null);
    try {
      const response = await fetch(`${CODEX_BRIDGE}/workspaces/${workspaceId}/reveal`, {
        method: "POST",
        headers: companionToken ? { "X-JSLIFE-Companion-Token": companionToken } : undefined,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || `Desktop service returned ${response.status}`);
      }
    } catch (caught) {
      setError(`Could not open Finder: ${caught instanceof Error ? caught.message : "Desktop service is unavailable"}`);
    }
  };

  useEffect(() => {
    if (!fileBrowserMenu && !projectTreeMenu) return;
    const closeMenu = () => { setFileBrowserMenu(null); setProjectTreeMenu(null); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closeMenu(); };
    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [fileBrowserMenu, projectTreeMenu]);

  const openProjectBrowser = () => {
    setSidebarMode("library");
    setEditorOpen(true);
  };

  const activateProjectSelection = (key = selectedProjectKey) => {
    if (key === "workspace") {
      return;
    }
    if (key.startsWith("saved:")) {
      const project = library.find((candidate) => `saved:${candidate.id}` === key);
      if (project) loadProject(project, true);
      return;
    }
    if (key === "starter:blank") {
      createBlankProject(true);
      return;
    }
    if (key.startsWith("starter:")) {
      const index = Number(key.slice("starter:".length));
      if (PRESETS[index]) choosePreset(index, true);
    }
  };

  const handleProjectBrowserKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      activateProjectSelection();
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const currentIndex = Math.max(0, projectSelectionKeys.indexOf(selectedProjectKey));
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = Math.min(projectSelectionKeys.length - 1, Math.max(0, currentIndex + direction));
    setSelectedProjectKey(projectSelectionKeys[nextIndex]);
  };

  const selectExplorerProject = (key: string) => {
    setSelectedProjectKey(key);
    setPreviewCollapsedFolders(new Set());
  };

  const toggleProjectGroup = (group: string) => setCollapsedProjectGroups((current) => {
    const next = new Set(current);
    if (next.has(group)) next.delete(group); else next.add(group);
    return next;
  });

  const openProjectGroupMenu = (event: React.MouseEvent, root: "browser" | "local", parentId: string | null) => {
    event.preventDefault();
    event.stopPropagation();
    setProjectTreeMenu({
      x: Math.min(event.clientX, window.innerWidth - 190),
      y: Math.min(event.clientY, window.innerHeight - 48),
      root,
      parentId,
    });
  };

  const addProjectGroup = () => {
    if (!projectTreeMenu) return;
    const name = window.prompt("Group name");
    if (!name?.trim()) return;
    const group: ProjectGroup = {
      id: crypto.randomUUID(),
      name: name.trim(),
      root: projectTreeMenu.root,
      parentId: projectTreeMenu.parentId,
    };
    setProjectGroups((current) => [...current, group]);
    if (group.parentId) setCollapsedProjectGroups((current) => {
      const next = new Set(current);
      next.delete(`group:${group.parentId}`);
      return next;
    });
    setCollapsedProjectGroups((current) => {
      const next = new Set(current);
      next.delete(group.root);
      return next;
    });
    setProjectTreeMenu(null);
  };

  const renderProjectGroupFolders = (root: "browser" | "local", parentId: string | null, depth = 1): React.ReactNode => projectGroups
    .filter((group) => group.root === root && group.parentId === parentId)
    .map((group) => {
      const collapseKey = `group:${group.id}`;
      const collapsed = collapsedProjectGroups.has(collapseKey);
      const childCount = projectGroups.filter((candidate) => candidate.parentId === group.id).length;
      return <div className="project-tree-folder-node" key={group.id}>
        <button
          className="project-tree-folder"
          style={{ paddingLeft: 9 + depth * 13 }}
          onClick={() => toggleProjectGroup(collapseKey)}
          onContextMenu={(event) => openProjectGroupMenu(event, root, group.id)}
        ><span>{collapsed ? "▸" : "▾"}</span><i>▱</i><strong>{group.name}</strong>{childCount > 0 && <small>{childCount}</small>}</button>
        {!collapsed && renderProjectGroupFolders(root, group.id, depth + 1)}
      </div>;
    });

  const renderExplorerProject = (
    key: string,
    name: string,
    detail: string,
    options?: { accent?: string; blank?: boolean; loaded?: boolean; package?: boolean; onDelete?: () => void },
  ) => {
    return <div className={`project-explorer-entry${selectedProjectKey === key ? " project-explorer-selected" : ""}${options?.loaded ? " project-explorer-loaded" : ""}`} key={key}>
      <div className="project-explorer-project">
        <button id={`project-${key.replace(/[^a-z0-9_-]/gi, "-")}`} role="option" aria-selected={selectedProjectKey === key} className="project-explorer-select" onClick={() => selectExplorerProject(key)} onDoubleClick={() => activateProjectSelection(key)}>
          <i className={options?.blank ? "project-explorer-blank" : options?.package ? "project-explorer-package" : ""} style={{ "--swatch": options?.accent ?? "var(--purple)" } as React.CSSProperties}>{options?.blank ? "＋" : options?.package ? "J" : "▱"}</i>
          <span><strong>{name}{options?.package && !name.endsWith(".jslife") ? ".jslife" : ""}</strong><small>{detail}</small></span>
        </button>
        {options?.onDelete && <button className="project-explorer-delete" onClick={options.onDelete} aria-label={`Delete ${name}`} title="Delete">×</button>}
      </div>
    </div>;
  };

  const toggleRunning = () => {
    if (running) {
      pausedAt.current = elapsed;
      setRunning(false);
    } else {
      startTime.current = performance.now() - pausedAt.current * 1000;
      lastFrame.current = performance.now();
      setRunning(true);
    }
  };

  const download = (filename: string, contents: Blob | string, type?: string) => {
    const blob = contents instanceof Blob ? contents : new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportProject = async () => {
    const project: ProjectRecord = {
      id: activeProjectId ?? crypto.randomUUID(), name: projectName, entry: "main.js", runtimeId: "three", files: projectFiles, updatedAt: new Date().toISOString(),
    };
    download(`${safeName(projectName)}.jslife`, await packProject(project));
  };
  const exportLibrary = () => download("jslife-library.json", JSON.stringify({
    version: 2,
    projects: library.map((project) => ({ ...project, files: project.files.filter((file) => file.kind === "text") })),
    note: "Text backup only. Export individual .jslife projects to include binary assets.",
  }, null, 2), "application/json");

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.name.toLowerCase().endsWith(".jslife")) {
        const project = await unpackProject(file);
        setLibrary([project, ...library]);
        await putProject(project);
        loadProject(project);
      } else if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(await file.text()) as { projects?: Array<ProjectRecord | LegacyProject> } | Array<ProjectRecord | LegacyProject>;
        const incoming = Array.isArray(parsed) ? parsed : parsed.projects;
        if (!Array.isArray(incoming)) throw new Error("Library JSON has no projects array");
        const projects = incoming.map<ProjectRecord>((project) => "files" in project ? project : {
          id: project.id, name: project.name, entry: "main.js", runtimeId: "three", files: [mainFile(project.code)], updatedAt: project.updatedAt,
        });
        await Promise.all(projects.map(putProject));
        setLibrary([...projects, ...library.filter((item) => !projects.some((candidate) => candidate.id === item.id))]);
        setSidebarMode("library");
        setEditorOpen(true);
      } else {
        const text = await file.text();
        const nextFiles = [mainFile(text)];
        saveCurrentConversation();
        setWorkspaceId(null);
        setWorkspaceName(null);
        workspaceFilesRef.current = [];
        hydratedWorkspaceRef.current = null;
        setProjectName(file.name.replace(/\.js$/i, ""));
        setFiles(nextFiles);
        setActivePath("main.js");
        setOpenPaths(["main.js"]);
        setCode(text);
        setActiveProjectId(crypto.randomUUID());
        setSaved(false);
        runSource(nextFiles);
      }
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not import file");
    } finally {
      event.target.value = "";
    }
  };

  const pointerKind = (event: React.PointerEvent<HTMLDivElement>): PointerState["kind"] => event.pointerType === "touch" || event.pointerType === "pen" ? event.pointerType : "mouse";

  const updatePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointer.current.px = event.clientX - rect.left;
    pointer.current.py = event.clientY - rect.top;
    pointer.current.x = (pointer.current.px / rect.width) * 2 - 1;
    pointer.current.y = -(pointer.current.py / rect.height) * 2 + 1;
    pointer.current.pressure = event.pressure;
    pointer.current.kind = pointerKind(event);
  };

  const beginPadInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    const kind = pointerKind(event);
    const active = activePointer.current;
    if (active && active.id !== event.pointerId) {
      if (active.kind === "touch" || kind !== "touch") return;
      if (event.currentTarget.hasPointerCapture(active.id)) event.currentTarget.releasePointerCapture(active.id);
    }
    event.preventDefault();
    activePointer.current = { id: event.pointerId, kind };
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current.down = true;
    updatePointer(event);
  };

  const movePadInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointer.current.down || activePointer.current?.id !== event.pointerId) return;
    event.preventDefault();
    updatePointer(event);
  };

  const endPadInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current?.id !== event.pointerId) return;
    event.preventDefault();
    updatePointer(event);
    pointer.current.down = false;
    pointer.current.pressure = 0;
    activePointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const losePadInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current?.id !== event.pointerId) return;
    pointer.current.down = false;
    pointer.current.pressure = 0;
    activePointer.current = null;
  };

  const capturePreview = () => {
    const sourceCanvas = mountRef.current?.querySelector("canvas");
    if (!sourceCanvas || !sourceCanvas.width || !sourceCanvas.height) return null;
    try {
      const now = performance.now();
      runtimeRef.current?.frame?.({
        time: (now - startTime.current) / 1000,
        delta: 0,
        frame: frameCount.current,
        pointer: pointer.current,
      });
      const maxEdge = 768;
      const scale = Math.min(1, maxEdge / Math.max(sourceCanvas.width, sourceCanvas.height));
      const capture = document.createElement("canvas");
      capture.width = Math.max(1, Math.round(sourceCanvas.width * scale));
      capture.height = Math.max(1, Math.round(sourceCanvas.height * scale));
      const context = capture.getContext("2d");
      if (!context) return null;
      context.drawImage(sourceCanvas, 0, 0, capture.width, capture.height);
      return capture.toDataURL("image/jpeg", 0.78);
    } catch {
      return null;
    }
  };

  const appendChat = (message: ChatMessage) => {
    setChatMessages((current) => [...current, message]);
  };

  const applyFileChanges = (changes: FileAction[], baseFiles = projectFiles): string | null => {
    let next = [...baseFiles];
    for (const change of changes) {
      const path = normalizedProjectPath(change.path);
      if (!path || path.startsWith("/") || path.split("/").includes("..")) continue;
      if (change.type === "delete") {
        if (path !== "main.js") next = next.filter((file) => file.path !== path);
        continue;
      }
      if (change.type === "move") {
        const destination = normalizedProjectPath(change.to ?? "");
        if (path === "main.js" || !destination || destination.startsWith("/") || destination.split("/").includes("..")) continue;
        if (next.some((file) => file.path === destination)) continue;
        next = next.map((file) => file.path === path ? { ...file, path: destination } : file);
        continue;
      }
      if (typeof change.content !== "string") continue;
      const replacement: ProjectFile = { path, kind: "text", mimeType: change.mimeType || "text/javascript", content: change.content };
      const index = next.findIndex((file) => file.path === path);
      if (index === -1) next.push(replacement); else next[index] = replacement;
    }
    try {
      validateProject(next, "main.js");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Project validation failed";
      setError(`AI change blocked by lint: ${message}`);
      return message;
    }
    const runtimeError = runSource(next);
    if (runtimeError) {
      runSource(baseFiles);
      setError(`AI change blocked by runtime check: ${runtimeError}`);
      return runtimeError;
    }
    setUndoFiles(baseFiles);
    setFiles(next);
    const current = next.find((file) => file.path === activePath);
    if (current?.kind === "text") setCode(current.content);
    else {
      const entryFile = next.find((file) => file.path === "main.js");
      setActivePath("main.js");
      if (entryFile?.kind === "text") setCode(entryFile.content);
    }
    setSaved(false);
    return null;
  };

  const applyChatChanges = (messageId: string, changes: FileAction[]) => {
    const validationError = applyFileChanges(changes);
    setChatMessages((current) => current.map((message) => message.id === messageId
      ? { ...message, applied: validationError === null, validationError: validationError || undefined }
      : message));
  };

  const sendChat = async () => {
    const requestText = chatInput.trim();
    if (!requestText || chatBusy) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: requestText };
    const previewImage = capturePreview();
    appendChat(userMessage);
    setChatInput("");
    setChatBusy(true);
    setChatProgress("Codexに接続中…");
    const controller = new AbortController();
    chatAbortRef.current = controller;
    let bridgeConnected = false;

    try {
      const response = await fetch(`${CODEX_BRIDGE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(companionToken ? { "X-JSLIFE-Companion-Token": companionToken } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: requestText,
          code,
          files: projectFiles.map((file) => file.kind === "text"
            ? { path: file.path, kind: file.kind, mimeType: file.mimeType, content: file.content }
            : { path: file.path, kind: file.kind, mimeType: file.mimeType, size: file.content.size }),
          error,
          projectName,
          threadId: codexThreadId,
          previewImage,
        }),
      });
      bridgeConnected = true;
      setChatOnline(response.ok);
      if (!response.ok || !response.body) {
        const body = await response.text();
        let detail = body;
        try { detail = (JSON.parse(body) as { error?: string }).error || body; } catch { /* plain error body */ }
        throw new Error(detail || `Codex bridge returned ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const handleEvent = (block: string) => {
        const data = block.split("\n").filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim()).join("\n");
        if (!data) return;
        const event = JSON.parse(data) as {
          type: string;
          text?: string;
          threadId?: string;
          message?: string;
          result?: CodexResult;
        };
        if (event.type === "status" && event.text) setChatProgress(event.text);
        if (event.type === "thread" && event.threadId) {
          setCodexThreadId(event.threadId);
        }
        if (event.type === "result" && event.result) {
          const proposal = event.result.action === "changes" ? event.result.changes : undefined;
          const messageId = crypto.randomUUID();
          const shouldAutoApply = Boolean(proposal?.length && autoRunRef.current && codeRef.current === code);
          const validationError = proposal?.length && shouldAutoApply ? applyFileChanges(proposal, projectFiles) : null;
          const autoApplied = shouldAutoApply && validationError === null;
          appendChat({
            id: messageId,
            role: "assistant",
            text: event.result.message,
            changes: proposal,
            autoApplied,
            applied: autoApplied,
            validationError: validationError || undefined,
          });
        }
        if (event.type === "error") throw new Error(event.message || "Codex request failed");
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        blocks.forEach(handleEvent);
        if (done) break;
      }
      if (buffer.trim()) handleEvent(buffer);
    } catch (caught) {
      if (!bridgeConnected) setChatOnline(false);
      const cancelled = caught instanceof DOMException && caught.name === "AbortError";
      appendChat({
        id: crypto.randomUUID(),
        role: "assistant",
        text: cancelled
          ? "リクエストを停止しました。"
          : `応答を完了できませんでした。${caught instanceof Error ? caught.message : "Codex bridgeを確認してください。"}`,
      });
    } finally {
      chatAbortRef.current = null;
      setChatBusy(false);
      setChatProgress("");
    }
  };

  const undoSuggestion = () => {
    if (undoFiles === null) return;
    const previous = undoFiles;
    setFiles(previous);
    const current = previous.find((file) => file.path === activePath);
    if (current?.kind === "text") setCode(current.content);
    setUndoFiles(null);
    setSaved(false);
    runSource(previous);
  };

  const saveCurrentConversation = () => {
    if (!activeConversationId) return;
    const existing = chatConversationsRef.current.find((conversation) => conversation.id === activeConversationId);
    if (!existing) return;
    const updated: ChatConversationRecord = {
      ...existing,
      projectName,
      title: chatTitle(chatMessages),
      threadId: codexThreadId,
      messages: chatMessages,
      updatedAt: new Date().toISOString(),
    };
    const next = [updated, ...chatConversationsRef.current.filter((conversation) => conversation.id !== activeConversationId)];
    chatConversationsRef.current = next;
    setChatConversations(next);
    void putChatConversation(updated);
  };

  const newChat = () => {
    if (chatBusy) return;
    saveCurrentConversation();
    const now = new Date().toISOString();
    const conversation: ChatConversationRecord = {
      id: crypto.randomUUID(),
      title: "新しい会話",
      threadId: null,
      projectId: activeProjectId,
      projectName,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    const next = [conversation, ...chatConversationsRef.current];
    chatConversationsRef.current = next;
    setChatConversations(next);
    setActiveConversationId(conversation.id);
    setChatMessages([]);
    setCodexThreadId(null);
    setChatHistoryOpen(false);
    localStorage.setItem(activeChatStorageKey(activeProjectId), conversation.id);
    void putChatConversation(conversation);
  };

  const selectChatConversation = (conversation: ChatConversationRecord) => {
    if (chatBusy || conversation.projectId !== activeProjectId || conversation.id === activeConversationId) return;
    saveCurrentConversation();
    setActiveConversationId(conversation.id);
    setChatMessages(conversation.messages);
    setCodexThreadId(conversation.threadId);
    setChatHistoryOpen(false);
    localStorage.setItem(activeChatStorageKey(activeProjectId), conversation.id);
  };

  const pairCompanion = () => {
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.delete("companion_token");
    const userAgent = navigator.userAgent;
    const browser = userAgent.includes("Edg/")
      ? "edge"
      : userAgent.includes("Firefox/")
        ? "firefox"
        : userAgent.includes("Chrome/") || userAgent.includes("CriOS/")
          ? "chrome"
          : userAgent.includes("Safari/")
            ? "safari"
            : "default";
    window.location.href = `jslife-companion://pair?return_url=${encodeURIComponent(returnUrl.toString())}&browser=${browser}`;
  };

  return (
    <main className={`studio mode-${APP_MODE} ${chatOpen ? "chat-open" : ""} ${editorOpen ? "" : "editor-closed"} ${sidebarMode === "library" ? "sidebar-library" : ""}`}>
      <input ref={importRef} className="visually-hidden" type="file" accept=".js,.json,.jslife,text/javascript,application/json,application/x-jslife-project" onChange={importFile} />
      <input ref={assetRef} className="visually-hidden" type="file" multiple onChange={addAssets} />
      <header className="topbar">
        <div className="brand"><span className="brand-mark">J</span><span>JSLIFE</span></div>
        <nav className="main-nav" aria-label="Main navigation"><button className={!chatOpen && sidebarMode === "files" ? "nav-active" : ""} onClick={() => { setChatOpen(false); setSidebarMode("files"); setEditorOpen(true); }}>Studio</button><button className={sidebarMode === "library" ? "nav-active" : ""} onClick={openProjectBrowser}>Library</button><button className={chatOpen ? "nav-active" : ""} onClick={() => setChatOpen(true)}>{IS_STATIC_SHOWCASE ? "Desktop" : "Codex"}</button></nav>
        <div className="top-actions">
          <span className={`save-state ${saved ? "saved" : ""}`}><i />{workspaceId ? saved ? "Saved to folder" : "Saving to folder…" : saved ? "Saved in library" : "Unsaved changes"}</span>
          <button className="text-button" onClick={() => importRef.current?.click()}>Import</button>
          <button className="text-button" onClick={() => void exportProject()}>Export .jslife</button>
          <button className="save-button" onClick={() => void saveProject()} disabled={Boolean(workspaceId)}>{workspaceId ? "Auto Save" : "Save"}</button>
          <button className="ai-button" onClick={() => setChatOpen((open) => !open)}><Icon>✦</Icon> {IS_STATIC_SHOWCASE ? "Get App" : "Codex"}</button>
          <button className="run-button" onClick={runCode}><Icon>▶</Icon> Run</button>
        </div>
      </header>

      <section className="projectbar">
        <div className="project-title"><div><input value={projectName} onChange={(event) => { setProjectName(event.target.value); if (!workspaceId) setSaved(false); }} aria-label="Project name" /><span>{workspaceId ? `Local folder · ${workspaceName}` : "Three.js · JavaScript module"}</span></div></div>
        <div className="engine-status"><i /> THREE.JS <b>r185</b></div>
        <div className="project-meta"><span>{fps} FPS</span><span>{resolution.width} × {resolution.height}</span><button onClick={() => stageRef.current?.requestFullscreen?.()} aria-label="Enter fullscreen">⛶</button></div>
      </section>

      <section className="workspace">
        <aside className="rail" aria-label="Studio tools">
          <button className={editorOpen && sidebarMode === "library" ? "rail-active" : ""} aria-label="Library" aria-pressed={editorOpen && sidebarMode === "library"} onClick={openProjectBrowser}><Icon>▤</Icon></button>
          <button className={editorOpen && sidebarMode === "files" ? "rail-active" : ""} aria-label="Project files" aria-pressed={editorOpen && sidebarMode === "files"} onClick={() => { if (editorOpen && sidebarMode === "files") toggleEditor(); else { setSidebarMode("files"); setEditorOpen(true); } }} title="Project files"><Icon>⌘</Icon></button>
          <button aria-label="Import" onClick={() => importRef.current?.click()}><Icon>⇣</Icon></button>
          <button aria-label="Add assets" onClick={() => assetRef.current?.click()} title="Add assets"><Icon>◇</Icon></button>
          <button className={chatOpen ? "rail-ai-active" : ""} aria-label={IS_STATIC_SHOWCASE ? "Get JSLIFE desktop" : "Codex chat"} onClick={() => setChatOpen((open) => !open)}><Icon>✦</Icon></button>
          <span className="rail-spacer" /><button aria-label="Settings"><Icon>⚙</Icon></button>
        </aside>

        <section className="editor-panel" aria-label="JavaScript module editor">
          <div className="panel-heading"><span>{sidebarMode === "library" ? "PROJECTS" : "EDITOR"}</span><div>{sidebarMode === "library" ? <>{!IS_STATIC_SHOWCASE && <button className="asset-add" onClick={() => void openLocalWorkspace()}>Open folder</button>}{!IS_STATIC_SHOWCASE && !workspaceId && <button className="asset-add" onClick={() => void moveToLocalWorkspace()}>Move to Local Files</button>}<button className="asset-add" onClick={() => createBlankProject()}>＋ new</button><button className="asset-add" onClick={() => importRef.current?.click()}>Import</button></> : <><button className="asset-add" onClick={addTextFile} title="New text file">＋ file</button><button className="asset-add" onClick={() => assetRef.current?.click()} title="Add assets">＋ asset</button><button className="editor-code-search" onClick={openCodeSearch} title="Find in code (⌘F)" aria-label="Find in code">⌕ <kbd>⌘F</kbd></button></>}</div></div>
          <div className="editor-body">
            <aside className="file-browser" aria-label={sidebarMode === "library" ? "Project browser" : "Project file browser"} onContextMenu={(event) => {
              if (IS_STATIC_SHOWCASE || sidebarMode !== "files") return;
              event.preventDefault();
              setFileBrowserMenu({ x: Math.min(event.clientX, window.innerWidth - 210), y: Math.min(event.clientY, window.innerHeight - 48) });
            }}>
              {sidebarMode === "files" ? <>
                <div className="file-browser-title"><span>JSLIFE</span><small>{projectFiles.length}</small></div>
                <div className="file-tree">
                  {projectBrowserRows.map((row) => row.kind === "folder" ? (
                    <button
                      key={`folder:${row.path}`}
                      className="file-tree-folder"
                      style={{ paddingLeft: 9 + row.depth * 12 }}
                      onClick={() => setCollapsedFolders((current) => {
                        const next = new Set(current);
                        if (next.has(row.path)) next.delete(row.path); else next.add(row.path);
                        return next;
                      })}
                      title={row.path}
                    ><span>{collapsedFolders.has(row.path) ? "▸" : "▾"}</span>{row.name}</button>
                  ) : (
                    <div key={`file:${row.path}`} className={`file-tree-row${row.path === activePath ? " file-tree-active" : ""}`} style={{ paddingLeft: 21 + row.depth * 12 }} title={row.path}>
                      <button className="file-tree-open" onClick={() => row.file?.kind === "text" && selectFile(row.path)} disabled={row.file?.kind !== "text"}>
                        <span className={`file-kind file-kind-${row.file?.kind}`}>{row.file?.kind === "asset" ? "◇" : row.path.match(/\.(glsl|frag|vert)$/i) ? "◈" : "JS"}</span>
                        <span>{row.name}</span>
                      </button>
                      {row.path !== "main.js" && <span className="file-tree-actions"><button onClick={() => renameProjectFile(row.path)} aria-label={`Rename ${row.path}`} title="Rename">✎</button><button onClick={() => deleteProjectFile(row.path)} aria-label={`Delete ${row.path}`} title="Delete">×</button></span>}
                    </div>
                  ))}
                </div>
                <div className="file-browser-summary">{projectFiles.filter(isEditable).length} text · {projectFiles.filter((file) => file.kind === "asset").length} assets</div>
              </> : <>
                <div className="project-browser-scroll project-explorer" role="listbox" aria-label="Projects" aria-activedescendant={`project-${selectedProjectKey.replace(/[^a-z0-9_-]/gi, "-")}`} tabIndex={0} onKeyDown={handleProjectBrowserKeyDown}>
                  <div className="project-tree-root-node">
                    <button className="project-tree-root" onClick={() => toggleProjectGroup("browser")} onContextMenu={(event) => openProjectGroupMenu(event, "browser", null)}><span>{collapsedProjectGroups.has("browser") ? "▸" : "▾"}</span><i>▱</i><strong>Browser</strong><small>{visibleLibrary.length + (!workspaceId && showWorkspaceInExplorer ? 1 : 0)}</small></button>
                    {!collapsedProjectGroups.has("browser") && <div className="project-tree-children">
                      {renderProjectGroupFolders("browser", null)}
                      {!workspaceId && showWorkspaceInExplorer && renderExplorerProject("workspace", projectName, `${projectFiles.length} files · ${saved ? "saved" : "unsaved"}`, { loaded: true, package: saved })}
                      {!visibleLibrary.length && !(!workspaceId && showWorkspaceInExplorer) && <p className="project-browser-empty">Save a project to add it here.</p>}
                      {visibleLibrary.map((project) => { const key = `saved:${project.id}`; return renderExplorerProject(key, project.name, `${project.files.length} files · ${formatProjectTimestamp(project.updatedAt)}`, {
                        loaded: project.id === activeProjectId,
                        package: true,
                        onDelete: () => { void removeProject(project.id); setLibrary((current) => current.filter((item) => item.id !== project.id)); if (selectedProjectKey === key) selectExplorerProject("workspace"); },
                      }); })}
                    </div>}
                  </div>
                  <div className="project-tree-root-node">
                    <button className="project-tree-root" onClick={() => toggleProjectGroup("local")} onContextMenu={(event) => openProjectGroupMenu(event, "local", null)}><span>{collapsedProjectGroups.has("local") ? "▸" : "▾"}</span><i>▱</i><strong>Local</strong><small>{workspaceId ? 1 : 0}</small></button>
                    {!collapsedProjectGroups.has("local") && <div className="project-tree-children">
                      {renderProjectGroupFolders("local", null)}
                      {workspaceId ? renderExplorerProject("workspace", projectName, `${projectFiles.length} files · ${workspaceName}`, { loaded: true }) : <p className="project-browser-empty">No local project is open.</p>}
                    </div>}
                  </div>
                  <div className="project-tree-root-node">
                    <button className="project-tree-root project-tree-root-readonly" onClick={() => toggleProjectGroup("starters")}><span>{collapsedProjectGroups.has("starters") ? "▸" : "▾"}</span><i>▱</i><strong>Starters</strong><small>{PRESETS.length + 1}</small></button>
                    {!collapsedProjectGroups.has("starters") && <div className="project-tree-children">
                      {renderExplorerProject("starter:blank", "Blank Three.js", "Minimal Three.js scene", { blank: true })}
                      {PRESETS.map((preset, index) => renderExplorerProject(`starter:${index}`, preset.name, "Three.js starter", { accent: preset.accent }))}
                    </div>}
                  </div>
                </div>
                <div className="project-browser-footer">{!IS_STATIC_SHOWCASE && <button onClick={() => void openLocalWorkspace()}>Open local folder</button>}{!IS_STATIC_SHOWCASE && !workspaceId && <button onClick={() => void moveToLocalWorkspace()}>Move to Local Files</button>}<button onClick={exportLibrary} disabled={!library.length}>Backup JSON</button></div>
              </>}
            </aside>
            <div className="code-workspace">
              {sidebarMode === "library" ? <section className="project-directory-view" aria-label={`${selectedProject.name} directory`}>
                <header className="project-directory-head">
                  <div><span>SELECTED PROJECT</span><strong>{selectedProject.name}</strong><small>{selectedProject.detail}</small></div>
                  <button onClick={() => activateProjectSelection()}>Open project</button>
                </header>
                <div className="project-directory-tree">
                  <div className="project-directory-root"><span>▾</span><b>{safeName(selectedProject.name)}{selectedProjectKey.startsWith("saved:") ? ".jslife" : ""}</b><small>{selectedProject.files.length} files</small></div>
                  {selectedProjectRows.map((row) => row.kind === "folder" ? (
                    <button
                      key={`preview-folder:${row.path}`}
                      className="project-directory-folder"
                      style={{ paddingLeft: 22 + row.depth * 18 }}
                      onClick={() => setPreviewCollapsedFolders((current) => {
                        const next = new Set(current);
                        if (next.has(row.path)) next.delete(row.path); else next.add(row.path);
                        return next;
                      })}
                      title={row.path}
                    ><span>{previewCollapsedFolders.has(row.path) ? "▸" : "▾"}</span><i>▱</i>{row.name}</button>
                  ) : (
                    <div key={`preview-file:${row.path}`} className="project-directory-file" style={{ paddingLeft: 40 + row.depth * 18 }} title={row.path}>
                      <span className={`file-kind file-kind-${row.file?.kind}`}>{row.file?.kind === "asset" ? "◇" : row.path.match(/\.(glsl|frag|vert)$/i) ? "◈" : row.path.endsWith(".json") ? "{}" : "JS"}</span>
                      <span>{row.name}</span><small>{row.file?.kind === "asset" ? "asset" : row.file?.mimeType}</small>
                    </div>
                  ))}
                </div>
                <footer className="project-directory-status"><span>↑↓ select project</span><span>double-click to load</span><span>{selectedProject.files.filter(isEditable).length} text · {selectedProject.files.filter((file) => file.kind === "asset").length} assets</span></footer>
              </section> : <>
              <div className="tabs">{openFiles.map((file) => <div key={file.path} className={file.path === activePath ? "tab-active" : "file-tab"}><button className="tab-label" onClick={() => selectFile(file.path)} title={file.path}><i style={{ background: PRESETS[presetIndex].accent }} /><span>{file.path.split("/").pop()}</span>{file.path === activePath && !saved && <b>●</b>}</button><button className="tab-close" onClick={() => closeFileTab(file.path)} aria-label={`Close ${file.path}`} title="Close tab">×</button></div>)}<button className="add-tab" onClick={addTextFile} aria-label="New file">＋</button></div>
              {codeSearchOpen && <div className="code-search" role="search">
                <span aria-hidden="true">⌕</span>
                <input
                  ref={codeSearchRef}
                  value={codeSearchQuery}
                  onChange={(event) => { setCodeSearchQuery(event.target.value); setCodeSearchIndex(0); }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") { event.preventDefault(); closeCodeSearch(); }
                    if (event.key === "Enter") { event.preventDefault(); stepCodeSearch(event.shiftKey ? -1 : 1); }
                  }}
                  placeholder={`Find in ${activePath}`}
                  aria-label="Find in code"
                  autoComplete="off"
                />
                <span className="code-search-count">{codeSearchQuery ? (codeSearchMatches.length ? `${activeCodeSearchIndex + 1}/${codeSearchMatches.length}` : "0/0") : ""}</span>
                <button onClick={() => stepCodeSearch(-1)} disabled={!codeSearchMatches.length} aria-label="Previous match">↑</button>
                <button onClick={() => stepCodeSearch(1)} disabled={!codeSearchMatches.length} aria-label="Next match">↓</button>
                <button onClick={closeCodeSearch} aria-label="Close search">×</button>
              </div>}
              <div className="editor-wrap">
                <pre className="line-numbers" aria-hidden="true">{Array.from({ length: lines }, (_, i) => i + 1).join("\n")}</pre>
                <textarea
                  ref={editorRef}
                  value={code}
                  onChange={(event) => { setCode(event.target.value); setSaved(false); }}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") { event.preventDefault(); openCodeSearch(); }
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); runCode(); }
                    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); saveProject(); }
                    if (event.key === "Tab") {
                      event.preventDefault();
                      const target = event.currentTarget;
                      const next = `${code.slice(0, target.selectionStart)}  ${code.slice(target.selectionEnd)}`;
                      const caret = target.selectionStart + 2;
                      setCode(next); setSaved(false);
                      requestAnimationFrame(() => target.setSelectionRange(caret, caret));
                    }
                  }}
                  spellCheck={false}
                  aria-label={`${activePath} source code`}
                />
              </div>
              <div className="editor-status"><span>{activePath}</span><span>{lines} lines</span><span>UTF-8</span><span className="context-ready">● {projectFiles.length} files ready</span></div>
              </>}
            </div>
          </div>
        </section>

        <section className="preview-panel">
          <div className="panel-heading"><span>GRAPHICS CONTEXT</span><div><span className="live-dot" />{running ? "RUNNING" : "PAUSED"}</div></div>
          <div
            className="stage"
            ref={stageRef}
            style={{ "--preset-accent": PRESETS[presetIndex].accent } as React.CSSProperties}
            onPointerMove={movePadInteraction}
            onPointerDown={beginPadInteraction}
            onPointerUp={endPadInteraction}
            onPointerCancel={endPadInteraction}
            onLostPointerCapture={losePadInteraction}
          >
            <div className="render-mount" ref={mountRef} />
            <div className="stage-label"><span>WEBGL RENDERER</span><small>main.js · {projectFiles.length} project files</small></div>
            {error && <div className="error-toast"><strong>Module stopped</strong><span>{error}</span></div>}
          </div>
          <div className="transport">
            <button onClick={runCode} aria-label="Restart">↺</button>
            <button className="play" onClick={toggleRunning} aria-label={running ? "Pause" : "Play"}>{running ? "Ⅱ" : "▶"}</button>
            <div className="timecode">{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(Math.floor(elapsed % 60)).padStart(2, "0")}<small>.{String(Math.floor((elapsed % 1) * 100)).padStart(2, "0")}</small></div>
            <div className="timeline"><i style={{ width: `${(elapsed % 10) * 10}%` }} /><span style={{ left: `${(elapsed % 10) * 10}%` }} /></div>
            <label className="auto-run"><input type="checkbox" checked={autoRun} onChange={(event) => setAutoRun(event.target.checked)} /> Auto-run</label>
          </div>
        </section>

        <aside className="chat-panel" aria-label="Codex pair programmer">
          {IS_STATIC_SHOWCASE ? <div className="chat-head">
            <div className="chat-title"><i className="offline" /><span><strong>JSLIFE DESKTOP</strong><small>AIと実ファイル編集はデスクトップ版で利用できます</small></span></div>
            <div><button onClick={() => setChatOpen(false)} title="Close">×</button></div>
          </div> : <div className="chat-head">
            <div className="chat-title">
              <i className={chatOnline === true ? "online" : chatOnline === false ? "offline" : "checking"} />
              <span><strong>CODEX PAIR</strong><small>{chatOnline === true ? "ChatGPTで接続済み" : chatOnline === false ? companionNeedsPairing ? "Companionのペアリングが必要" : "Companion未接続" : "接続確認中"}</small></span>
            </div>
            <div><button className={chatHistoryOpen ? "chat-history-active" : ""} onClick={() => setChatHistoryOpen((open) => !open)} title="Conversation history" aria-label="Conversation history">◷</button><button onClick={newChat} disabled={chatBusy} title="New chat" aria-label="New chat">＋</button><button onClick={() => setChatOpen(false)} title="Close">×</button></div>
          </div>}

          {IS_STATIC_SHOWCASE ? <section className="static-distribution">
            <span className="static-distribution-mark">✦</span>
            <strong>このページはブラウザ体験版です</strong>
            <p>コード編集、Three.jsの実行、ブラウザ内保存はそのまま試せます。Codexチャット、実フォルダの編集、Finder連携はJSLIFEデスクトップ版で利用してください。</p>
            <a className="static-download" href={RELEASE_DOWNLOAD_URL}>最新Releaseをダウンロード</a>
            <a className="static-release" href={RELEASE_URL}>Releaseページを見る</a>
            <div className="static-clone"><span>ソースから起動</span><code>git clone {REPOSITORY_URL}.git{"\n"}cd JSLife{"\n"}npm ci{"\n"}npm run dev</code></div>
            <a className="static-repository" href={REPOSITORY_URL}>GitHubリポジトリを開く</a>
          </section> : <>
          {chatHistoryOpen && <section className="chat-history" aria-label="Conversation history">
            <div className="chat-history-heading"><span>CONVERSATIONS</span><small>{projectChatConversations.length}</small></div>
            <div className="chat-history-list">
              {projectChatConversations.map((conversation) => <button
                key={conversation.id}
                className={conversation.id === activeConversationId ? "chat-history-current" : ""}
                onClick={() => selectChatConversation(conversation)}
                disabled={chatBusy}
              >
                <i>✦</i><span><strong>{conversation.title}</strong><small>{conversation.projectName} · {new Date(conversation.updatedAt).toLocaleString()}</small></span>
              </button>)}
            </div>
          </section>}

          {chatOnline === false && <div className="chat-offline">
            <span>{companionNeedsPairing ? "JSLIFE Companionとペアリングしてください。" : "JSLIFE Companionを起動してください。"}</span>
            <button onClick={pairCompanion}>{companionNeedsPairing ? "ペアリング" : "Companionを開く"}</button>
            {companionNeedsPairing ? <code>ChatGPT認証はCompanion側で管理されます</code> : COMPANION_DOWNLOAD_URL ? <a href={COMPANION_DOWNLOAD_URL}>Companionをダウンロード</a> : <code>未導入の場合はCompanionのインストールが必要です</code>}
          </div>}

          <div className="chat-messages">
            {!chatMessages.length && <div className="chat-welcome">
              <span>✦</span>
              <strong>プロジェクト全体を見ながら相談できます</strong>
              <p>複数のJS・シェーダーとアセット一覧を確認し、ファイル単位の変更を提案できます。</p>
            </div>}
            {chatMessages.map((message) => <article key={message.id} className={`chat-message ${message.role}`}>
              <small>{message.role === "user" ? "YOU" : "CODEX"}</small>
              <p>{message.text}</p>
              {message.changes?.length && <div className="code-proposal">
                <div><span>{message.changes.length} file changes</span><small>{message.changes.map((change) => change.type === "delete" ? `− ${change.path}` : change.type === "move" ? `↳ ${change.path} → ${change.to}` : `+ ${change.path}`).join(" · ")}</small></div>
                {message.validationError ? <div className="lint-failed">✕ Lintで停止 · {message.validationError}</div> : message.autoApplied ? <div className="auto-applied">✓ Lint通過 · Auto-runで適用済み</div> : message.applied ? <div className="auto-applied">✓ Lint通過 · 適用済み</div> : <div className="lint-ready">Lintは適用時に実行されます</div>}
                <button onClick={() => applyChatChanges(message.id, message.changes!)} disabled={Boolean(message.validationError)}>{message.applied ? "この変更を再適用" : "変更を適用"}</button>
              </div>}
            </article>)}
            {chatBusy && <div className="chat-thinking"><i /><span>{chatProgress || "Codexが考えています…"}</span><button onClick={() => chatAbortRef.current?.abort()}>停止</button></div>}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-composer">
            {undoFiles !== null && <button className="undo-code" onClick={undoSuggestion}>↶ 最後のAI変更を元に戻す</button>}
            <div className="prompt-chips">
              <button onClick={() => setChatInput("このコードの構成を簡潔に説明して")}>説明</button>
              <button onClick={() => setChatInput("現在のエラーを診断して、必要なら修正版を提案して")}>エラー修正</button>
              <button onClick={() => setChatInput("見た目をもっと印象的にする変更を提案して")}>演出を追加</button>
            </div>
            <div className="composer-box">
              <textarea
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendChat();
                  }
                }}
                placeholder="プロジェクトのコードやアセットについてCodexに相談…"
                rows={3}
              />
              <button onClick={() => void sendChat()} disabled={!chatInput.trim() || chatBusy} aria-label="Send to Codex">↑</button>
            </div>
            <small className="chat-privacy">テキストファイル、アセット一覧、プレビューをローカルCodexへ送信 · バイナリアセット本体は送信しません</small>
          </div>
          </>}
        </aside>
      </section>

      {fileBrowserMenu && <div className="file-browser-context-menu" style={{ left: fileBrowserMenu.x, top: fileBrowserMenu.y }} onPointerDown={(event) => event.stopPropagation()}>
        {workspaceId
          ? <button onClick={() => void revealLocalWorkspace()}>Open Project Folder in Finder</button>
          : <button onClick={() => { setFileBrowserMenu(null); void moveToLocalWorkspace(); }}>Move to Local Files</button>}
      </div>}
      {projectTreeMenu && <div className="file-browser-context-menu project-tree-context-menu" style={{ left: projectTreeMenu.x, top: projectTreeMenu.y }} onPointerDown={(event) => event.stopPropagation()}>
        <button onClick={addProjectGroup}>Add Group</button>
      </div>}

    </main>
  );
}
