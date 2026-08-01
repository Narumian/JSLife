"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

type PointerState = { x: number; y: number; px: number; py: number; down: boolean };
type FrameArgs = { time: number; delta: number; frame: number; pointer: PointerState };
type ResizeArgs = { width: number; height: number; pixelRatio: number };
type GraphicsRuntime = {
  frame?: (args: FrameArgs) => void;
  resize?: (args: ResizeArgs) => void;
  dispose?: () => void;
  renderer?: THREE.WebGLRenderer;
  scene?: THREE.Scene;
};
type Preset = { name: string; accent: string; code: string };
type SavedProject = { id: string; name: string; code: string; updatedAt: string };
type FileSearchItem = { id: string; name: string; code: string; updatedAt?: string; current?: boolean };
type DraftProject = { projectName?: string; code?: string; activeProjectId?: string | null; saved?: boolean };
type StudioPreferences = { chatOpen?: boolean; autoRun?: boolean };
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  code?: string;
  autoApplied?: boolean;
};
type CodexResult = { message: string; action: "none" | "replace"; code: string };

const STORAGE_LIBRARY = "jslife-library-v1";
const STORAGE_DRAFT = "jslife-three-draft-v1";
const STORAGE_CHAT = "jslife-codex-chat-v1";
const STORAGE_THREAD = "jslife-codex-thread-v1";
const STORAGE_PREFERENCES = "jslife-preferences-v1";
const CODEX_BRIDGE = "http://127.0.0.1:4317";

const THREE_ADDONS: Record<string, Record<string, unknown>> = {
  "three/addons/postprocessing/EffectComposer.js": { EffectComposer },
  "three/addons/postprocessing/RenderPass.js": { RenderPass },
  "three/addons/postprocessing/UnrealBloomPass.js": { UnrealBloomPass },
};

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

const compileModule = (source: string, mount: HTMLDivElement, viewport: ResizeArgs): GraphicsRuntime => {
  const threeImport = /import\s+\*\s+as\s+THREE\s+from\s+["']three["'];?/g;
  let executable = source.replace(threeImport, "");
  const addonImport = /import\s*\{([^}]+)\}\s*from\s*["'](three\/addons\/[^"']+)["'];?/g;
  executable = executable.replace(addonImport, (_statement, bindings: string, modulePath: string) => {
    const addonModule = THREE_ADDONS[modulePath];
    if (!addonModule) throw new Error(`Unsupported Three.js addon import: ${modulePath}`);
    return bindings.split(",").map((binding) => {
      const [imported, local = imported] = binding.trim().split(/\s+as\s+/);
      if (!/^[A-Za-z_$][\w$]*$/.test(imported) || !/^[A-Za-z_$][\w$]*$/.test(local) || !(imported in addonModule)) {
        throw new Error(`Unsupported export ${binding.trim()} from ${modulePath}`);
      }
      return `const ${local} = THREE_ADDONS[${JSON.stringify(modulePath)}][${JSON.stringify(imported)}];`;
    }).join("\n");
  });
  if (/\bimport\s/.test(executable)) {
    throw new Error("Unsupported import. Use Three.js or a supported Three.js addon.");
  }
  executable = executable
    .replace(/export\s+(async\s+)?function\s+/g, "$1function ")
    .replace(/export\s+(const|let|var|class)\s+/g, "$1 ")
    .replace(/export\s*\{[^}]*\};?/g, "");

  const factory = new Function(
    "THREE",
    "THREE_ADDONS",
    "mount",
    "viewport",
    `"use strict";\n${executable}\nreturn {\n` +
      `frame: typeof frame === "function" ? frame : undefined,\n` +
      `resize: typeof resize === "function" ? resize : undefined,\n` +
      `dispose: typeof dispose === "function" ? dispose : undefined,\n` +
      `renderer: typeof renderer !== "undefined" ? renderer : undefined,\n` +
      `scene: typeof scene !== "undefined" ? scene : undefined\n};`,
  );
  return factory(THREE, THREE_ADDONS, mount, viewport) as GraphicsRuntime;
};

const disposeScene = (scene?: THREE.Scene) => {
  scene?.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose?.();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    materials.forEach((material) => material.dispose());
  });
};

const safeName = (value: string) => value.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "sketch";

