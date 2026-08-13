// Lightweight, dependency-free syntax highlighting for the code editor.
//
// Structure: each language is a flat list of regex rules (`Rule[]`). `tokenize`
// compiles a language's rules into a single alternation regex and walks the
// source once, so adding a new file type is just adding a new `Rule[]` entry
// to `LANGUAGES` plus an extension mapping in `LANGUAGE_BY_EXTENSION` — the
// tokenizer engine itself never needs to change.

export type TokenType =
  | "comment"
  | "string"
  | "keyword"
  | "number"
  | "boolean"
  | "function"
  | "tag"
  | "attr-name"
  | "property"
  | "selector"
  | "at-rule"
  | "heading"
  | "bold"
  | "italic"
  | "code"
  | "link"
  | "quote"
  | "list"
  | "punctuation"
  | "plain";

export type Token = { type: TokenType; text: string };

export type LanguageId = "javascript" | "json" | "css" | "html" | "markdown" | "glsl" | "plain";

type Rule = { type: TokenType; source: string };

const JS_KEYWORDS =
  "const|let|var|function|return|if|else|for|while|do|class|extends|new|import|export|default|from|as|" +
  "async|await|try|catch|finally|throw|switch|case|break|continue|typeof|instanceof|in|of|this|super|" +
  "yield|static|get|set|delete|void|null|undefined|true|false";

const GLSL_KEYWORDS =
  "void|main|highp|mediump|lowp|precision|uniform|varying|attribute|in|out|inout|const|struct|return|" +
  "if|else|for|while|discard|true|false|float|int|bool|vec2|vec3|vec4|mat2|mat3|mat4|sampler2D|samplerCube";

const JS_RULES: Rule[] = [
  { type: "comment", source: String.raw`\/\*[\s\S]*?\*\/|\/\/[^\n]*` },
  { type: "string", source: String.raw`` + "`(?:\\\\.|[^`\\\\])*`" + `|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'` },
  { type: "number", source: String.raw`\b0[xXbBoO][0-9a-fA-F]+\b|\b\d+\.?\d*(?:[eE][+-]?\d+)?\b` },
  { type: "keyword", source: `\\b(?:${JS_KEYWORDS})\\b` },
  { type: "function", source: String.raw`\b[A-Za-z_$][\w$]*(?=\s*\()` },
];

const JSON_RULES: Rule[] = [
  { type: "string", source: String.raw`"(?:\\.|[^"\\\n])*"` },
  { type: "number", source: String.raw`-?\b\d+\.?\d*(?:[eE][+-]?\d+)?\b` },
  { type: "boolean", source: String.raw`\b(?:true|false|null)\b` },
  { type: "punctuation", source: String.raw`[{}\[\]:,]` },
];

const CSS_RULES: Rule[] = [
  { type: "comment", source: String.raw`\/\*[\s\S]*?\*\/` },
  { type: "string", source: String.raw`"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'` },
  { type: "at-rule", source: String.raw`@[a-zA-Z-]+` },
  { type: "number", source: String.raw`#[0-9a-fA-F]{3,8}\b|-?\d+\.?\d*(?:px|em|rem|%|vh|vw|vmin|vmax|deg|s|ms|fr)?\b` },
  { type: "property", source: String.raw`[a-zA-Z-]+(?=\s*:)` },
  { type: "selector", source: String.raw`[.#][a-zA-Z_-][\w-]*` },
  { type: "punctuation", source: String.raw`[{}:;]` },
];

const HTML_RULES: Rule[] = [
  { type: "comment", source: String.raw`<!--[\s\S]*?-->` },
  { type: "string", source: String.raw`"[^"]*"|'[^']*'` },
  { type: "tag", source: String.raw`<\/?[a-zA-Z][\w-]*` },
  { type: "attr-name", source: String.raw`\b[a-zA-Z-][\w-]*(?=\s*=)` },
  { type: "punctuation", source: String.raw`\/?>` },
];

const MARKDOWN_RULES: Rule[] = [
  { type: "code", source: "```[\\s\\S]*?```|`[^`\\n]+`" },
  { type: "heading", source: String.raw`^#{1,6}[^\n]*$` },
  { type: "bold", source: String.raw`\*\*[^*\n]+\*\*|__[^_\n]+__` },
  { type: "italic", source: String.raw`\*[^*\n]+\*|_[^_\n]+_` },
  { type: "link", source: String.raw`!?\[[^\]\n]*\]\([^)\n]*\)` },
  { type: "quote", source: String.raw`^>[^\n]*$` },
  { type: "list", source: String.raw`^\s*(?:[-*+]|\d+\.)\s` },
];

const GLSL_RULES: Rule[] = [
  { type: "comment", source: String.raw`\/\*[\s\S]*?\*\/|\/\/[^\n]*` },
  { type: "number", source: String.raw`\b\d+\.?\d*\b` },
  { type: "keyword", source: `\\b(?:${GLSL_KEYWORDS})\\b` },
  { type: "function", source: String.raw`\b[A-Za-z_][\w]*(?=\s*\()` },
];

const LANGUAGES: Record<LanguageId, Rule[]> = {
  javascript: JS_RULES,
  json: JSON_RULES,
  css: CSS_RULES,
  html: HTML_RULES,
  markdown: MARKDOWN_RULES,
  glsl: GLSL_RULES,
  plain: [],
};

const LANGUAGE_LABELS: Record<LanguageId, string> = {
  javascript: "JavaScript",
  json: "JSON",
  css: "CSS",
  html: "HTML",
  markdown: "Markdown",
  glsl: "GLSL",
  plain: "Plain text",
};

const LANGUAGE_BY_EXTENSION: Record<string, LanguageId> = {
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "javascript",
  tsx: "javascript",
  json: "json",
  css: "css",
  html: "html",
  htm: "html",
  md: "markdown",
  markdown: "markdown",
  glsl: "glsl",
  frag: "glsl",
  vert: "glsl",
};

export function detectLanguage(path: string): LanguageId {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGE_BY_EXTENSION[ext] ?? "plain";
}

export function languageLabel(language: LanguageId): string {
  return LANGUAGE_LABELS[language];
}

const compiledCache = new Map<LanguageId, RegExp>();

function compiledRulesFor(language: LanguageId): { regex: RegExp; rules: Rule[] } | null {
  const rules = LANGUAGES[language];
  if (!rules.length) return null;
  let regex = compiledCache.get(language);
  if (!regex) {
    regex = new RegExp(rules.map((rule, index) => `(?<g${index}>${rule.source})`).join("|"), "gm");
    compiledCache.set(language, regex);
  }
  return { regex, rules };
}

export function tokenize(code: string, language: LanguageId): Token[] {
  const compiled = compiledRulesFor(language);
  if (!compiled) return code ? [{ type: "plain", text: code }] : [];
  const { regex, rules } = compiled;
  regex.lastIndex = 0;
  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(code))) {
    if (match.index > lastIndex) tokens.push({ type: "plain", text: code.slice(lastIndex, match.index) });
    const groupName = match.groups && Object.keys(match.groups).find((name) => match!.groups![name] !== undefined);
    const ruleIndex = groupName ? Number(groupName.slice(1)) : -1;
    tokens.push({ type: rules[ruleIndex]?.type ?? "plain", text: match[0] });
    lastIndex = match.index + match[0].length;
    if (match[0].length === 0) regex.lastIndex += 1;
  }
  if (lastIndex < code.length) tokens.push({ type: "plain", text: code.slice(lastIndex) });
  return tokens;
}
