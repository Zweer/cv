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

## CI

`.github/workflows/generate-upload.yaml` builds all PDFs with Typst and attaches
them to a GitHub Release. It runs on `v*.*.*` tags and on manual dispatch.
