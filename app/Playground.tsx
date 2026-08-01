"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Preset = {
  name: string;
  accent: string;
  code: string;
};

const PRESETS: Preset[] = [
  {
    name: "Neon Bloom",
    accent: "#c8ff45",
    code: `// Neon Bloom — animated canvas study
const { width: w, height: h } = canvas;
ctx.fillStyle = "#070a0d";
ctx.fillRect(0, 0, w, h);

ctx.save();
ctx.translate(w / 2, h / 2);
ctx.globalCompositeOperation = "lighter";

for (let ring = 0; ring < 7; ring++) {
  const count = 34 + ring * 7;
  const radius = 54 + ring * 34;
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2;
    const wave = Math.sin(a * 5 - time * 1.4 + ring) * 18;
    const r = radius + wave;
    const x = Math.cos(a + time * 0.08) * r;
    const y = Math.sin(a + time * 0.08) * r;
    const size = 1.2 + (Math.sin(a * 3 + time * 2) + 1) * 1.5;
    ctx.fillStyle = ring % 2 ? "#8a5cff" : "#c8ff45";
    ctx.globalAlpha = 0.22 + ring * 0.04;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}
ctx.restore();`,
  },
  {
    name: "Liquid Grid",
    accent: "#6fe7ff",
    code: `// Liquid Grid — move the pointer across the stage
const { width: w, height: h } = canvas;
ctx.fillStyle = "#071013";
ctx.fillRect(0, 0, w, h);

const gap = Math.max(22, Math.min(w, h) / 18);
for (let y = -gap; y < h + gap; y += gap) {
  for (let x = -gap; x < w + gap; x += gap) {
    const dx = x - pointer.x;
    const dy = y - pointer.y;
    const d = Math.hypot(dx, dy);
    const pull = Math.max(0, 1 - d / 240);
    const drift = Math.sin(time * 1.7 + x * .018 + y * .012) * 7;
    const px = x + (dx / (d || 1)) * pull * 34 + drift;
    const py = y + (dy / (d || 1)) * pull * 34;
    const size = 2 + pull * 7;
    ctx.fillStyle = pull > .25 ? "#c8ff45" : "#6fe7ff";
    ctx.globalAlpha = .18 + pull * .75;
    ctx.fillRect(px - size / 2, py - size / 2, size, size);
  }
}`,
  },
  {
    name: "Solar Echo",
    accent: "#ff7456",
    code: `// Solar Echo — layered orbital trails
const { width: w, height: h } = canvas;
ctx.fillStyle = "rgba(9, 8, 15, .18)";
ctx.fillRect(0, 0, w, h);
ctx.save();
ctx.translate(w / 2, h / 2);
ctx.globalCompositeOperation = "lighter";

for (let i = 0; i < 140; i++) {
  const p = i / 140;
  const a = p * Math.PI * 12 + time * (.22 + p * .12);
  const radius = 24 + p * Math.min(w, h) * .42;
  const squash = .56 + Math.sin(time * .3) * .08;
  const x = Math.cos(a) * radius;
  const y = Math.sin(a) * radius * squash;
  ctx.fillStyle = i % 3 ? "#ff7456" : "#8a5cff";
  ctx.globalAlpha = .15 + p * .55;
  ctx.beginPath();
  ctx.arc(x, y, 1 + p * 4, 0, Math.PI * 2);
  ctx.fill();
}
ctx.restore();`,
  },
];

type CompiledFrame = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  time: number,
  pointer: { x: number; y: number; down: boolean },
  frame: number,
) => void;

const compile = (source: string): CompiledFrame =>
  new Function("ctx", "canvas", "time", "pointer", "frame", source) as CompiledFrame;

