# CV tailoring engine

An on-demand engine that turns a **job posting** into a **tailored CV** (and
optional cover letter) which is maximally relevant AND reads as authentically
the candidate's own. The goal is **non-genericity, not concealment**: we are not
beating AI detectors or hiding tool use, we are producing an application a hiring
manager reads as written by this specific person about this specific job.

It inherits the *workflow* of the open-source
[`ai-job-search`](https://github.com/ai-job-search-dev/ai-job-search) framework
(MIT; see `LICENSE.ai-job-search`) — not its LaTeX, not Claude Code. This engine
runs inside **Kiro Crew**, driven by a worker that follows the prompt files in
`prompts/`. It is **not** a cron and does **not** run unattended.

## Status / roadmap

- **Layer 1 (this engine): done.** On-demand tailoring inside Kiro Crew, no
  Claude Code, no cron: posting in, tailored CV (+ optional cover letter) out.
- **First real run: not done yet.** Only the worked example
  (`data/applications/nic-example.yaml`) exists; no real application has been
  produced end to end.
- **Career goals: empty.** `config/persons.yaml` has empty `career_goals` /
  `energizers` / `drains` for both people. The first run starts with the
  first-setup interview (`prompts/00-flow.md`, step 0).
- **Layer 2: not built.** Scheduled posting search, application tracking and a
  dashboard, aimed at ro, who searches actively (`mode: active`). nic is
  passive (`mode: passive`): the engine acts only when handed a posting.
- **Languages:** nic's CV is English, ro's is Italian by default.
- **Principle:** non-genericity, not concealment (see the top of this file).

## Layout

```
engine/
  README.md                     this file
  LICENSE.ai-job-search         upstream MIT license for the ported parts
  package.json                  Node project: test / typecheck / lint scripts, js-yaml + he deps
  tsconfig.json                 TypeScript config (run directly on Node, no build step)
  biome.json                    Biome lint + format config (fleet standard)
  config/
    persons.yaml                per-person policy (mode, cv_language, default_theme, goals) — NOT render data
  prompts/
    00-flow.md                  orchestration: posting -> fit -> draft -> review -> write -> build
    01-fit-and-language-gate.md fit scoring + Eligibility gate + Language gate
    02-voice-and-style.md       voice anchoring + no-cliche / no-em-dash style rules
    03-anti-mirroring-checklist.md  the reviewer checklist (run in fresh context)
    04-typst-output-contract.md how to emit a valid delta + resolved data file
  tools/
    posting_guard.ts            strips hidden / prompt-injection text from a posting (ported)
    page_decode.ts              charset decoding helper for posting_guard (ported)
    merge_delta.ts              merges base + application delta -> resolved data file
  portals/
    linkedin-search/            manual, on-demand LinkedIn search CLI (ported; ToS caveat)
  tests/
    posting_guard.test.ts       ported test suite for the posting guard (node:test)
    merge_delta.test.ts         tests for the merge semantics (node:test)
```

## Runtime: Node + TypeScript, no build step

The engine is a mono-stack of **Node** (>= 22.18) and **TypeScript**. Node runs
the `.ts` files directly via native type stripping (enabled by default since
Node 22.18 and 23.6; on older 22.x it needs a flag, so the floor is 22.18). The
code uses only erasable TypeScript syntax (no enums or parameter properties),
which is what type stripping supports. CI runs the latest LTS. So there is no compile or
bundle step — `node engine/tools/merge_delta.ts ...` just works. The only
runtime dependencies are [`js-yaml`](https://www.npmjs.com/package/js-yaml)
(reads/writes the YAML the Typst themes parse) and
[`he`](https://www.npmjs.com/package/he) (HTML entity decoding in the posting
guard, matching Python's `html.unescape`). Typst is the only other runtime, for
the PDF build. Install once with `cd engine && npm ci`.

## How a Kiro Crew worker runs the flow

A worker (not Claude Code) reads `prompts/00-flow.md` and follows it step by
step. In short:

1. **Guard the posting** with `tools/posting_guard.ts` (save cleaned text to the
   session scratchpad, never inside the repo). Surface any ⚠ findings.
2. **Fit + language gate** (`prompts/01`): score the real fit, run the hard
   Eligibility and Language gates. Stop and report if a hard gate fails.
3. **Draft** under the voice/style constraints (`prompts/02`) and the
   anti-mirroring constraints (`prompts/03`): a tailored abstract, a
   `works_select`/`works_override`, skill edits, and an optional cover letter.
   Evidence-only — every claim traces to `data/<person>.yaml`.
4. **Review in fresh context** (`prompts/03`): dispatch a separate subagent given
   only the posting, the base YAML, and the draft, so it cannot rationalise the
   drafter. Fix every FAIL.
5. **Write the delta** (`prompts/04`): `data/applications/<person>-<company>.yaml`,
   small and DRY. This is committed — it is the application memory and the
   Layer-2 hook.
6. **Build**:

   ```bash
   node engine/tools/merge_delta.ts \
     --base data/<person>.yaml \
     --delta data/applications/<person>-<company>.yaml \
     --out data/<person>-<company>.resolved.yaml
   make one PERSON=<person>-<company>.resolved THEME=<theme>
   ```

   The resolved file is gitignored, derived output. The PDF lands in `build/`.

## The five mechanisms

1. **Voice anchoring** — extract the candidate's real register from their own
   `description`/`abstract` text and draft inside it (nic: 1st person, hard
   numbers, understatement, dry wit, no em-dashes; ro: formal-administrative
   Italian). `prompts/02`.
2. **Evidence-only** — every fact traces to the base YAML; a gap stays a gap; no
   keyword stuffing; a grounding audit in review. `prompts/03` items 5-7.
3. **Anti-mirroring** — no literal echo of the posting; an alignment ceiling; a
   bullet that could only exist for this posting is suspect; the candidate's own
   career stays the backbone. `prompts/03` items 1-4.
4. **Drafter -> reviewer** — the reviewer runs in fresh context so it cannot
   rationalise the drafter's choices. `prompts/00` step 4, `prompts/03`.
5. **Typst output** — a valid delta merges into a compilable resolved data file,
   with `language:` set per person policy and block scalars preserved.
   `prompts/04`, `tools/merge_delta.ts`.

## Data layout and merge

- Base "big" profiles stay in `data/<person>.yaml` (unchanged).
- Per-application **deltas** live in `data/applications/<person>-<company>.yaml`,
  committed. A delta carries only what changes (tailored abstract,
  reordered/filtered works, skill overrides, the `cover_letter` block). See the
  worked example `data/applications/nic-example.yaml`.
- The **resolved** file `data/<person>-<company>.resolved.yaml` is derived output
  (gitignored), produced by `merge_delta.ts` and compiled by `make one`. Themes
  are never touched by the merge; they only gained optional cover-letter
  rendering (`themes/common/cover-letter.typ`).

Merge semantics are documented in full at the top of `tools/merge_delta.ts` and
in `prompts/04`.

## Running the tests

The engine uses Node's built-in test runner (`node:test`) — no Vitest, no Bun.
Install once, then run from `engine/`:

```bash
cd engine
npm ci               # js-yaml + he (runtime), typescript + biome + types (dev)
npm test             # posting guard + merge semantics + LinkedIn portal CLI
npm run typecheck    # tsc --noEmit
npm run lint         # biome check (lint + format)
```

The LinkedIn portal CLI also has its own `npm test` / `npm run typecheck` under
`portals/linkedin-search/cli/`, but `engine`'s `npm test` runs the whole suite
(tools + portal) in one pass.

## Deferred to Layer 2

No automated applying, sending, or recruiter outreach; no unattended/cron
operation; no cross-application learning loop beyond the committed delta files,
which are the memory a future Layer 2 reads.
