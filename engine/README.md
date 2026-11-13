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

## Layout

```
engine/
  README.md                     this file
  LICENSE.ai-job-search         upstream MIT license for the ported parts
  config/
    persons.yaml                per-person policy (mode, cv_language, goals) — NOT render data
  prompts/
    00-flow.md                  orchestration: posting -> fit -> draft -> review -> write -> build
    01-fit-and-language-gate.md fit scoring + Eligibility gate + Language gate
    02-voice-and-style.md       voice anchoring + no-cliche / no-em-dash style rules
    03-anti-mirroring-checklist.md  the reviewer checklist (run in fresh context)
    04-typst-output-contract.md how to emit a valid delta + resolved data file
  tools/
    posting_guard.py            strips hidden / prompt-injection text from a posting (ported)
    page_decode.py              charset decoding helper for posting_guard (ported)
    merge_delta.py              merges base + application delta -> resolved data file
  portals/
    linkedin-search/            manual, on-demand LinkedIn search CLI (ported; ToS caveat)
  tests/
    test_posting_guard.py       ported test suite for the posting guard
    test_merge_delta.py         tests for the merge semantics
```

## How a Kiro Crew worker runs the flow

A worker (not Claude Code) reads `prompts/00-flow.md` and follows it step by
step. In short:

1. **Guard the posting** with `tools/posting_guard.py` (save cleaned text to the
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
   python3 engine/tools/merge_delta.py \
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
   `prompts/04`, `tools/merge_delta.py`.

## Data layout and merge

- Base "big" profiles stay in `data/<person>.yaml` (unchanged).
- Per-application **deltas** live in `data/applications/<person>-<company>.yaml`,
  committed. A delta carries only what changes (tailored abstract,
  reordered/filtered works, skill overrides, the `cover_letter` block). See the
  worked example `data/applications/nic-example.yaml`.
- The **resolved** file `data/<person>-<company>.resolved.yaml` is derived output
  (gitignored), produced by `merge_delta.py` and compiled by `make one`. Themes
  are never touched by the merge; they only gained optional cover-letter
  rendering (`themes/common/cover-letter.typ`).

Merge semantics are documented in full at the top of `tools/merge_delta.py` and
in `prompts/04`.

## Running the tests

```bash
# Python tools (stdlib unittest, no third-party test runner needed)
cd engine && python3 -m unittest discover -s tests -p 'test_*.py'

# LinkedIn portal CLI (Bun)
cd engine/portals/linkedin-search/cli && bun install && bun test
```

`merge_delta.py` requires PyYAML (`pip install pyyaml`); it is the only runtime
dependency the engine adds.

## Deferred to Layer 2

No automated applying, sending, or recruiter outreach; no unattended/cron
operation; no cross-application learning loop beyond the committed delta files,
which are the memory a future Layer 2 reads.