function Icon({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true">{children}</span>;
}

export default function Playground() {
  const [presetIndex, setPresetIndex] = useState(0);
  const [code, setCode] = useState(PRESETS[0].code);
  const [running, setRunning] = useState(true);
  const [autoRun, setAutoRun] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(60);
  const [elapsed, setElapsed] = useState(0);
  const [saved, setSaved] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameFn = useRef<CompiledFrame | null>(null);
  const pointer = useRef({ x: 0, y: 0, down: false });
  const startTime = useRef(performance.now());
  const pausedAt = useRef(0);

  const lines = useMemo(() => code.split("\n").length, [code]);

  const runCode = useCallback(() => {
    try {
      frameFn.current = compile(code);
      setError(null);
      setSaved(true);
      localStorage.setItem("jslife-code", code);
      localStorage.setItem("jslife-preset", String(presetIndex));
    } catch (caught) {
      frameFn.current = null;
      setError(caught instanceof Error ? caught.message : "Unknown compile error");
    }
  }, [code, presetIndex]);

  useEffect(() => {
    const stored = localStorage.getItem("jslife-code");
    const storedPreset = Number(localStorage.getItem("jslife-preset"));
    if (stored) setCode(stored);
    if (Number.isInteger(storedPreset) && PRESETS[storedPreset]) setPresetIndex(storedPreset);
  }, []);

  useEffect(() => {
    if (!autoRun) return;
    const timer = window.setTimeout(runCode, 320);
    return () => window.clearTimeout(timer);
  }, [autoRun, runCode]);

  useEffect(() => {
    runCode();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let fpsStarted = performance.now();
    const draw = (now: number) => {
      const canvas = canvasRef.current;
      const stage = stageRef.current;
      if (canvas && stage) {
        const rect = stage.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio, 2);
        const width = Math.max(1, Math.floor(rect.width * dpr));
        const height = Math.max(1, Math.floor(rect.height * dpr));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          canvas.style.width = `${rect.width}px`;
          canvas.style.height = `${rect.height}px`;
          pointer.current.x = width / 2;
          pointer.current.y = height / 2;
        }
        if (running && frameFn.current) {
          const ctx = canvas.getContext("2d");
          const seconds = (now - startTime.current) / 1000;
          if (ctx) {
            try {
              frameFn.current(ctx, canvas, seconds, pointer.current, frames);
              setElapsed(seconds);
              setError(null);
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Runtime error");
              frameFn.current = null;
            }
          }
        }
        frames += 1;
        if (now - fpsStarted > 700) {
          setFps(Math.round((frames * 1000) / (now - fpsStarted)));
          frames = 0;
          fpsStarted = now;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const choosePreset = (index: number) => {
    setPresetIndex(index);
    setCode(PRESETS[index].code);
    setSaved(false);
    startTime.current = performance.now();
    setRunning(true);
  };

  const toggleRunning = () => {
    if (running) {
      pausedAt.current = elapsed;
      setRunning(false);
    } else {
      startTime.current = performance.now() - pausedAt.current * 1000;
      setRunning(true);
    }
  };

  const reset = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    startTime.current = performance.now();
    setElapsed(0);
    setRunning(true);
    runCode();
  };

  const updatePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointer.current.x = (event.clientX - rect.left) * (event.currentTarget.width / rect.width);
    pointer.current.y = (event.clientY - rect.top) * (event.currentTarget.height / rect.height);
  };

  return (
    <main className="studio">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">J</span><span>JSLIFE</span></div>
        <nav className="main-nav" aria-label="Main navigation">
          <button className="nav-active">Studio</button><button>Gallery</button><button>Docs</button>
        </nav>
        <div className="top-actions">
          <span className={`save-state ${saved ? "saved" : ""}`}><i />{saved ? "Saved locally" : "Unsaved"}</span>
          <button className="icon-button" aria-label="Share project"><Icon>↗</Icon></button>
          <button className="run-button" onClick={runCode}><Icon>▶</Icon> Run</button>
        </div>
      </header>

      <section className="projectbar">
        <div className="project-title"><button aria-label="Back to projects">‹</button><div><strong>{PRESETS[presetIndex].name}</strong><span>Canvas 2D · JavaScript</span></div></div>
        <div className="project-meta"><span>{fps} FPS</span><span>{canvasRef.current?.width ?? 0} × {canvasRef.current?.height ?? 0}</span><button onClick={() => document.documentElement.requestFullscreen?.()} aria-label="Enter fullscreen">⛶</button></div>
      </section>

      <section className="workspace">
        <aside className="rail" aria-label="Studio tools">
          <button className="rail-active" aria-label="Code"><Icon>⌘</Icon></button>
          <button aria-label="Assets"><Icon>◇</Icon></button>
          <button aria-label="Controls"><Icon>◫</Icon></button>
          <span className="rail-spacer" />
          <button aria-label="Settings"><Icon>⚙</Icon></button>
        </aside>

        <section className="editor-panel" aria-label="JavaScript editor">
          <div className="panel-heading"><span>EDITOR</span><button aria-label="Editor menu">•••</button></div>
          <div className="tabs"><button className="tab-active"><i style={{ background: PRESETS[presetIndex].accent }} />sketch.js <span>{saved ? "×" : "●"}</span></button><button className="add-tab" aria-label="New file">＋</button></div>
          <div className="editor-wrap">
            <pre className="line-numbers" aria-hidden="true">{Array.from({ length: lines }, (_, i) => i + 1).join("\n")}</pre>
            <textarea
              value={code}
              onChange={(event) => { setCode(event.target.value); setSaved(false); }}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); runCode(); }
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
          <div className="editor-status"><span>JavaScript</span><span>Ln {lines}, Col 1</span><span>UTF-8</span></div>
        </section>

        <section className="preview-panel">
          <div className="panel-heading"><span>LIVE OUTPUT</span><div><span className="live-dot" />{running ? "LIVE" : "PAUSED"}</div></div>
          <div
            className="stage"
            ref={stageRef}
            style={{ "--preset-accent": PRESETS[presetIndex].accent } as React.CSSProperties}
          >
            <canvas
              ref={canvasRef}
              onPointerMove={updatePointer}
              onPointerDown={(event) => { pointer.current.down = true; updatePointer(event); }}
              onPointerUp={() => { pointer.current.down = false; }}
              aria-label="Live JavaScript canvas output"
            />
            <div className="stage-label"><span>{PRESETS[presetIndex].name}</span><small>Move your pointer</small></div>
            {error && <div className="error-toast"><strong>Execution paused</strong><span>{error}</span></div>}
          </div>
          <div className="transport">
            <button onClick={reset} aria-label="Restart">↺</button>
            <button className="play" onClick={toggleRunning} aria-label={running ? "Pause" : "Play"}>{running ? "Ⅱ" : "▶"}</button>
            <div className="timecode">{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(Math.floor(elapsed % 60)).padStart(2, "0")}<small>.{String(Math.floor((elapsed % 1) * 100)).padStart(2, "0")}</small></div>
            <div className="timeline"><i style={{ width: `${(elapsed % 10) * 10}%` }} /><span style={{ left: `${(elapsed % 10) * 10}%` }} /></div>
            <label className="auto-run"><input type="checkbox" checked={autoRun} onChange={(event) => setAutoRun(event.target.checked)} /> Auto-run</label>
          </div>
        </section>
      </section>

      <footer className="preset-dock">
        <span>STARTER PATCHES</span>
        <div className="preset-list">
          {PRESETS.map((preset, index) => (
            <button key={preset.name} className={presetIndex === index ? "preset-active" : ""} onClick={() => choosePreset(index)}>
              <i style={{ "--swatch": preset.accent } as React.CSSProperties} />
              <span>{preset.name}<small>JavaScript canvas</small></span>
            </button>
          ))}
        </div>
        <div className="hint"><kbd>⌘</kbd><kbd>↵</kbd><span>to run</span></div>
      </footer>
    </main>
  );
}
