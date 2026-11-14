# cv

A [Typst](https://typst.app/) CV generator. It renders PDF résumés from
structured YAML data through reusable themes — one source of truth per person,
many visual styles and languages.

## How it works

- **`data/<person>.yaml`** — a person's CV content (name, contacts, work,
  education, skills, …) and a `language` field selecting the locale.
- **`i18n/<lang>.yaml`** — section labels for each language (`en`, `it`), so
  themes never hardcode strings.
- **`themes/<theme>/main.typ`** — a Typst template that loads the person's data
  and the matching i18n file and lays it out. Available themes: `budapest`,
  `chiringuito`, `europass`, `formentera`, `new-hipster`, `typographic`.
- **`builds.yaml`** — the list of `person × theme` combinations to build.
- **`Makefile`** — drives Typst to produce one PDF per entry in `builds.yaml`,
  written to `build/`.

Each theme reads its inputs the same way, so a given person can be rendered in
any theme:

```typst
#let person = sys.inputs.at("person", default: "nic")
#let cv = yaml("/data/" + person + ".yaml")
#let i18n = yaml("/i18n/" + cv.language + ".yaml")
```

## Requirements

[Typst](https://github.com/typst/typst) `0.13.1`. Install it (prebuilt binary
into `~/.local/bin`) with:

```bash
make install
```

## Build

Build every `person × theme` listed in `builds.yaml` into `build/`:

```bash
make all
```

Other targets:

```bash
make list                        # show the configured person → theme builds
make one PERSON=nic THEME=formentera    # build a single combination
make watch PERSON=nic THEME=formentera  # rebuild on change
make clean                       # remove build/
```

## Add a build

Edit `builds.yaml` — `person` must match a file in `data/` (without `.yaml`) and
`theme` must match a folder in `themes/`:

```yaml
builds:
  - person: nic
    theme: formentera
```

## Tailoring engine

`engine/` is an on-demand engine that turns a job posting into a tailored CV
(and optional cover letter) for one person. It is a set of prompt files
(`engine/prompts/`, entry point `00-flow.md`) followed by an agent worker, plus
small Node + TypeScript tools (posting guard, base+delta merge). Start with
[`engine/README.md`](engine/README.md); it also has the status and roadmap.
Requires Node >= 22.18 (runs `.ts` directly, no build step); set up with
`cd engine && npm ci`.

How it touches the CV data:

- **`cover_letter` block (optional)** in a person's data: `recipient`
  (`company` required; `name`, `role` optional), `location`, `date` (printed
  as-is), `body` (list of paragraph strings), plus optional `greeting` /
  `closing` overrides. It is rendered as an extra page after the CV by
  `themes/common/cover-letter.typ`, which all six themes include. Without the
  block nothing changes.
- **`data/applications/<person>-<company>.yaml`** are per-application *deltas*
  (tailored abstract, selected/reordered works, skill edits, cover letter)
  applied on top of `data/<person>.yaml`. They are committed; see
  `data/applications/nic-example.yaml`.
- **`data/*.resolved.yaml`** is the merged result, derived and gitignored.
  Build it with:

  ```bash
  node engine/tools/merge_delta.ts --base data/nic.yaml \
    --delta data/applications/nic-example.yaml --out data/nic-example.resolved.yaml
  make one PERSON=nic-example.resolved THEME=formentera
  ```

The engine's per-person policy (language, default theme, which base profiles
exist and when to use each, career goals) is in `engine/config/persons.yaml`.
Besides `data/nic.yaml` (default, startup / consulting) and `data/ro.yaml`
(default, Italian), `data/nic-enterprise.yaml` is nic's corporate / Head of
Technology variant and `data/ro-eng.yaml` is the English edition of `ro.yaml`
(`ro.yaml` is the source of truth: update `ro-eng.yaml` whenever it changes).

## CI

- `.github/workflows/ci.yaml` runs on every pull request (and manual dispatch):
  Biome lint, `tsc` typecheck and `node:test` for the engine, plus `make all`
  to compile every CV with Typst.
- `.github/workflows/generate-upload.yaml` builds all PDFs with Typst and attaches
  them to a GitHub Release. It runs on `v*.*.*` tags and on manual dispatch.
- Dependabot (`.github/dependabot.yml`) opens weekly update PRs for GitHub
  Actions and for the npm dependencies of `engine/` and the LinkedIn portal CLI.
