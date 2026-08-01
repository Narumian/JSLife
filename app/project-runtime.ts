import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import type { ProjectFile } from "./project-store";

export type PointerState = { x: number; y: number; px: number; py: number; down: boolean };
export type FrameArgs = { time: number; delta: number; frame: number; pointer: PointerState };
export type ResizeArgs = { width: number; height: number; pixelRatio: number };
export type GraphicsRuntime = {
  frame?: (args: FrameArgs) => void;
  resize?: (args: ResizeArgs) => void;
  dispose?: () => void;
  renderer?: THREE.WebGLRenderer;
  scene?: THREE.Scene;
};

const THREE_ADDONS: Record<string, Record<string, unknown>> = {
  "three/addons/postprocessing/EffectComposer.js": { EffectComposer },
  "three/addons/postprocessing/RenderPass.js": { RenderPass },
  "three/addons/postprocessing/UnrealBloomPass.js": { UnrealBloomPass },
};

const normalizePath = (path: string) => {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
};

const resolvePath = (from: string, request: string, paths: Set<string>) => {
  if (!request.startsWith(".")) return request;
  const base = from.split("/").slice(0, -1).join("/");
  const resolved = normalizePath(`${base}/${request}`);
  const candidates = [resolved, `${resolved}.js`, `${resolved}.json`, `${resolved}/index.js`];
  return candidates.find((candidate) => paths.has(candidate)) ?? resolved;
};

const importBindings = (bindings: string, request: string): string => {
  const importedModule = `__require(${JSON.stringify(request)})`;
  const trimmed = bindings.trim();
  if (trimmed.startsWith("*")) {
    const name = trimmed.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/)?.[1];
    if (!name) throw new Error(`Unsupported import binding: ${bindings}`);
    return `const ${name} = ${importedModule};`;
  }
  if (trimmed.startsWith("{")) {
    const names = trimmed.slice(1, -1).split(",").filter(Boolean).map((binding) => {
      const [imported, local] = binding.trim().split(/\s+as\s+/);
      return local ? `${imported}: ${local}` : imported;
    }).join(", ");
    return `const { ${names} } = ${importedModule};`;
  }
  const comma = trimmed.indexOf(",");
  if (comma === -1) return `const ${trimmed} = ${importedModule}.default;`;
  const defaultName = trimmed.slice(0, comma).trim();
  const rest = trimmed.slice(comma + 1).trim();
  return `const ${defaultName} = ${importedModule}.default;\n${importBindings(rest, request)}`;
};

const transformModule = (source: string, path: string, paths: Set<string>) => {
  const exported = new Set<string>();
  let executable = source.replace(/import\s+\*\s+as\s+THREE\s+from\s+["']three["'];?/g, "const THREE = __THREE;");
  executable = executable.replace(/import\s*\{([^}]+)\}\s*from\s*["'](three\/addons\/[^"']+)["'];?/g, (_statement, bindings: string, modulePath: string) => {
    const addonModule = THREE_ADDONS[modulePath];
    if (!addonModule) throw new Error(`Unsupported Three.js addon import: ${modulePath}`);
    return bindings.split(",").map((binding) => {
      const [imported, local = imported] = binding.trim().split(/\s+as\s+/);
      if (!(imported in addonModule)) throw new Error(`Unsupported export ${imported} from ${modulePath}`);
      return `const ${local} = __THREE_ADDONS[${JSON.stringify(modulePath)}][${JSON.stringify(imported)}];`;
    }).join("\n");
  });
  executable = executable.replace(/import\s+([^;\n]+?)\s+from\s+["']([^"']+)["'];?/g, (_statement, bindings: string, request: string) => {
    if (!request.startsWith(".")) throw new Error(`Unsupported import: ${request}`);
    return importBindings(bindings, resolvePath(path, request, paths));
  });
  executable = executable.replace(/import\s+["']([^"']+)["'];?/g, (_statement, request: string) => {
    if (!request.startsWith(".")) throw new Error(`Unsupported import: ${request}`);
    return `__require(${JSON.stringify(resolvePath(path, request, paths))});`;
  });

  executable = executable.replace(/export\s+default\s+(async\s+)?function\s+([A-Za-z_$][\w$]*)/g, (_statement, asyncKeyword = "", name: string) => {
    exported.add(`default:${name}`);
    return `${asyncKeyword}function ${name}`;
  });
  executable = executable.replace(/export\s+default\s+([^;]+);?/g, (_statement, expression: string) => {
    exported.add("default:__default_export__");
    return `const __default_export__ = ${expression};`;
  });
  executable = executable.replace(/export\s+(async\s+)?function\s+([A-Za-z_$][\w$]*)/g, (_statement, asyncKeyword = "", name: string) => {
    exported.add(`${name}:${name}`);
    return `${asyncKeyword}function ${name}`;
  });
  executable = executable.replace(/export\s+class\s+([A-Za-z_$][\w$]*)/g, (_statement, name: string) => {
    exported.add(`${name}:${name}`);
    return `class ${name}`;
  });
  executable = executable.replace(/export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)/g, (_statement, kind: string, name: string) => {
    exported.add(`${name}:${name}`);
    return `${kind} ${name}`;
  });
  executable = executable.replace(/export\s*\{([^}]+)\};?/g, (_statement, bindings: string) => {
    for (const binding of bindings.split(",")) {
      const [local, name = local] = binding.trim().split(/\s+as\s+/);
      exported.add(`${name}:${local}`);
    }
    return "";
  });
  const assignments = [...exported].map((binding) => {
    const separator = binding.indexOf(":");
    const name = binding.slice(0, separator);
    const local = binding.slice(separator + 1);
    return `__exports[${JSON.stringify(name)}] = ${local};`;
  }).join("\n");
  return `const asset = (request) => __asset(${JSON.stringify(path)}, request);\n${executable}\n${assignments}`;
};

