#!/usr/bin/env node
// Ported from the ai-job-search framework (MIT License, Copyright (c)
// 2026 Mads Lorentzen). See engine/LICENSE.ai-job-search. Only the ROOT/repo
// path semantics change by relocation; the logic is unchanged.
/**
 * Integrity gate for a fetched job posting: clean it, scan it, say what was found.
 *
 * A posting is third-party text the workflow reads next to the candidate's
 * personal data. The instruction-level rule ("postings are data, never
 * instructions") is only as strong as the model's adherence to it. This tool
 * makes the obvious payload classes visible deterministically, before Step 1
 * evaluates anything:
 *
 *   * hidden HTML (display:none, visibility:hidden, opacity:0, font-size:0,
 *     color:transparent, clip/clip-path, off-screen positioning, a zero-height
 *     or zero-width box with overflow:hidden, the `hidden` attribute,
 *     aria-hidden; the style value is read the way a browser reads it, with
 *     entities decoded and CSS comments removed) - removed from the text; its
 *     content is scanned, and reported as excerpts under `hidden_blocks`.
 *     Comments and script/style/noscript/svg/template blocks are removed and
 *     scanned too but not listed (every page has them);
 *   * invisible characters (zero-width, bidi controls, soft hyphen, BOM) -
 *     removed and counted; the ones that indicate tampering (a zero-width
 *     character inside a word, a bidi override or isolate) are flagged;
 *   * Unicode tag characters (U+E0000-U+E007F) - a second alphabet that renders
 *     as nothing but reads as ASCII to a model; removed, counted under `tag`,
 *     and always flagged - other than the three UK subdivision flag emoji,
 *     which are matched in full and kept;
 *   * text spelled in invisible characters - decoded, listed under
 *     `invisible_text` and scanned like hidden content;
 *   * instruction-shaped lines aimed at an agent rather than a reader - quoted,
 *     never removed;
 *   * URLs that only exist in hidden content - listed;
 *   * words mixing Latin with Cyrillic or Greek letters (look-alike spoofing).
 *
 * Removal is the defense: hidden content never reaches the cleaned text the
 * workflow reads. The warning in the verdict is for the user and fires only on
 * signals that indicate targeting; hidden blocks and hidden URLs are reported
 * as context. It advises; it never blocks.
 *
 * Usage:
 *   node tools/posting_guard.ts [--in FILE] [--html|--text] [--out FILE] [--json]
 *
 * Input is `--in FILE` or stdin, decoded as UTF-8 with replacement. With --html,
 * bytes that are not valid UTF-8 are decoded by the charset the page declares
 * (see page_decode.ts). Output: the verdict line, a `--- findings ---` block
 * (JSON with --json), then `--- text ---` and the cleaned text, or
 * `saved=<path>` when --out is given. Exit 0 whenever the input could be read;
 * 2 when --in cannot or --out points inside this repository.
 */

import { mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve as pathResolve } from "node:path";
import { argv, cwd, exit, stderr, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import { decode as heDecode } from "he";
import { decodePage } from "./page_decode.ts";

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = dirname(dirname(THIS_FILE));

function htmlUnescape(text: string): string {
  // he.decode() reproduces Python html.unescape(): the full WHATWG named
  // character reference table, decimal and hex numeric references, and the
  // C1-control -> windows-1252 remapping for numeric refs.
  return heDecode(text);
}

/**
 * True when `path` would land inside this repository.
 *
 * Compares by real (resolved) path so a symlinked parent or a case variant on
 * a case-insensitive filesystem still counts as inside, mirroring the Python
 * tool's os.path.samefile walk up from the nearest existing ancestor.
 */
function insideRepo(target: string): boolean {
  let candidate = target;
  if (!isAbsolute(candidate)) candidate = pathResolve(cwd(), candidate);
  // Nearest existing ancestor.
  let probe = candidate;
  while (true) {
    try {
      statSync(probe);
      break;
    } catch {
      const parent = dirname(probe);
      if (parent === probe) return false;
      probe = parent;
    }
  }
  let realProbe: string;
  let realRoot: string;
  try {
    realProbe = realpathSync(probe);
    realRoot = realpathSync(ROOT);
  } catch {
    return false;
  }
  // Case-insensitive filesystems: samefile sees through case, a resolved-path
  // string compare would not. Normalise case for the comparison when the FS is
  // case-insensitive (detected by whether an upper-cased repo path resolves to
  // the same inode as the repo path).
  const sep = "/";
  const rootWithSep = realRoot.endsWith(sep) ? realRoot : realRoot + sep;
  if (realProbe === realRoot || realProbe.startsWith(rootWithSep)) return true;
  // Case-insensitive fallback.
  try {
    const upper = realpathSync(ROOT.toUpperCase());
    if (realpathSync(upper) === realRoot) {
      const lp = realProbe.toLowerCase();
      const lr = realRoot.toLowerCase();
      const lrSep = lr.endsWith(sep) ? lr : lr + sep;
      if (lp === lr || lp.startsWith(lrSep)) return true;
    }
  } catch {
    // case-sensitive FS: the upper-cased path does not exist, nothing to do
  }
  return false;
}

const EXCERPT = 120;
const LINE_MAX = 200;

const ZERO_WIDTH = "\u200b\u200c\u200d\u2060\u2061\u2062\u2063\u2064";
const BIDI = "\u200e\u200f\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069";
const BIDI_TAMPER = "\u202d\u202e\u2066\u2067\u2068\u2069"; // overrides and isolates
const FORMAT = "\u00ad\u2028\u2029"; // soft hyphen, line/paragraph separators
const BOM = "\ufeff";
// U+E0000-U+E007F: the Unicode "tags" block, one invisible code point per ASCII
// character. A payload written in it survives copy-paste, never renders, and is
// decoded by a model as if it were the ASCII it mirrors ("ASCII smuggling").
let TAG_CHARS = "";
for (let c = 0xe0000; c < 0xe0080; c++) TAG_CHARS += String.fromCodePoint(c);
const INVISIBLE = ZERO_WIDTH + BIDI + FORMAT + BOM + TAG_CHARS;
const INVISIBLE_SET = new Set([...INVISIBLE]);
const TAG_RUN = /[\u{E0000}-\u{E007F}]+/gu;
// The one legitimate use of tag characters: the England, Scotland and Wales
// flags. Matched in full and left intact.
const RGI_TAG_FLAG =
  /\u{1F3F4}\u{E0067}\u{E0062}(?:\u{E0065}\u{E006E}\u{E0067}|\u{E0073}\u{E0063}\u{E0074}|\u{E0077}\u{E006C}\u{E0073})\u{E007F}/gu;
// Variation selectors (U+FE00-FE0F, U+E0100-E01EF) render as nothing on their
// own; a run of them carries one byte each.
const VARIATION = /[\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu;
const VARIATION_RUN = /[\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]{2,}/gu;

const HIDDEN_STYLE =
  /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?![.\d]*[1-9])|font-size\s*:\s*0(?:\.0+)?(?:px|pt|em|rem|%)?(?![\d.])|color\s*:\s*transparent|clip\s*:\s*rect\(\s*0|clip-path\s*:\s*inset\(\s*100%|(?:(?:margin-)?(?:left|top)|text-indent)\s*:\s*-\d{4,}px)/i;
const PRESTRIP = /<!DOCTYPE[^>]*>|<\?[^>]*\?>/gi;
const COMMENT = /<!--[\s\S]*?(?:-->|$)/g;
const DROP_BLOCKS = /<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi;
const TAG = /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTR = /([^\s=/"'>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g;
const VOID = new Set([
  "br",
  "img",
  "input",
  "meta",
  "link",
  "hr",
  "wbr",
  "source",
  "area",
  "base",
  "col",
  "embed",
  "param",
  "track",
]);
const BLOCK = new Set([
  "p",
  "div",
  "li",
  "ul",
  "ol",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "tr",
  "br",
  "section",
  "article",
  "header",
  "footer",
  "table",
  "thead",
  "tbody",
  "blockquote",
  "pre",
  "dd",
  "dt",
  "dl",
  "nav",
  "main",
  "aside",
  "figure",
  "form",
  "fieldset",
  "legend",
  "address",
  "hr",
  "td",
  "th",
  "option",
]);
const IMPLIED_END = new Set(["p", "li", "dd", "dt", "tr", "td", "th", "option"]); // sibling closes an open one
const CLOSES_P = new Set([...BLOCK].filter((b) => b !== "br")); // any block-level opener closes an open <p>
const HTML_HINT = /<\s*(html|body|div|p)\b/i;

const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;
const INSTRUCTION_PATTERNS: RegExp[] = [
  /\bignore (all|any|the|previous|prior|above|earlier)\b/i,
  /\b(disregard|forget)( all| any| the| your| my)? (previous|prior|above|earlier|preceding|initial|original|system) (instructions?|prompts?)\b/i,
  /\byou are (?:an?|the) (?:ai(?![\w-])|ai (?:assistant|agent|model|language model)|assistant|llm|language model)\b/i,
  /\bsystem prompt\b/i,
  /\b(do not|don['\u2019]?t|never) (tell|inform) the user\b(?!['\u2019]s)/i,
  /\b(do not|don['\u2019]?t|never) (mention|reveal|disclose) (this|these|that|it|any of this|the (above|following|previous))\b[^.\n]{0,30}\bto the user\b/i,
  /\b(run|execute) the following (command|commands|script|code|shell|instruction|instructions|steps)\b/i,
  /\bas an ai(?![\w-])(?![\s/&]+(?:[\w&/-]+\s+){0,3}?(?:engineer|developer|researcher|scientist|architect|specialist|lead|consultant|manager|analyst|intern|trainer|expert|strategist|designer|tester|owner|programmer)s?\b)/i,
  /^\s*(assistant|system|user)\s*:/i,
  /<\|/i,
  /\[INST\]/i,
  /###\s*(system|instruction)/i,
  /\b(curl|wget|ssh|scp)\b/i,
  /\.env\b/i,
  /settings\.json/i,
  /allowed-tools/i,
  /\btool_use\b|\bfunction_call\b/i,
];
// \w in Python's re with UNICODE matches letters/digits/underscore across
// scripts; JS \w is ASCII-only, so use a Unicode-aware class to match.
const WORD = /[\p{L}\p{N}_]+/gu;
const LATIN = /[A-Za-z]/;
const CONFUSABLE = /[\u0400-\u04ff\u0370-\u03ff]/; // Cyrillic + Greek, matching the Python ranges

function fold(text: string): string {
  let t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  t = t.replace(/[ \t\u00a0\f\v]+/g, " ");
  t = t.replace(/ *\n */g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

function isAlpha(ch: string): boolean {
  // Python str.isalpha(): Unicode letters. Empty string -> false.
  return ch.length > 0 && /^\p{L}$/u.test(ch);
}

function isPrintable(ch: string): boolean {
  // Python str.isprintable(): not "Other" or "Separator" except ASCII space.
  if (ch === " ") return true;
  return !/[\p{C}\p{Z}]/u.test(ch);
}

export interface InvisibleFindings {
  invisible_chars: Record<string, number>;
  invisible_flagged: number;
  invisible_text: string[];
}

export function cleanText(text: string): [string, InvisibleFindings] {
  const counts: Record<string, number> = {};
  let flagged = 0;
  for (const [key, chars] of [
    ["zero_width", ZERO_WIDTH],
    ["bidi", BIDI],
    ["format", FORMAT],
    ["bom", BOM],
  ] as const) {
    let n = 0;
    for (const c of chars) {
      let idx = text.indexOf(c);
      while (idx !== -1) {
        n++;
        idx = text.indexOf(c, idx + 1);
      }
    }
    if (n) counts[key] = n;
  }
  const flags = text.match(RGI_TAG_FLAG) ?? [];
  const unflagged = text.replace(RGI_TAG_FLAG, ""); // the text minus its legitimate flags
  let tags = 0;
  for (const ch of unflagged) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0xe0000 && cp <= 0xe007f) tags++;
  }
  if (tags) counts.tag = tags;
  const variation = (text.match(VARIATION) ?? []).length;
  if (variation) counts.variation = variation;

  // Flagged scan: iterate by code point, tracking the previous and next code
  // point, mirroring the Python char-by-char loop with isalpha() neighbours.
  const cps = [...text];
  for (let i = 0; i < cps.length; i++) {
    const ch = cps[i];
    if (BIDI_TAMPER.includes(ch)) {
      flagged++;
    } else if (ZERO_WIDTH.includes(ch) || ch === BOM) {
      const before = i > 0 ? cps[i - 1] : "";
      const after = i + 1 < cps.length ? cps[i + 1] : "";
      if (isAlpha(before) && isAlpha(after)) flagged++;
    }
  }

  const invisibleText: string[] = [];
  for (const run of unflagged.match(TAG_RUN) ?? []) {
    let decoded = "";
    for (const c of run) {
      const v = c.codePointAt(0)! - 0xe0000;
      if (v >= 0x20 && v < 0x7f) decoded += String.fromCodePoint(v);
    }
    decoded = decoded.trim();
    if (decoded) invisibleText.push(decoded.slice(0, LINE_MAX));
  }
  for (const run of text.match(VARIATION_RUN) ?? []) {
    const bytes: number[] = [];
    for (const c of run) {
      const cp = c.codePointAt(0)!;
      bytes.push(cp <= 0xfe0f ? cp - 0xfe00 : cp - 0xe0100 + 16);
    }
    const raw = new TextDecoder("utf-8").decode(Uint8Array.from(bytes));
    let decoded = "";
    for (const c of raw) if (isPrintable(c)) decoded += c;
    decoded = decoded.trim();
    if (decoded) invisibleText.push(decoded.slice(0, LINE_MAX));
  }

  // Remove variation selectors.
  let out = text.replace(VARIATION, "");
  if (flags.length) {
    // Strip invisible characters around the flags so the visible emoji survive.
    const pieces: string[] = [];
    let last = 0;
    const re = new RegExp(RGI_TAG_FLAG.source, "gu");
    let m: RegExpExecArray | null;
    while ((m = re.exec(out)) !== null) {
      pieces.push(stripInvisibleChars(out.slice(last, m.index)));
      pieces.push(m[0]);
      last = m.index + m[0].length;
    }
    pieces.push(stripInvisibleChars(out.slice(last)));
    out = pieces.join("");
  } else {
    out = stripInvisibleChars(out);
  }
  return [fold(out), { invisible_chars: counts, invisible_flagged: flagged, invisible_text: invisibleText }];
}

function stripInvisibleChars(s: string): string {
  let out = "";
  for (const ch of s) {
    if (!INVISIBLE_SET.has(ch)) out += ch;
  }
  return out;
}

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = new RegExp(ATTR.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m[0] === "") {
      re.lastIndex++;
      continue;
    }
    const value = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : (m[4] ?? "");
    out[m[1].toLowerCase()] = value;
  }
  return out;
}

const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
// A box collapsed to nothing with its overflow clipped hides its content as
// surely as display:none. Either half alone is everyday layout CSS.
const COLLAPSED_BOX = /\b(?:max-)?(?:height|width)\s*:\s*0(?:\.0+)?(?:px|em|rem|%|pt)?(?![\d.])/i;
const CLIPPED = /\boverflow(?:-[xy])?\s*:\s*hidden\b/i;

function styleOf(attrs: Record<string, string>): string {
  // The style attribute as a browser reads it: entities decoded, CSS comments gone.
  return htmlUnescape(attrs.style ?? "").replace(CSS_COMMENT, "");
}

function isHidden(rawAttrs: string): boolean {
  const attrs = parseAttrs(rawAttrs);
  if ("hidden" in attrs || (attrs["aria-hidden"] ?? "").trim().toLowerCase() === "true") return true;
  const style = styleOf(attrs);
  if (HIDDEN_STYLE.test(style)) return true;
  return COLLAPSED_BOX.test(style) && CLIPPED.test(style);
}

export interface HtmlFindings {
  hidden_blocks: string[];
  hidden_text: string;
}

export function cleanHtml(markup: string): [string, HtmlFindings] {
  const hiddenParts: string[] = [];
  const hiddenBlocks: string[] = [];

  const collect = (match: string): string => {
    let inner = match.replace(/<!--|-->/g, " ");
    inner = inner.replace(/<[^>]+>/g, " ");
    hiddenParts.push(htmlUnescape(inner));
    return " ";
  };

  let src = markup.replace(PRESTRIP, " ");
  src = src.replace(COMMENT, collect);
  src = src.replace(DROP_BLOCKS, collect);

  const visible: string[] = [];
  const hiddenBuf: string[] = [];
  const stack: string[] = []; // open element names, innermost last
  let navAt = new Set<number>();
  let hiddenAt: number | null = null; // stack index of the element that started the hidden run
  let pos = 0;

  const emit = (text: string): void => {
    (hiddenAt === null ? visible : hiddenBuf).push(text);
  };

  const flushHidden = (): void => {
    const block = fold(htmlUnescape(hiddenBuf.join("")));
    hiddenBuf.length = 0;
    hiddenAt = null;
    if (block) {
      hiddenBlocks.push(cleanText(block)[0].slice(0, EXCERPT));
      hiddenParts.push(block);
    }
  };

  const popTo = (index: number): void => {
    stack.length = index;
    navAt = new Set([...navAt].filter((i) => i < index));
    if (hiddenAt !== null && hiddenAt >= stack.length) flushHidden();
  };

  const lastIndex = (name: string): number | null => {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i] === name) return i;
    }
    return null;
  };

  const re = new RegExp(TAG.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    emit(src.slice(pos, m.index));
    pos = m.index + m[0].length;
    const closing = m[1];
    const name = m[2].toLowerCase();
    const rawAttrs = m[3];
    if (BLOCK.has(name)) emit("\n");
    if (closing) {
      const index = lastIndex(name);
      if (index !== null) popTo(index);
      continue; // a closer with no matching opener is ignored
    }
    const isNav =
      navAt.size > 0 ||
      name === "nav" ||
      (parseAttrs(rawAttrs).role ?? "").trim().toLowerCase() === "navigation";
    const hiddenHere = hiddenAt !== null || isHidden(rawAttrs);
    if (hiddenHere && !isNav) {
      for (const u of htmlUnescape(rawAttrs).match(URL_RE) ?? []) hiddenParts.push(u);
    }
    if (VOID.has(name)) continue;
    if (IMPLIED_END.has(name) && stack.length && stack[stack.length - 1] === name) {
      popTo(stack.length - 1); // sibling closes the open one
    } else if (CLOSES_P.has(name) && stack.length && stack[stack.length - 1] === "p") {
      popTo(stack.length - 1);
    }
    stack.push(name);
    const idx = stack.length - 1;
    if (isNav) navAt.add(idx);
    if (hiddenAt === null && isHidden(rawAttrs)) hiddenAt = idx;
  }
  emit(src.slice(pos));
  if (hiddenAt !== null) flushHidden();

  const text = htmlUnescape(visible.join(""));
  return [fold(text), { hidden_blocks: hiddenBlocks, hidden_text: hiddenParts.join("\n") }];
}

function excerpt(line: string, at: number): string {
  // Up to LINE_MAX code points of `line`, always including position `at`.
  // `at` is a code-point index (match start), so work in code points.
  const cps = [...line];
  if (cps.length <= LINE_MAX) return line;
  const lead = Math.floor(LINE_MAX / 3);
  let start = Math.max(0, at - lead);
  const end = Math.min(cps.length, start + LINE_MAX);
  start = Math.max(0, end - LINE_MAX);
  const head = start ? "\u2026" : "";
  const tail = end < cps.length ? "\u2026" : "";
  return `${head}${cps.slice(start, end).join("")}${tail}`;
}

function cpIndex(s: string, charIndex: number): number {
  // Convert a UTF-16 string index to a code-point index, matching Python's
  // code-point-based string positions.
  let cp = 0;
  for (let i = 0; i < charIndex && i < s.length; ) {
    const code = s.codePointAt(i)!;
    i += code > 0xffff ? 2 : 1;
    cp++;
  }
  return cp;
}

export interface ScanFindings {
  instruction_like: string[];
  hidden_urls: string[];
  visible_url_count: number;
  homoglyph_runs: string[];
}

export function scan(visible: string, hidden: string): ScanFindings {
  const seen = new Set<string>();
  const instructionLike: string[] = [];
  for (const line of [...visible.split("\n"), ...hidden.split("\n")]) {
    const stripped = line.trim();
    if (!stripped || seen.has(stripped)) continue;
    let match: RegExpExecArray | null = null;
    for (const p of INSTRUCTION_PATTERNS) {
      const mm = p.exec(stripped);
      if (mm) {
        match = mm;
        break;
      }
    }
    if (match) {
      seen.add(stripped);
      instructionLike.push(excerpt(stripped, cpIndex(stripped, match.index)));
    }
  }
  const hiddenUrls: string[] = [];
  for (const url of hidden.match(URL_RE) ?? []) {
    if (!hiddenUrls.includes(url)) hiddenUrls.push(url);
  }
  const homoglyphs: string[] = [];
  for (const word of `${visible}\n${hidden}`.match(WORD) ?? []) {
    if (LATIN.test(word) && CONFUSABLE.test(word) && !homoglyphs.includes(word)) {
      homoglyphs.push(word);
    }
  }
  return {
    instruction_like: instructionLike,
    hidden_urls: hiddenUrls,
    visible_url_count: (visible.match(URL_RE) ?? []).length,
    homoglyph_runs: homoglyphs,
  };
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export interface Findings extends InvisibleFindings, ScanFindings {
  hidden_blocks: string[];
  verdict?: string;
}

export function verdict(findings: Partial<Findings>): string {
  const alarms: string[] = [];
  let n = (findings.instruction_like ?? []).length;
  if (n) alarms.push(plural(n, "instruction-like line", "instruction-like lines"));
  n = Number(findings.invisible_flagged ?? 0);
  if (n) alarms.push(plural(n, "invisible character inside words", "invisible characters inside words"));
  n = Number(findings.invisible_chars?.tag ?? 0);
  if (n) {
    alarms.push(
      plural(
        n,
        "tag character (text hidden from the reader)",
        "tag characters (text hidden from the reader)",
      ),
    );
  }
  n = (findings.invisible_text ?? []).length;
  if (n)
    alarms.push(
      plural(n, "string spelled in invisible characters", "strings spelled in invisible characters"),
    );
  n = (findings.homoglyph_runs ?? []).length;
  if (n) alarms.push(plural(n, "mixed-script word", "mixed-script words"));

  const context: string[] = [];
  n = (findings.hidden_blocks ?? []).length;
  if (n) context.push(plural(n, "hidden block", "hidden blocks"));
  n = (findings.hidden_urls ?? []).length;
  if (n) context.push(plural(n, "hidden URL", "hidden URLs"));
  const removed = context.join(" and ");

  if (alarms.length) {
    const line = `posting_guard: \u26a0 ${alarms.join(", ")} - review before continuing`;
    return removed ? `${line} (${removed} removed)` : line;
  }
  if (removed) return `posting_guard: clean (${removed} removed, none instruction-like)`;
  return "posting_guard: clean";
}

export function guard(raw: string, mode: "html" | "text" | "auto"): [string, Findings] {
  let effectiveMode: "html" | "text";
  if (mode === "auto") effectiveMode = HTML_HINT.test(raw) ? "html" : "text";
  else effectiveMode = mode;

  let text: string;
  let hiddenText: string;
  let hiddenBlocks: string[];
  if (effectiveMode === "html") {
    const [t, hf] = cleanHtml(raw);
    text = t;
    hiddenText = hf.hidden_text;
    hiddenBlocks = hf.hidden_blocks;
  } else {
    text = raw;
    hiddenText = "";
    hiddenBlocks = [];
  }
  const [cleanedText, tf] = cleanText(text);
  const [cleanedHidden, hiddenTf] = cleanText(hiddenText);
  text = cleanedText;
  hiddenText = cleanedHidden;
  // Invisible characters inside hidden content count and alarm like visible ones.
  for (const [key, cnt] of Object.entries(hiddenTf.invisible_chars)) {
    tf.invisible_chars[key] = (tf.invisible_chars[key] ?? 0) + cnt;
  }
  tf.invisible_flagged += hiddenTf.invisible_flagged;
  tf.invisible_text = [...tf.invisible_text, ...hiddenTf.invisible_text];
  hiddenText = [hiddenText, ...tf.invisible_text].join("\n");
  const scanned = scan(text, hiddenText);
  const findings: Findings = {
    hidden_blocks: hiddenBlocks,
    invisible_chars: tf.invisible_chars,
    invisible_flagged: tf.invisible_flagged,
    invisible_text: tf.invisible_text,
    ...scanned,
  };
  findings.verdict = verdict(findings);
  return [text, findings];
}

function plainFindings(findings: Findings): string {
  const lines: string[] = [];
  for (const key of [
    "hidden_blocks",
    "instruction_like",
    "invisible_text",
    "hidden_urls",
    "homoglyph_runs",
  ] as const) {
    const items = findings[key] as string[];
    lines.push(`${key} (${items.length}):`);
    for (const item of items) lines.push(`  - "${item}"`);
  }
  const chars = Object.entries(findings.invisible_chars)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  lines.push(`invisible_chars: ${chars || "none"}`);
  lines.push(`invisible_flagged: ${findings.invisible_flagged}`);
  lines.push(`visible_url_count: ${findings.visible_url_count}`);
  return lines.join("\n");
}

function readAllStdin(): Uint8Array {
  // Synchronous read of stdin to a buffer, mirroring sys.stdin.buffer.read().
  try {
    return readFileSync(0);
  } catch {
    return new Uint8Array(0);
  }
}

function readInput(
  path: string | null,
  mode: "html" | "text" | "auto",
  stdinData: Uint8Array | null,
): string {
  let data: Uint8Array;
  if (path !== null) {
    data = readFileSync(path);
  } else {
    data = stdinData ?? readAllStdin();
  }
  if (mode === "html") return decodePage(data);
  // UTF-8 with replacement, keeping a leading BOM (TextDecoder strips it by
  // default; ignoreBOM matches Python's bytes.decode which keeps it).
  return new TextDecoder("utf-8", { ignoreBOM: true }).decode(data);
}

interface CliArgs {
  infile: string | null;
  mode: "html" | "text" | "auto";
  out: string | null;
  json: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const out: CliArgs = { infile: null, mode: "auto", out: null, json: false };
  let modeSet = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--in") out.infile = args[++i];
    else if (a === "--html") {
      if (modeSet) throw new Error("argument --html: not allowed with argument --text");
      out.mode = "html";
      modeSet = true;
    } else if (a === "--text") {
      if (modeSet) throw new Error("argument --text: not allowed with argument --html");
      out.mode = "text";
      modeSet = true;
    } else if (a === "--out") out.out = args[++i];
    else if (a === "--json") out.json = true;
    else throw new Error(`unrecognized argument: ${a}`);
  }
  return out;
}

export interface MainOptions {
  /** Injected stdin bytes for in-process testing; the real CLI reads fd 0. */
  stdin?: Uint8Array;
  /** Output sink; defaults to process.stdout.write. */
  out?: (s: string) => void;
  /** Error sink; defaults to process.stderr.write. */
  err?: (s: string) => void;
}

export function main(argvSlice: string[], opts: MainOptions = {}): number {
  const out = opts.out ?? ((s: string) => void stdout.write(s));
  const err = opts.err ?? ((s: string) => void stderr.write(s));
  let args: CliArgs;
  try {
    args = parseArgs(argvSlice);
  } catch (exc) {
    err(`posting_guard: ${exc instanceof Error ? exc.message : String(exc)}\n`);
    return 2;
  }

  let raw: string;
  try {
    raw = readInput(args.infile, args.mode, opts.stdin ?? null);
  } catch (exc) {
    const msg = exc instanceof Error ? exc.message : String(exc);
    err(`posting_guard: cannot read input: ${msg}\n`);
    return 2;
  }

  const [cleaned, findings] = guard(raw, args.mode);
  out(`${findings.verdict}\n`);
  out("--- findings ---\n");
  out(`${args.json ? JSON.stringify(findings, null, 2) : plainFindings(findings)}\n`);
  if (args.out !== null) {
    if (insideRepo(args.out)) {
      err(
        `posting_guard: refusing to write inside the repo (${args.out}); the cleaned ` +
          "posting is untrusted text and belongs in the session scratchpad\n",
      );
      return 2;
    }
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, `${cleaned}\n`, "utf-8");
    out(`saved=${args.out}\n`);
  } else {
    out("--- text ---\n");
    out(`${cleaned}\n`);
  }
  return 0;
}

export { EXCERPT, LINE_MAX, ROOT };

if (import.meta.filename === argv[1] || import.meta.url === `file://${argv[1]}`) {
  exit(main(argv.slice(2)));
}
