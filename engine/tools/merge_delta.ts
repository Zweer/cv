#!/usr/bin/env node
/**
 * Merge a base profile with a per-application delta into a resolved CV data file.
 *
 * This is the heart of the tailoring engine: the base profiles in `data/` are the
 * single source of truth for a person's career, and a per-application delta in
 * `data/applications/<person>-<company>.yaml` carries ONLY what changes for one
 * job posting. This tool reads base + delta, applies the delta on top, and writes
 * a fully-resolved, self-contained data file that `make one` can compile with any
 * theme, untouched.
 *
 *     node engine/tools/merge_delta.ts \
 *         --base data/nic.yaml \
 *         --delta data/applications/nic-acme.yaml \
 *         --out data/nic-acme.resolved.yaml
 *
 * The resolved file is derived output, not source: it is written to `data/` with a
 * `.resolved.yaml` suffix that `.gitignore` excludes, so it never gets committed
 * and always regenerates from base + delta. `make one PERSON=nic-acme.resolved
 * THEME=formentera` then finds it exactly like any other `data/<person>.yaml`,
 * because every theme loads `yaml("/data/" + person + ".yaml")`.
 *
 * ----------------------------------------------------------------------------
 * DELTA MERGE SEMANTICS (explicit and documented)
 * ----------------------------------------------------------------------------
 * The delta is a YAML mapping. Only these keys are interpreted specially; any
 * other top-level key REPLACES the base value wholesale (so `abstract:`,
 * `title:`, `cover_letter:` in the delta simply override the base).
 *
 *   works_select:   Ordered list of work identifiers. When present, the resolved
 *                   `works` list is rebuilt to contain exactly these entries, in
 *                   this order (reorder + filter in one step). An identifier
 *                   matches a base work by its "structure | title" (case- and
 *                   whitespace-insensitive), or you may give just the title or
 *                   just the structure when that alone is unambiguous. A hidden
 *                   base work can be selected (selecting it un-hides it). An
 *                   identifier that matches nothing is a hard error (a typo must
 *                   not silently drop a job).
 *
 *   works_override: Mapping of work identifier -> partial work. Each matched base
 *                   work is shallow-merged with the given fields (e.g. override a
 *                   `description` or `resume` flag for this posting only). Applied
 *                   AFTER works_select, so you can both pick and tweak.
 *
 *   skills_append:  List of skills added after the base skills (deduplicated,
 *                   order preserved).
 *   skills_remove:  List of skills removed from the base skills (case-insensitive).
 *                   To replace the whole list instead, just set `skills:` directly.
 *
 *   cover_letter:   Attached verbatim as the resolved file's cover_letter block
 *                   (it is an ordinary top-level override; listed here only
 *                   because it is the common case).
 *
 * Everything else is a plain override: a top-level delta key wins over base.
 * Nested mappings are NOT deep-merged (except via the explicit keys above);
 * this keeps the model mental: a delta key you write replaces the base key you
 * named. The one language rule: the resolved `language:` comes from the delta
 * when set, else the base, so per-person language policy is honoured upstream.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { argv, exit, stderr } from "node:process";
import yaml from "js-yaml";

type Mapping = Record<string, unknown>;

function norm(s: unknown): string {
  return String(s ?? "")
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .join(" ")
    .trim()
    .toLowerCase();
}

function workKey(work: Mapping): string {
  return norm(`${(work.structure as string) ?? ""} | ${(work.title as string) ?? ""}`);
}

/**
 * Return the index of the base work matching `identifier`, or null.
 *
 * Matches on the full "structure | title" key first, then falls back to a
 * unique match on title alone or structure alone. Ambiguity (more than one
 * match on the fallback) is treated as no match, so the caller errors out
 * rather than picking arbitrarily.
 */
function matchWork(works: Mapping[], identifier: string): number | null {
  const ident = norm(identifier);
  // Exact "structure | title" key.
  for (let i = 0; i < works.length; i++) {
    if (workKey(works[i]) === ident) return i;
  }
  // Unique title match.
  const titleHits: number[] = [];
  for (let i = 0; i < works.length; i++) {
    if (norm(works[i].title) === ident) titleHits.push(i);
  }
  if (titleHits.length === 1) return titleHits[0];
  // Unique structure match.
  const structHits: number[] = [];
  for (let i = 0; i < works.length; i++) {
    if (norm(works[i].structure) === ident) structHits.push(i);
  }
  if (structHits.length === 1) return structHits[0];
  return null;
}