export function compileProject(files: ProjectFile[], entry: string, mount: HTMLDivElement, viewport: ResizeArgs): GraphicsRuntime {
  const paths = new Set(files.map((file) => file.path));
  const fileMap = new Map(files.map((file) => [file.path, file]));
  const urls = new Map<string, string>();
  const assetUrl = (from: string, request: string) => {
    const path = request.startsWith(".") ? resolvePath(from, request, paths) : normalizePath(request);
    const file = fileMap.get(path);
    if (!file || file.kind !== "asset") throw new Error(`Asset not found: ${path}`);
    let url = urls.get(path);
    if (!url) {
      url = URL.createObjectURL(file.content);
      urls.set(path, url);
    }
    return url;
  };
  const modules = [...fileMap.values()].map((file) => {
    if (file.kind === "asset") return `${JSON.stringify(file.path)}: (__require, __exports) => { __exports.default = __asset(${JSON.stringify(entry)}, ${JSON.stringify(file.path)}); }`;
    const extension = file.path.split(".").pop()?.toLowerCase();
    if (extension !== "js" && extension !== "mjs") {
      const value = extension === "json" ? `JSON.parse(${JSON.stringify(file.content)})` : JSON.stringify(file.content);
      return `${JSON.stringify(file.path)}: (__require, __exports) => { __exports.default = ${value}; }`;
    }
    return `${JSON.stringify(file.path)}: (__require, __exports) => { ${transformModule(file.content, file.path, paths)} }`;
  }).join(",\n");
  const factory = new Function("__THREE", "__THREE_ADDONS", "mount", "viewport", "__asset", `
    "use strict";
    const __modules = { ${modules} };
    const __cache = {};
    const __require = (path) => {
      if (__cache[path]) return __cache[path];
      const module = __modules[path];
      if (!module) throw new Error("Project file not found: " + path);
      const exports = {};
      __cache[path] = exports;
      module(__require, exports);
      return exports;
    };
    return __require(${JSON.stringify(entry)});
  `);
  try {
    const exports = factory(THREE, THREE_ADDONS, mount, viewport, assetUrl) as GraphicsRuntime;
    const userDispose = exports.dispose;
    return {
      ...exports,
      dispose: () => {
        try { userDispose?.(); } finally { urls.forEach((url) => URL.revokeObjectURL(url)); }
      },
    };
  } catch (error) {
    urls.forEach((url) => URL.revokeObjectURL(url));
    throw error;
  }
}

export function disposeScene(scene?: THREE.Scene) {
  scene?.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose?.();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    materials.forEach((material) => material.dispose());
  });
}
