# 04 — Typst output contract

The fifth mechanism: the engine's output must be a **valid delta** that merges
into a **compilable resolved data file**. This file is what `make one` renders,
so getting the YAML right is not optional polish — a broken delta produces no
PDF.

## What the engine writes

A single file: `data/applications/<person>-<company>.yaml`. It is committed (the
application memory and the Layer-2 hook). It carries ONLY what changes for this
posting. It is NOT a full copy of the base profile.

## Delta format

The delta is a YAML mapping. The merge semantics are defined in full in
`engine/tools/merge_delta.py` (and documented at the top of that file). Summary:

- Any plain top-level key **replaces** the base value: `abstract:`, `title:`,
  `language:`, `cover_letter:`.
- `works_select:` — ordered list of work identifiers; rebuilds `works` to
  exactly these, in this order (reorder + filter). Identifier is
  `"structure | title"`, or a unique title / structure alone. A typo that
  matches nothing is a hard error (fail loud, do not silently drop a job).
- `works_override:` — map of identifier → partial work, shallow-merged onto the
  matched (and already-selected) work. Use it to flip `resume:` or swap a
  `description:` for this posting only.
- `skills_append:` / `skills_remove:` — additive edits (dedup / case-insensitive
  removal). To replace the whole skill list, set `skills:` directly.

See `data/applications/nic-example.yaml` for a worked, committed example.

## YAML correctness rules

1. **Valid, parseable YAML.** The merge helper uses `yaml.safe_load`; a syntax
   error aborts with a message. Validate by running the merge (below).
2. **Block scalars for multi-line prose.** Use the `|` block scalar for any
   multi-paragraph `description:` or long cover-letter paragraph, exactly as the
   base `data/nic.yaml` does. This keeps newlines and avoids the `#`-in-a-quoted
   string trap that a prior commit had to fix.
3. **`language:` per person policy.** Set it from the language gate (`01`) and
   `engine/config/persons.yaml`. It selects the i18n file the theme loads, and
   it drives the cover letter's default greeting/closing.
4. **Cover letter shape.** Under `cover_letter:` — `recipient` (required
   `company`, optional `name` / `role`), optional `location`, optional `date`
   (printed as-is, already localised), required `body` (list of paragraph
   strings), optional `greeting` / `closing` overrides. A missing `cover_letter`
   renders a CV-only PDF, unchanged.

## Build and verify

```bash
python3 engine/tools/merge_delta.py \
  --base data/<person>.yaml \
  --delta data/applications/<person>-<company>.yaml \
  --out data/<person>-<company>.resolved.yaml

make one PERSON=<person>-<company>.resolved THEME=<theme>
```

- The resolved file (`data/<person>-<company>.resolved.yaml`) is gitignored
  derived output. Never commit it; always regenerate it.
- `make one` finds it because every theme loads `yaml("/data/" + person +
  ".yaml")` and `person` is passed as `<person>-<company>.resolved`. No Makefile
  or theme change is needed.
- Confirm the PDF builds in `build/` and, when a `cover_letter` is present, that
  it has the extra page.

## Contract check before done

- [ ] Delta merges without error.
- [ ] Resolved file compiles with the chosen theme.
- [ ] Output language is correct (right i18n labels, right greeting/closing).
- [ ] No em-dashes, no fabricated facts (the reviewer in `03` already enforced
      this; this is the last gate before handing the PDF over).