function isMapping(value: unknown): value is Mapping {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function merge(base: unknown, delta: unknown): Mapping {
  if (!isMapping(base)) {
    throw new Error("base profile must be a YAML mapping");
  }
  const d: Mapping = delta == null ? {} : (delta as Mapping);
  if (!isMapping(d)) {
    throw new Error("delta must be a YAML mapping");
  }

  const resolved: Mapping = { ...base }; // shallow copy; we rebuild the keys we touch
  const special = new Set(["works_select", "works_override", "skills_append", "skills_remove"]);

  // 1. works_select: reorder + filter.
  const baseWorks = Array.isArray(base.works) ? (base.works as Mapping[]) : [];
  let resolvedWorks: Mapping[];
  if ("works_select" in d) {
    const selected: Mapping[] = [];
    for (const ident of d.works_select as string[]) {
      const idx = matchWork(baseWorks, ident);
      if (idx === null) {
        const available = JSON.stringify(baseWorks.map((w) => workKey(w)));
        throw new Error(
          `works_select: no base work matches ${JSON.stringify(ident)} (available: ${available})`,
        );
      }
      const w: Mapping = { ...baseWorks[idx] };
      delete w.hidden; // selecting a work un-hides it
      selected.push(w);
    }
    resolvedWorks = selected;
  } else {
    resolvedWorks = baseWorks.map((w) => ({ ...w }));
  }

  // 2. works_override: shallow-merge per matched work.
  const worksOverride = (d.works_override as Mapping | undefined) ?? {};
  for (const [ident, patch] of Object.entries(worksOverride)) {
    const idx = matchWork(resolvedWorks, ident);
    if (idx === null) {
      throw new Error(`works_override: no selected work matches ${JSON.stringify(ident)}`);
    }
    resolvedWorks[idx] = { ...resolvedWorks[idx], ...((patch as Mapping) ?? {}) };
  }
  if ("works" in base || "works_select" in d || "works_override" in d) {
    resolved.works = resolvedWorks;
  }

  // 3. skills_append / skills_remove (`skills:` replaces wholesale via step 4).
  if ("skills_append" in d || "skills_remove" in d) {
    let skills = Array.isArray(base.skills) ? [...(base.skills as unknown[])] : [];
    const remove = new Set(((d.skills_remove as unknown[]) ?? []).map((s) => norm(s)));
    skills = skills.filter((s) => !remove.has(norm(s)));
    const seen = new Set(skills.map((s) => norm(s)));
    for (const s of (d.skills_append as unknown[]) ?? []) {
      if (!seen.has(norm(s))) {
        skills.push(s);
        seen.add(norm(s));
      }
    }
    resolved.skills = skills;
  }

  // 4. Plain overrides: every non-special top-level delta key wins.
  for (const [key, value] of Object.entries(d)) {
    if (special.has(key)) continue;
    resolved[key] = value;
  }

  return resolved;
}

interface Args {
  base: string;
  delta: string;
  out: string;
}

function parseArgs(args: string[]): Args {
  const out: Partial<Args> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--base") out.base = args[++i];
    else if (a === "--delta") out.delta = args[++i];
    else if (a === "--out") out.out = args[++i];
    else {
      throw new Error(`unknown argument: ${a}`);
    }
  }
  for (const key of ["base", "delta", "out"] as const) {
    if (out[key] === undefined) {
      throw new Error(`the --${key} argument is required`);
    }
  }
  return out as Args;
}

export function main(argvSlice: string[]): number {
  let args: Args;
  try {
    args = parseArgs(argvSlice);
  } catch (exc) {
    stderr.write(`merge_delta: ${exc instanceof Error ? exc.message : String(exc)}\n`);
    return 2;
  }

  let base: unknown;
  let delta: unknown;
  try {
    base = yaml.load(readFileSync(args.base, "utf-8"));
    delta = yaml.load(readFileSync(args.delta, "utf-8"));
  } catch (exc) {
    const msg = exc instanceof Error ? exc.message : String(exc);
    if (exc instanceof yaml.YAMLException) {
      stderr.write(`merge_delta: invalid YAML: ${msg}\n`);
    } else {
      stderr.write(`merge_delta: cannot read input: ${msg}\n`);
    }
    return 2;
  }

  let resolved: Mapping;
  try {
    resolved = merge(base, delta);
  } catch (exc) {
    stderr.write(`merge_delta: ${exc instanceof Error ? exc.message : String(exc)}\n`);
    return 2;
  }

  mkdirSync(dirname(args.out), { recursive: true });
  // The emitter mirrors the Python tool's PyYAML safe_dump options:
  //   - block style (flowLevel: -1 keeps every level in block form),
  //   - preserve the base's key order (sortKeys: false),
  //   - keep accented names readable (js-yaml writes UTF-8 by default, so
  //     noCompat/`lineWidth` are what stays to control wrapping),
  //   - a very wide line width so long scalars are not folded (matches
  //     PyYAML width=1000), keeping the resolved file diffable and the block
  //     scalars intact for the Typst themes that parse it.
  const dumped = yaml.dump(resolved, {
    flowLevel: -1,
    sortKeys: false,
    lineWidth: 1000,
    noRefs: true,
  });
  writeFileSync(args.out, dumped, "utf-8");
  stderr.write(`merge_delta: wrote ${args.out}\n`);
  return 0;
}

// Run as a CLI only when invoked directly, not when imported by the tests.
if (import.meta.filename === argv[1] || import.meta.url === `file://${argv[1]}`) {
  exit(main(argv.slice(2)));
}