function Icon({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true">{children}</span>;
}

export default function Playground() {
  const [presetIndex, setPresetIndex] = useState(0);
  const [projectName, setProjectName] = useState(PRESETS[0].name);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [code, setCode] = useState(PRESETS[0].code);
  const [library, setLibrary] = useState<SavedProject[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [fileSearchOpen, setFileSearchOpen] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [fileSearchIndex, setFileSearchIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const [autoRun, setAutoRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(60);
  const [elapsed, setElapsed] = useState(0);
  const [resolution, setResolution] = useState({ width: 0, height: 0 });
  const [saved, setSaved] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatOnline, setChatOnline] = useState<boolean | null>(null);
  const [chatProgress, setChatProgress] = useState("");
  const [codexThreadId, setCodexThreadId] = useState<string | null>(null);
  const [undoCode, setUndoCode] = useState<string | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<GraphicsRuntime | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileSearchRef = useRef<HTMLInputElement>(null);
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
  const fileSearchItems = useMemo<FileSearchItem[]>(() => [
    { id: "__current__", name: projectName.trim() || "Untitled sketch", code, current: true },
    ...library.filter((project) => project.id !== activeProjectId),
  ], [activeProjectId, code, library, projectName]);
  const fileSearchResults = useMemo(() => {
    const query = fileSearchQuery.trim().toLocaleLowerCase();
    if (!query) return fileSearchItems;
    return fileSearchItems.filter((item) => `${item.name} main.js`.toLocaleLowerCase().includes(query));
  }, [fileSearchItems, fileSearchQuery]);

  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { autoRunRef.current = autoRun; }, [autoRun]);
  useEffect(() => {
    if (!fileSearchOpen) return;
    const timer = window.setTimeout(() => fileSearchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [fileSearchOpen]);

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

  const runSource = useCallback((source: string) => {
    const mount = mountRef.current;
    if (!mount) return;
    teardown();
    try {
      const viewport = currentViewport();
      const runtime = compileModule(source, mount, viewport);
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
      const runtime = compileModule(code, mount, viewport);
      runtimeRef.current = runtime;
      runtime.resize?.(viewport);
      sizeRef.current = viewport;
      setResolution({ width: viewport.width, height: viewport.height });
      setError(null);
      setSaved(false);
      localStorage.setItem(STORAGE_DRAFT, JSON.stringify({ projectName, code, activeProjectId, saved }));
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
  }, [activeProjectId, code, currentViewport, projectName, saved, teardown]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let sourceToRestore = PRESETS[0].code;
      try {
        const storedLibrary = JSON.parse(localStorage.getItem(STORAGE_LIBRARY) ?? "[]") as SavedProject[];
        if (Array.isArray(storedLibrary)) setLibrary(storedLibrary);
        const draft = JSON.parse(localStorage.getItem(STORAGE_DRAFT) ?? "null") as DraftProject | null;
        if (draft?.code) {
          sourceToRestore = draft.code;
          setCode(draft.code);
          setProjectName(draft.projectName || "Untitled sketch");
          setActiveProjectId(draft.activeProjectId ?? null);
          setSaved(draft.saved ?? false);
        }
        const storedChat = JSON.parse(localStorage.getItem(STORAGE_CHAT) ?? "[]") as ChatMessage[];
        if (Array.isArray(storedChat)) setChatMessages(storedChat);
        setCodexThreadId(localStorage.getItem(STORAGE_THREAD));
        const preferences = JSON.parse(localStorage.getItem(STORAGE_PREFERENCES) ?? "{}") as StudioPreferences;
        setChatOpen(preferences.chatOpen ?? false);
        setAutoRun(preferences.autoRun ?? false);
      } catch { /* ignore malformed browser data */ }
      draftReadyRef.current = true;
      preferencesReadyRef.current = true;
      runSource(sourceToRestore);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!draftReadyRef.current) return;
    localStorage.setItem(STORAGE_DRAFT, JSON.stringify({ projectName, code, activeProjectId, saved }));
  }, [activeProjectId, code, projectName, saved]);

  useEffect(() => {
    if (!preferencesReadyRef.current) return;
    localStorage.setItem(STORAGE_PREFERENCES, JSON.stringify({ chatOpen, autoRun }));
  }, [autoRun, chatOpen]);

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

  const persistLibrary = (projects: SavedProject[]) => {
    setLibrary(projects);
    localStorage.setItem(STORAGE_LIBRARY, JSON.stringify(projects));
  };

  const saveProject = () => {
    const now = new Date().toISOString();
    const id = activeProjectId ?? crypto.randomUUID();
    const project: SavedProject = { id, name: projectName.trim() || "Untitled sketch", code, updatedAt: now };
    const next = [project, ...library.filter((item) => item.id !== id)];
    persistLibrary(next);
    setActiveProjectId(id);
    setSaved(true);
  };

  const loadProject = (project: SavedProject) => {
    setProjectName(project.name);
    setCode(project.code);
    setActiveProjectId(project.id);
    setSaved(true);
    setLibraryOpen(false);
    window.setTimeout(() => runSource(project.code), 0);
  };

  const openFileSearch = () => {
    setFileSearchQuery("");
    setFileSearchIndex(0);
    setFileSearchOpen(true);
  };

  const chooseFileSearchItem = (item: FileSearchItem) => {
    setFileSearchOpen(false);
    if (item.current) {
      window.setTimeout(() => editorRef.current?.focus(), 0);
      return;
    }
    loadProject(item as SavedProject);
  };

  const choosePreset = (index: number) => {
    const preset = PRESETS[index];
    setPresetIndex(index);
    setProjectName(preset.name);
    setCode(preset.code);
    setActiveProjectId(null);
    setSaved(false);
    runSource(preset.code);
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

  const download = (filename: string, contents: string, type: string) => {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportSource = () => download(`${safeName(projectName)}.js`, code, "text/javascript");
  const exportLibrary = () => download("jslife-library.json", JSON.stringify({ version: 1, projects: library }, null, 2), "application/json");

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(text) as { projects?: SavedProject[] } | SavedProject[];
        const projects = Array.isArray(parsed) ? parsed : parsed.projects;
        if (!Array.isArray(projects)) throw new Error("Library JSON has no projects array");
        const merged = [...projects, ...library.filter((item) => !projects.some((incoming) => incoming.id === item.id))];
        persistLibrary(merged);
        setLibraryOpen(true);
      } else {
        setProjectName(file.name.replace(/\.js$/i, ""));
        setCode(text);
        setActiveProjectId(null);
        setSaved(false);
        runSource(text);
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
          const proposal = event.result.action === "replace" ? event.result.code : undefined;
          const autoApplied = Boolean(proposal && autoRunRef.current && codeRef.current === code);
          if (proposal && autoApplied) {
            setUndoCode(codeRef.current);
            setCode(proposal);
            setSaved(false);
          }
          appendChat({
            id: crypto.randomUUID(),
            role: "assistant",
            text: event.result.message,
            code: autoApplied ? undefined : proposal,
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

  const applySuggestion = (suggestion: string) => {
    setUndoCode(code);
    setCode(suggestion);
    setSaved(false);
    if (!autoRun) runSource(suggestion);
  };

  const undoSuggestion = () => {
    if (undoCode === null) return;
    const previous = undoCode;
    setCode(previous);
    setUndoCode(null);
    setSaved(false);
    if (!autoRun) runSource(previous);
  };

  const newChat = () => {
    persistChat([]);
    setCodexThreadId(null);
    localStorage.removeItem(STORAGE_THREAD);
  };

  return (
    <main className={`studio ${chatOpen ? "chat-open" : ""}`}>
      <input ref={importRef} className="visually-hidden" type="file" accept=".js,.json,text/javascript,application/json" onChange={importFile} />
      <header className="topbar">
        <div className="brand"><span className="brand-mark">J</span><span>JSLIFE</span></div>
        <nav className="main-nav" aria-label="Main navigation"><button className={!chatOpen ? "nav-active" : ""} onClick={() => setChatOpen(false)}>Studio</button><button onClick={() => setLibraryOpen(true)}>Library</button><button className={chatOpen ? "nav-active" : ""} onClick={() => setChatOpen(true)}>Codex</button></nav>
        <div className="top-actions">
          <span className={`save-state ${saved ? "saved" : ""}`}><i />{saved ? "Saved in library" : "Unsaved changes"}</span>
          <button className="text-button" onClick={() => importRef.current?.click()}>Import</button>
          <button className="text-button" onClick={exportSource}>Export .js</button>
          <button className="save-button" onClick={saveProject}>Save</button>
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
          <button className="rail-active" aria-label="Code"><Icon>⌘</Icon></button>
          <button aria-label="Library" onClick={() => setLibraryOpen(true)}><Icon>▤</Icon></button>
          <button aria-label="Import" onClick={() => importRef.current?.click()}><Icon>⇣</Icon></button>
          <button className={chatOpen ? "rail-ai-active" : ""} aria-label="Codex chat" onClick={() => setChatOpen((open) => !open)}><Icon>✦</Icon></button>
          <span className="rail-spacer" /><button aria-label="Settings"><Icon>⚙</Icon></button>
        </aside>

        <section className="editor-panel" aria-label="JavaScript module editor">
          <div className="panel-heading"><span>JAVASCRIPT MODULE</span><div><span className="module-api">THREE · mount · frame · resize</span><button className="editor-file-search" onClick={openFileSearch} title="Search files (⌘F)" aria-label="Search files">⌕ <kbd>⌘F</kbd></button></div></div>
          <div className="tabs"><button className="tab-active"><i style={{ background: PRESETS[presetIndex].accent }} />main.js <span>{saved ? "×" : "●"}</span></button><button className="add-tab" aria-label="New file">＋</button></div>
          <div className="editor-wrap">
            <pre className="line-numbers" aria-hidden="true">{Array.from({ length: lines }, (_, i) => i + 1).join("\n")}</pre>
            <textarea
              ref={editorRef}
              value={code}
              onChange={(event) => { setCode(event.target.value); setSaved(false); }}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") { event.preventDefault(); openFileSearch(); }
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
              aria-label="JavaScript source code"
            />
          </div>
          <div className="editor-status"><span>JavaScript ES Module</span><span>{lines} lines</span><span>UTF-8</span><span className="context-ready">● WebGL ready</span></div>
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
            <div className="stage-label"><span>WEBGL RENDERER</span><small>main.js · Move your pointer</small></div>
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
              <strong>main.jsを見ながら相談できます</strong>
              <p>説明、エラー診断、Three.jsコードの変更を頼めます。変更案は確認してから適用されます。</p>
            </div>}
            {chatMessages.map((message) => <article key={message.id} className={`chat-message ${message.role}`}>
              <small>{message.role === "user" ? "YOU" : "CODEX"}</small>
              <p>{message.text}</p>
              {message.autoApplied && <div className="auto-applied">✓ Auto-runで適用済み</div>}
              {message.code && <div className="code-proposal">
                <div><span>main.js</span><small>{message.code.split("\n").length} lines · complete replacement</small></div>
                <button onClick={() => applySuggestion(message.code!)}>適用</button>
              </div>}
            </article>)}
            {chatBusy && <div className="chat-thinking"><i /><span>{chatProgress || "Codexが考えています…"}</span><button onClick={() => chatAbortRef.current?.abort()}>停止</button></div>}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-composer">
            {undoCode !== null && <button className="undo-code" onClick={undoSuggestion}>↶ 最後のAI変更を元に戻す</button>}
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
                placeholder="main.jsについてCodexに相談…"
                rows={3}
              />
              <button onClick={() => void sendChat()} disabled={!chatInput.trim() || chatBusy} aria-label="Send to Codex">↑</button>
            </div>
            <small className="chat-privacy">現在のコードとプレビュー画像をローカルCodexへ送信 · Auto-run以外は自動適用されません</small>
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
              <button className="library-load" onClick={() => loadProject(project)}><i /><span><strong>{project.name}</strong><small>main.js · {project.code.split("\n").length} lines</small></span><time>{new Date(project.updatedAt).toLocaleDateString()}</time></button>
              <button className="library-delete" onClick={() => persistLibrary(library.filter((item) => item.id !== project.id))} aria-label={`Delete ${project.name}`}>×</button>
            </article>)}
          </div>
          <div className="library-note"><span>DEVICE STORAGE</span><p>Projects stay in this browser. Export a JSON backup before clearing browser data.</p></div>
        </aside>
      </div>}

      {fileSearchOpen && <div className="file-search-backdrop" onPointerDown={() => setFileSearchOpen(false)}>
        <section className="file-search" role="dialog" aria-modal="true" aria-label="Search files" onPointerDown={(event) => event.stopPropagation()}>
          <div className="file-search-input">
            <span aria-hidden="true">⌕</span>
            <input
              ref={fileSearchRef}
              value={fileSearchQuery}
              onChange={(event) => { setFileSearchQuery(event.target.value); setFileSearchIndex(0); }}
              onKeyDown={(event) => {
                if (event.key === "Escape") { event.preventDefault(); setFileSearchOpen(false); editorRef.current?.focus(); }
                if (event.key === "ArrowDown") { event.preventDefault(); setFileSearchIndex((index) => Math.min(index + 1, Math.max(0, fileSearchResults.length - 1))); }
                if (event.key === "ArrowUp") { event.preventDefault(); setFileSearchIndex((index) => Math.max(0, index - 1)); }
                if (event.key === "Enter" && fileSearchResults[fileSearchIndex]) { event.preventDefault(); chooseFileSearchItem(fileSearchResults[fileSearchIndex]); }
              }}
              placeholder="Search saved files…"
              aria-label="File name"
              aria-controls="file-search-results"
              aria-activedescendant={fileSearchResults[fileSearchIndex] ? `file-search-${fileSearchResults[fileSearchIndex].id}` : undefined}
              autoComplete="off"
            />
            <kbd>ESC</kbd>
          </div>
          <div className="file-search-results" id="file-search-results" role="listbox">
            {!fileSearchResults.length && <div className="file-search-empty">No matching files</div>}
            {fileSearchResults.map((item, index) => <button
              id={`file-search-${item.id}`}
              key={item.id}
              className={index === fileSearchIndex ? "file-search-active" : ""}
              role="option"
              aria-selected={index === fileSearchIndex}
              onMouseEnter={() => setFileSearchIndex(index)}
              onClick={() => chooseFileSearchItem(item)}
            >
              <i aria-hidden="true">JS</i>
              <span><strong>{item.name}</strong><small>main.js · {item.code.split("\n").length} lines</small></span>
              <em>{item.current ? "CURRENT" : item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "SAVED"}</em>
            </button>)}
          </div>
          <footer><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span>{fileSearchResults.length} files</span></footer>
        </section>
      </div>}
    </main>
  );
}
