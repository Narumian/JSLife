"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { packProject, unpackProject } from "./jslife-package";
import { compileProject, disposeScene, type GraphicsRuntime, type PointerState, type ResizeArgs } from "./project-runtime";
import { getDraft, listProjects, putDraft, putProject, removeProject, type ProjectFile, type ProjectRecord } from "./project-store";

type Preset = { name: string; accent: string; code: string };
type LegacyProject = { id: string; name: string; code: string; updatedAt: string };
type LegacyDraft = { projectName?: string; code?: string; activeProjectId?: string | null; saved?: boolean };
type StudioPreferences = { chatOpen?: boolean; autoRun?: boolean; editorOpen?: boolean };
type FileAction = { type: "write" | "delete" | "move"; path: string; to?: string; content?: string; mimeType?: string };
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  changes?: FileAction[];
  autoApplied?: boolean;
};
type CodexResult = { message: string; action: "none" | "changes"; changes: FileAction[] };

const STORAGE_LIBRARY = "jslife-library-v1";
const STORAGE_DRAFT = "jslife-three-draft-v1";
const STORAGE_CHAT = "jslife-codex-chat-v1";
const STORAGE_THREAD = "jslife-codex-thread-v1";
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

const safeName = (value: string) => value.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "sketch";
const mainFile = (content: string): ProjectFile => ({ path: "main.js", kind: "text", mimeType: "text/javascript", content });
const isEditable = (file: ProjectFile) => file.kind === "text";
const normalizedProjectPath = (value: string) => value.trim().replace(/\\/g, "/").replace(/^\.\//, "");

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
  const [library, setLibrary] = useState<ProjectRecord[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
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
  const draftReadyRef = useRef(false);
  const preferencesReadyRef = useRef(false);
  const codeRef = useRef(code);
  const autoRunRef = useRef(autoRun);
  const chatAbortRef = useRef<AbortController | null>(null);

  const lines = useMemo(() => code.split("\n").length, [code]);
  const projectFiles = useMemo(() => files.map((file) => file.path === activePath && file.kind === "text" ? { ...file, content: code } : file), [activePath, code, files]);
  const codeSearchMatches = useMemo(() => findCodeMatches(code, codeSearchQuery), [code, codeSearchQuery]);
  const activeCodeSearchIndex = codeSearchMatches.length ? codeSearchIndex % codeSearchMatches.length : 0;

  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { autoRunRef.current = autoRun; }, [autoRun]);
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
    if (!mount) return;
    teardown();
    try {
      const viewport = currentViewport();
      const runtime = compileProject(sourceFiles, entry, mount, viewport);
      runtimeRef.current = runtime;
      runtime.resize?.(viewport);
      sizeRef.current = viewport;
      setResolution({ width: viewport.width, height: viewport.height });
      const now = performance.now();
      startTime.current = now;
      lastFrame.current = now;
      setElapsed(0);
      setError(null);
      setRunning(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import error");
      setRunning(false);
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
            setCode(restoredFile.content);
            setProjectName(draft.name || "Untitled sketch");
            setActiveProjectId(draft.projectId);
            setSaved(draft.saved);
          }
        }
        const storedChat = JSON.parse(localStorage.getItem(STORAGE_CHAT) ?? "[]") as ChatMessage[];
        if (!cancelled && Array.isArray(storedChat)) setChatMessages(storedChat);
        if (!cancelled) setCodexThreadId(localStorage.getItem(STORAGE_THREAD));
        const preferences = JSON.parse(localStorage.getItem(STORAGE_PREFERENCES) ?? "{}") as StudioPreferences;
        if (!cancelled) {
          setChatOpen(preferences.chatOpen ?? false);
          setAutoRun(preferences.autoRun ?? false);
          setEditorOpen(preferences.editorOpen ?? true);
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
    localStorage.setItem(STORAGE_PREFERENCES, JSON.stringify({ chatOpen, autoRun, editorOpen }));
  }, [autoRun, chatOpen, editorOpen]);

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
    setSaved(true);
  };

  const loadProject = (project: ProjectRecord) => {
    const entryFile = project.files.find((file) => file.path === project.entry);
    if (!entryFile || entryFile.kind !== "text") return;
    setProjectName(project.name);
    setFiles(project.files);
    setActivePath(project.entry);
    setCode(entryFile.content);
    setActiveProjectId(project.id);
    setSaved(true);
    setLibraryOpen(false);
    window.setTimeout(() => runSource(project.files, project.entry), 0);
  };

  const selectFile = (path: string) => {
    const nextFiles = projectFiles;
    const file = nextFiles.find((candidate) => candidate.path === path);
    setFiles(nextFiles);
    setActivePath(path);
    if (file?.kind === "text") setCode(file.content);
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
    setCode(preset.code);
    setActiveProjectId(null);
    setSaved(false);
    runSource(nextFiles);
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

  const exportSource = () => download(`${safeName(projectName)}.js`, code, "text/javascript");
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
        setLibraryOpen(true);
      } else {
        const text = await file.text();
        const nextFiles = [mainFile(text)];
        setProjectName(file.name.replace(/\.js$/i, ""));
        setFiles(nextFiles);
        setActivePath("main.js");
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

  const persistChat = (messages: ChatMessage[]) => {
    setChatMessages(messages);
    localStorage.setItem(STORAGE_CHAT, JSON.stringify(messages));
  };

  const appendChat = (message: ChatMessage) => {
    setChatMessages((current) => {
      const next = [...current, message];
      localStorage.setItem(STORAGE_CHAT, JSON.stringify(next));
      return next;
    });
  };

  const applyFileChanges = (changes: FileAction[], baseFiles = projectFiles) => {
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
    if (!autoRun) window.setTimeout(() => runSource(next), 0);
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
          localStorage.setItem(STORAGE_THREAD, event.threadId);
        }
        if (event.type === "result" && event.result) {
          const proposal = event.result.action === "changes" ? event.result.changes : undefined;
          const autoApplied = Boolean(proposal?.length && autoRunRef.current && codeRef.current === code);
          if (proposal?.length && autoApplied) applyFileChanges(proposal, projectFiles);
          appendChat({
            id: crypto.randomUUID(),
            role: "assistant",
            text: event.result.message,
            changes: autoApplied ? undefined : proposal,
            autoApplied,
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
    if (!autoRun) runSource(previous);
  };

  const newChat = () => {
    persistChat([]);
    setCodexThreadId(null);
    localStorage.removeItem(STORAGE_THREAD);
  };

  return (
    <main className={`studio ${chatOpen ? "chat-open" : ""} ${editorOpen ? "" : "editor-closed"}`}>
      <input ref={importRef} className="visually-hidden" type="file" accept=".js,.json,.jslife,text/javascript,application/json,application/x-jslife-project" onChange={importFile} />
      <input ref={assetRef} className="visually-hidden" type="file" multiple onChange={addAssets} />
      <header className="topbar">
        <div className="brand"><span className="brand-mark">J</span><span>JSLIFE</span></div>
        <nav className="main-nav" aria-label="Main navigation"><button className={!chatOpen ? "nav-active" : ""} onClick={() => setChatOpen(false)}>Studio</button><button onClick={() => setLibraryOpen(true)}>Library</button><button className={chatOpen ? "nav-active" : ""} onClick={() => setChatOpen(true)}>Codex</button></nav>
        <div className="top-actions">
          <span className={`save-state ${saved ? "saved" : ""}`}><i />{saved ? "Saved in library" : "Unsaved changes"}</span>
          <button className="text-button" onClick={() => importRef.current?.click()}>Import</button>
          <button className="text-button" onClick={exportSource}>Export .js</button>
          <button className="text-button" onClick={() => void exportProject()}>Export .jslife</button>
          <button className="save-button" onClick={() => void saveProject()}>Save</button>
          <button className="ai-button" onClick={() => setChatOpen((open) => !open)}><Icon>✦</Icon> Codex</button>
          <button className="run-button" onClick={runCode}><Icon>▶</Icon> Run</button>
        </div>
      </header>

      <section className="projectbar">
        <div className="project-title"><button aria-label="Open library" onClick={() => setLibraryOpen(true)}>☷</button><div><input value={projectName} onChange={(event) => { setProjectName(event.target.value); setSaved(false); }} aria-label="Project name" /><span>Three.js · JavaScript module</span></div></div>
        <div className="engine-status"><i /> THREE.JS <b>r185</b></div>
        <div className="project-meta"><span>{fps} FPS</span><span>{resolution.width} × {resolution.height}</span><button onClick={() => stageRef.current?.requestFullscreen?.()} aria-label="Enter fullscreen">⛶</button></div>
      </section>

      <section className="workspace">
        <aside className="rail" aria-label="Studio tools">
          <button className={editorOpen ? "rail-active" : ""} aria-label={editorOpen ? "Hide code editor" : "Show code editor"} aria-pressed={editorOpen} onClick={toggleEditor} title={editorOpen ? "Hide code editor" : "Show code editor"}><Icon>⌘</Icon></button>
          <button aria-label="Library" onClick={() => setLibraryOpen(true)}><Icon>▤</Icon></button>
          <button aria-label="Import" onClick={() => importRef.current?.click()}><Icon>⇣</Icon></button>
          <button aria-label="Add assets" onClick={() => assetRef.current?.click()} title="Add assets"><Icon>◇</Icon></button>
          <button className={chatOpen ? "rail-ai-active" : ""} aria-label="Codex chat" onClick={() => setChatOpen((open) => !open)}><Icon>✦</Icon></button>
          <span className="rail-spacer" /><button aria-label="Settings"><Icon>⚙</Icon></button>
        </aside>

        <section className="editor-panel" aria-label="JavaScript module editor">
          <div className="panel-heading"><span>PROJECT FILES</span><div><button className="asset-add" onClick={() => assetRef.current?.click()} title="Add assets">＋ asset</button><span className="module-api">{projectFiles.filter((file) => file.kind === "asset").length} assets</span><button className="editor-code-search" onClick={openCodeSearch} title="Find in code (⌘F)" aria-label="Find in code">⌕ <kbd>⌘F</kbd></button></div></div>
          <div className="tabs">{projectFiles.filter(isEditable).map((file) => <button key={file.path} className={file.path === activePath ? "tab-active" : "file-tab"} onClick={() => selectFile(file.path)} title={file.path}><i style={{ background: PRESETS[presetIndex].accent }} />{file.path.split("/").pop()} <span>{file.path === activePath && !saved ? "●" : "×"}</span></button>)}<button className="add-tab" onClick={addTextFile} aria-label="New file">＋</button></div>
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
            <div><button onClick={newChat} title="New chat">＋</button><button onClick={() => setChatOpen(false)} title="Close">×</button></div>
          </div>

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
              {message.autoApplied && <div className="auto-applied">✓ Auto-runで適用済み</div>}
              {message.changes?.length && <div className="code-proposal">
                <div><span>{message.changes.length} file changes</span><small>{message.changes.map((change) => change.type === "delete" ? `− ${change.path}` : change.type === "move" ? `↳ ${change.path} → ${change.to}` : `+ ${change.path}`).join(" · ")}</small></div>
                <button onClick={() => applyFileChanges(message.changes!)}>変更を適用</button>
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

      <footer className="preset-dock">
        <span>THREE.JS STARTERS</span>
        <div className="preset-list">{PRESETS.map((preset, index) => <button key={preset.name} className={presetIndex === index ? "preset-active" : ""} onClick={() => choosePreset(index)}><i style={{ "--swatch": preset.accent } as React.CSSProperties} /><span>{preset.name}<small>Three.js module</small></span></button>)}</div>
        <div className="hint"><kbd>⌘</kbd><kbd>↵</kbd><span>run</span><kbd>⌘</kbd><kbd>S</kbd><span>save</span></div>
      </footer>

      {libraryOpen && <div className="drawer-backdrop" onPointerDown={() => setLibraryOpen(false)}>
        <aside className="library-drawer" onPointerDown={(event) => event.stopPropagation()} aria-label="Saved project library">
          <div className="library-head"><div><span>LOCAL LIBRARY</span><strong>{library.length} saved sketches</strong></div><button onClick={() => setLibraryOpen(false)} aria-label="Close library">×</button></div>
          <div className="library-actions"><button onClick={() => importRef.current?.click()}>Import</button><button onClick={exportLibrary} disabled={!library.length}>Backup JSON</button></div>
          <div className="library-list">
            {!library.length && <div className="empty-library"><i>＋</i><strong>No saved sketches yet</strong><span>Press Save to add the current JavaScript file.</span></div>}
            {library.map((project) => <article key={project.id} className={project.id === activeProjectId ? "library-active" : ""}>
              <button className="library-load" onClick={() => loadProject(project)}><i /><span><strong>{project.name}</strong><small>{project.files.length} files · {project.files.filter((file) => file.kind === "asset").length} assets</small></span><time>{new Date(project.updatedAt).toLocaleDateString()}</time></button>
              <button className="library-delete" onClick={() => { void removeProject(project.id); setLibrary(library.filter((item) => item.id !== project.id)); }} aria-label={`Delete ${project.name}`}>×</button>
            </article>)}
          </div>
          <div className="library-note"><span>DEVICE STORAGE</span><p>Projects stay in this browser. Export a JSON backup before clearing browser data.</p></div>
        </aside>
      </div>}

    </main>
  );
}
