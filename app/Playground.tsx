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

const STORAGE_LIBRARY = "jslife-library-v1";
const STORAGE_DRAFT = "jslife-three-draft-v1";
const STORAGE_CHAT = "jslife-codex-chat-v1";
const STORAGE_THREAD = "jslife-codex-thread-v1";
const STORAGE_ACTIVE_CHAT = "jslife-active-chat-v2";
const STORAGE_PREFERENCES = "jslife-preferences-v1";
const CODEX_BRIDGE = "http://127.0.0.1:4317";

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
  const [code, setCode] = useState(PRESETS[0].code);
  const [files, setFiles] = useState<ProjectFile[]>([mainFile(PRESETS[0].code)]);
  const [activePath, setActivePath] = useState("main.js");
  const [openPaths, setOpenPaths] = useState<string[]>(["main.js"]);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [library, setLibrary] = useState<ProjectRecord[]>([]);
  const [sidebarMode, setSidebarMode] = useState<"files" | "library">("files");
  const [selectedProjectKey, setSelectedProjectKey] = useState("workspace");
  const [previewCollapsedFolders, setPreviewCollapsedFolders] = useState<Set<string>>(new Set());
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
  const [chatProgress, setChatProgress] = useState("");
  const [codexThreadId, setCodexThreadId] = useState<string | null>(null);
  const [undoFiles, setUndoFiles] = useState<ProjectFile[] | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<GraphicsRuntime | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const assetRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const codeSearchRef = useRef<HTMLInputElement>(null);
  const pointer = useRef<PointerState>({ x: 0, y: 0, px: 0, py: 0, down: false });
  const startTime = useRef(0);
  const pausedAt = useRef(0);
  const lastFrame = useRef(0);
  const frameCount = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0, pixelRatio: 1 });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatConversationsRef = useRef<ChatConversationRecord[]>([]);
  const draftReadyRef = useRef(false);
  const preferencesReadyRef = useRef(false);
  const conversationsReadyRef = useRef(false);
  const codeRef = useRef(code);
  const autoRunRef = useRef(autoRun);
  const chatAbortRef = useRef<AbortController | null>(null);

  const lines = useMemo(() => code.split("\n").length, [code]);
  const projectFiles = useMemo(() => files.map((file) => file.path === activePath && file.kind === "text" ? { ...file, content: code } : file), [activePath, code, files]);
  const projectBrowserRows = useMemo(() => buildProjectBrowserRows(projectFiles, collapsedFolders), [collapsedFolders, projectFiles]);
  const projectSelectionKeys = useMemo(() => [
    "workspace",
    ...library.map((project) => `saved:${project.id}`),
    "starter:blank",
    ...PRESETS.map((_preset, index) => `starter:${index}`),
  ], [library]);
  const selectedProject = useMemo(() => {
    if (selectedProjectKey.startsWith("saved:")) {
      const project = library.find((candidate) => `saved:${candidate.id}` === selectedProjectKey);
      if (project) return { name: project.name, files: project.files, detail: `Saved ${new Date(project.updatedAt).toLocaleDateString()}` };
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

  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { autoRunRef.current = autoRun; }, [autoRun]);
  useEffect(() => { chatConversationsRef.current = chatConversations; }, [chatConversations]);
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
      void putDraft({ id: "current", projectId: activeProjectId, name: projectName, entry: "main.js", runtimeId: "three", files: projectFiles, activePath, saved });
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
  }, [activePath, activeProjectId, currentViewport, projectFiles, projectName, saved, teardown]);

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
            setActiveProjectId(draft.projectId);
            setSaved(draft.saved);
          }
        }
        const legacyMessages = JSON.parse(localStorage.getItem(STORAGE_CHAT) ?? "[]") as ChatMessage[];
        const legacyThreadId = localStorage.getItem(STORAGE_THREAD);
        let conversations = await listChatConversations();
        if (!conversations.length) {
          const now = new Date().toISOString();
          const migrated: ChatConversationRecord = {
            id: crypto.randomUUID(),
            title: chatTitle(Array.isArray(legacyMessages) ? legacyMessages : []),
            threadId: legacyThreadId,
            projectId: draft?.projectId ?? null,
            projectName: draft?.name || PRESETS[0].name,
            messages: Array.isArray(legacyMessages) ? legacyMessages : [],
            createdAt: now,
            updatedAt: now,
          };
          await putChatConversation(migrated);
          conversations = [migrated];
        }
        const storedActiveId = localStorage.getItem(STORAGE_ACTIVE_CHAT);
        const activeConversation = conversations.find((conversation) => conversation.id === storedActiveId) ?? conversations[0];
        if (!cancelled && activeConversation) {
          setChatConversations(conversations);
          setActiveConversationId(activeConversation.id);
          setChatMessages(activeConversation.messages);
          setCodexThreadId(activeConversation.threadId);
          localStorage.setItem(STORAGE_ACTIVE_CHAT, activeConversation.id);
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
      void putDraft({ id: "current", projectId: activeProjectId, name: projectName, entry: "main.js", runtimeId: "three", files: projectFiles, activePath, saved });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activePath, activeProjectId, projectFiles, projectName, saved]);

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
        title: chatTitle(chatMessages),
        threadId: codexThreadId,
        messages: chatMessages,
        updatedAt: new Date().toISOString(),
      };
      const next = [updated, ...chatConversationsRef.current.filter((conversation) => conversation.id !== activeConversationId)];
      chatConversationsRef.current = next;
      setChatConversations(next);
      void putChatConversation(updated);
      localStorage.setItem(STORAGE_ACTIVE_CHAT, activeConversationId);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [activeConversationId, chatMessages, codexThreadId]);

  const checkCodex = useCallback(async () => {
    setChatOnline(null);
    try {
      const response = await fetch(`${CODEX_BRIDGE}/health`, { cache: "no-store" });
      setChatOnline(response.ok);
    } catch {
      setChatOnline(false);
    }
  }, []);

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

  const loadProject = (project: ProjectRecord) => {
    const entryFile = project.files.find((file) => file.path === project.entry);
    if (!entryFile || entryFile.kind !== "text") return;
    setProjectName(project.name);
    setFiles(project.files);
    setActivePath(project.entry);
    setOpenPaths([project.entry]);
    setCode(entryFile.content);
    setActiveProjectId(project.id);
    setSelectedProjectKey(`saved:${project.id}`);
    setSaved(true);
    setSidebarMode("files");
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

  const choosePreset = (index: number) => {
    const preset = PRESETS[index];
    const nextFiles = [mainFile(preset.code)];
    setPresetIndex(index);
    setProjectName(preset.name);
    setFiles(nextFiles);
    setActivePath("main.js");
    setOpenPaths(["main.js"]);
    setCode(preset.code);
    setActiveProjectId(null);
    setSelectedProjectKey(`starter:${index}`);
    setSaved(false);
    setSidebarMode("files");
    runSource(nextFiles);
  };

  const createBlankProject = () => {
    if (!saved && !window.confirm("Discard the current unsaved changes and create a blank project?")) return;
    const nextFiles = [mainFile(BLANK_PROJECT)];
    setPresetIndex(0);
    setProjectName("Untitled Project");
    setFiles(nextFiles);
    setActivePath("main.js");
    setOpenPaths(["main.js"]);
    setCode(BLANK_PROJECT);
    setActiveProjectId(null);
    setSelectedProjectKey("starter:blank");
    setUndoFiles(null);
    setSaved(false);
    setSidebarMode("files");
    runSource(nextFiles);
  };

  const openProjectBrowser = () => {
    setSidebarMode("library");
    setEditorOpen(true);
  };

  const activateProjectSelection = (key = selectedProjectKey) => {
    if (key === "workspace") {
      setSidebarMode("files");
      return;
    }
    if (key.startsWith("saved:")) {
      const project = library.find((candidate) => `saved:${candidate.id}` === key);
      if (project) loadProject(project);
      return;
    }
    if (key === "starter:blank") {
      createBlankProject();
      return;
    }
    if (key.startsWith("starter:")) {
      const index = Number(key.slice("starter:".length));
      if (PRESETS[index]) choosePreset(index);
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
        setProjectName(file.name.replace(/\.js$/i, ""));
        setFiles(nextFiles);
        setActivePath("main.js");
        setOpenPaths(["main.js"]);
        setCode(text);
        setActiveProjectId(null);
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

  const updatePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointer.current.px = event.clientX - rect.left;
    pointer.current.py = event.clientY - rect.top;
    pointer.current.x = (pointer.current.px / rect.width) * 2 - 1;
    pointer.current.y = -(pointer.current.py / rect.height) * 2 + 1;
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
        headers: { "Content-Type": "application/json" },
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
    localStorage.setItem(STORAGE_ACTIVE_CHAT, conversation.id);
    void putChatConversation(conversation);
  };

  const selectChatConversation = (conversation: ChatConversationRecord) => {
    if (chatBusy || conversation.id === activeConversationId) return;
    saveCurrentConversation();
    setActiveConversationId(conversation.id);
    setChatMessages(conversation.messages);
    setCodexThreadId(conversation.threadId);
    setChatHistoryOpen(false);
    localStorage.setItem(STORAGE_ACTIVE_CHAT, conversation.id);
  };

  return (
    <main className={`studio ${chatOpen ? "chat-open" : ""} ${editorOpen ? "" : "editor-closed"} ${sidebarMode === "library" ? "sidebar-library" : ""}`}>
      <input ref={importRef} className="visually-hidden" type="file" accept=".js,.json,.jslife,text/javascript,application/json,application/x-jslife-project" onChange={importFile} />
      <input ref={assetRef} className="visually-hidden" type="file" multiple onChange={addAssets} />
      <header className="topbar">
        <div className="brand"><span className="brand-mark">J</span><span>JSLIFE</span></div>
        <nav className="main-nav" aria-label="Main navigation"><button className={!chatOpen && sidebarMode === "files" ? "nav-active" : ""} onClick={() => { setChatOpen(false); setSidebarMode("files"); setEditorOpen(true); }}>Studio</button><button className={sidebarMode === "library" ? "nav-active" : ""} onClick={openProjectBrowser}>Library</button><button className={chatOpen ? "nav-active" : ""} onClick={() => setChatOpen(true)}>Codex</button></nav>
        <div className="top-actions">
          <span className={`save-state ${saved ? "saved" : ""}`}><i />{saved ? "Saved in library" : "Unsaved changes"}</span>
          <button className="text-button" onClick={() => importRef.current?.click()}>Import</button>
          <button className="text-button" onClick={() => void exportProject()}>Export .jslife</button>
          <button className="save-button" onClick={() => void saveProject()}>Save</button>
          <button className="ai-button" onClick={() => setChatOpen((open) => !open)}><Icon>✦</Icon> Codex</button>
          <button className="run-button" onClick={runCode}><Icon>▶</Icon> Run</button>
        </div>
      </header>

      <section className="projectbar">
        <div className="project-title"><button aria-label="Open project browser" onClick={openProjectBrowser}>☷</button><div><input value={projectName} onChange={(event) => { setProjectName(event.target.value); setSaved(false); }} aria-label="Project name" /><span>Three.js · JavaScript module</span></div></div>
        <div className="engine-status"><i /> THREE.JS <b>r185</b></div>
        <div className="project-meta"><span>{fps} FPS</span><span>{resolution.width} × {resolution.height}</span><button onClick={() => stageRef.current?.requestFullscreen?.()} aria-label="Enter fullscreen">⛶</button></div>
      </section>

      <section className="workspace">
        <aside className="rail" aria-label="Studio tools">
          <button className={editorOpen && sidebarMode === "library" ? "rail-active" : ""} aria-label="Library" aria-pressed={editorOpen && sidebarMode === "library"} onClick={openProjectBrowser}><Icon>▤</Icon></button>
          <button className={editorOpen && sidebarMode === "files" ? "rail-active" : ""} aria-label="Project files" aria-pressed={editorOpen && sidebarMode === "files"} onClick={() => { if (editorOpen && sidebarMode === "files") toggleEditor(); else { setSidebarMode("files"); setEditorOpen(true); } }} title="Project files"><Icon>⌘</Icon></button>
          <button aria-label="Import" onClick={() => importRef.current?.click()}><Icon>⇣</Icon></button>
          <button aria-label="Add assets" onClick={() => assetRef.current?.click()} title="Add assets"><Icon>◇</Icon></button>
          <button className={chatOpen ? "rail-ai-active" : ""} aria-label="Codex chat" onClick={() => setChatOpen((open) => !open)}><Icon>✦</Icon></button>
          <span className="rail-spacer" /><button aria-label="Settings"><Icon>⚙</Icon></button>
        </aside>

        <section className="editor-panel" aria-label="JavaScript module editor">
          <div className="panel-heading"><span>{sidebarMode === "library" ? "PROJECTS" : "EDITOR"}</span><div>{sidebarMode === "library" ? <><button className="asset-add" onClick={createBlankProject}>＋ new</button><button className="asset-add" onClick={() => importRef.current?.click()}>Import</button></> : <><button className="asset-add" onClick={addTextFile} title="New text file">＋ file</button><button className="asset-add" onClick={() => assetRef.current?.click()} title="Add assets">＋ asset</button><button className="editor-code-search" onClick={openCodeSearch} title="Find in code (⌘F)" aria-label="Find in code">⌕ <kbd>⌘F</kbd></button></>}</div></div>
          <div className="editor-body">
            <aside className="file-browser" aria-label={sidebarMode === "library" ? "Project browser" : "Project file browser"}>
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
                <div className="project-browser-scroll" role="listbox" aria-label="Projects" aria-activedescendant={`project-${selectedProjectKey.replace(/[^a-z0-9_-]/gi, "-")}`} tabIndex={0} onKeyDown={handleProjectBrowserKeyDown}>
                  <div className="project-browser-section"><span>WORKSPACE</span>
                    <button id="project-workspace" role="option" aria-selected={selectedProjectKey === "workspace"} className={`project-browser-item${selectedProjectKey === "workspace" ? " project-browser-current" : ""}`} onClick={() => setSelectedProjectKey("workspace")} onDoubleClick={() => activateProjectSelection("workspace")}><i /><span><strong>{projectName}</strong><small>{projectFiles.length} files · {saved ? "saved" : "unsaved"}</small></span></button>
                  </div>
                  <div className="project-browser-section"><span>SAVED PROJECTS</span>
                    {!library.length && <p className="project-browser-empty">Save a project to add it here.</p>}
                    {library.map((project) => { const key = `saved:${project.id}`; return <div className={`project-browser-entry${selectedProjectKey === key ? " project-browser-selected" : ""}${project.id === activeProjectId ? " project-browser-loaded" : ""}`} key={project.id}>
                      <button id={`project-${key.replace(/[^a-z0-9_-]/gi, "-")}`} role="option" aria-selected={selectedProjectKey === key} className="project-browser-item" onClick={() => setSelectedProjectKey(key)} onDoubleClick={() => activateProjectSelection(key)}><i /><span><strong>{project.name}</strong><small>{project.files.length} files · {new Date(project.updatedAt).toLocaleDateString()}</small></span></button>
                      <button className="project-browser-delete" onClick={() => { void removeProject(project.id); setLibrary((current) => current.filter((item) => item.id !== project.id)); if (selectedProjectKey === key) setSelectedProjectKey("workspace"); }} aria-label={`Delete ${project.name}`} title="Delete">×</button>
                    </div>})}
                  </div>
                  <div className="project-browser-section"><span>STARTERS</span>
                    <button id="project-starter-blank" role="option" aria-selected={selectedProjectKey === "starter:blank"} className={`project-browser-item starter-blank${selectedProjectKey === "starter:blank" ? " project-browser-current" : ""}`} onClick={() => setSelectedProjectKey("starter:blank")} onDoubleClick={() => activateProjectSelection("starter:blank")}><i>＋</i><span><strong>Blank Three.js</strong><small>Minimal scene</small></span></button>
                    {PRESETS.map((preset, index) => { const key = `starter:${index}`; return <button id={`project-starter-${index}`} role="option" aria-selected={selectedProjectKey === key} className={`project-browser-item${selectedProjectKey === key ? " project-browser-current" : ""}`} key={preset.name} onClick={() => setSelectedProjectKey(key)} onDoubleClick={() => activateProjectSelection(key)}><i style={{ "--swatch": preset.accent } as React.CSSProperties} /><span><strong>{preset.name}</strong><small>Three.js starter</small></span></button>})}
                  </div>
                </div>
                <div className="project-browser-footer"><button onClick={exportLibrary} disabled={!library.length}>Backup JSON</button></div>
              </>}
            </aside>
            <div className="code-workspace">
              {sidebarMode === "library" ? <section className="project-directory-view" aria-label={`${selectedProject.name} directory`}>
                <header className="project-directory-head">
                  <div><span>SELECTED PROJECT</span><strong>{selectedProject.name}</strong><small>{selectedProject.detail}</small></div>
                  <button onClick={() => activateProjectSelection()}>Open project</button>
                </header>
                <div className="project-directory-tree">
                  <div className="project-directory-root"><span>▾</span><b>{safeName(selectedProject.name)}</b><small>{selectedProject.files.length} files</small></div>
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
            onPointerMove={updatePointer}
            onPointerDown={(event) => { pointer.current.down = true; updatePointer(event); }}
            onPointerUp={() => { pointer.current.down = false; }}
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
          <div className="chat-head">
            <div className="chat-title">
              <i className={chatOnline === true ? "online" : chatOnline === false ? "offline" : "checking"} />
              <span><strong>CODEX PAIR</strong><small>{chatOnline === true ? "ChatGPTで接続済み" : chatOnline === false ? "ローカル接続なし" : "接続確認中"}</small></span>
            </div>
            <div><button className={chatHistoryOpen ? "chat-history-active" : ""} onClick={() => setChatHistoryOpen((open) => !open)} title="Conversation history" aria-label="Conversation history">◷</button><button onClick={newChat} disabled={chatBusy} title="New chat" aria-label="New chat">＋</button><button onClick={() => setChatOpen(false)} title="Close">×</button></div>
          </div>

          {chatHistoryOpen && <section className="chat-history" aria-label="Conversation history">
            <div className="chat-history-heading"><span>CONVERSATIONS</span><small>{chatConversations.length}</small></div>
            <div className="chat-history-list">
              {chatConversations.map((conversation) => <button
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
            <span>Codex bridgeが停止しています。</span>
            <button onClick={checkCodex}>再接続</button>
            <code>npm run dev</code>
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
        </aside>
      </section>

    </main>
  );
}
