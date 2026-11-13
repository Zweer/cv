#!/usr/bin/env python3
"""Merge a base profile with a per-application delta into a resolved CV data file.

This is the heart of the tailoring engine: the base profiles in `data/` are the
single source of truth for a person's career, and a per-application delta in
`data/applications/<person>-<company>.yaml` carries ONLY what changes for one
job posting. This tool reads base + delta, applies the delta on top, and writes
a fully-resolved, self-contained data file that `make one` can compile with any
theme, untouched.

    python3 engine/tools/merge_delta.py \
        --base data/nic.yaml \
        --delta data/applications/nic-acme.yaml \
        --out data/nic-acme.resolved.yaml

The resolved file is derived output, not source: it is written to `data/` with a
`.resolved.yaml` suffix that `.gitignore` excludes, so it never gets committed
and always regenerates from base + delta. `make one PERSON=nic-acme.resolved
THEME=formentera` then finds it exactly like any other `data/<person>.yaml`,
because every theme loads `yaml("/data/" + person + ".yaml")`.

----------------------------------------------------------------------------
DELTA MERGE SEMANTICS (explicit and documented)
----------------------------------------------------------------------------
The delta is a YAML mapping. Only these keys are interpreted specially; any
other top-level key REPLACES the base value wholesale (so `abstract:`,
`title:`, `cover_letter:` in the delta simply override the base).

  works_select:   Ordered list of work identifiers. When present, the resolved
                  `works` list is rebuilt to contain exactly these entries, in
                  this order (reorder + filter in one step). An identifier
                  matches a base work by its "structure | title" (case- and
                  whitespace-insensitive), or you may give just the title or
                  just the structure when that alone is unambiguous. A hidden
                  base work can be selected (selecting it un-hides it). An
                  identifier that matches nothing is a hard error (a typo must
                  not silently drop a job).

  works_override: Mapping of work identifier -> partial work. Each matched base
                  work is shallow-merged with the given fields (e.g. override a
                  `description` or `resume` flag for this posting only). Applied
                  AFTER works_select, so you can both pick and tweak.

  skills_append:  List of skills added after the base skills (deduplicated,
                  order preserved).
  skills_remove:  List of skills removed from the base skills (case-insensitive).
                  To replace the whole list instead, just set `skills:` directly.

  cover_letter:   Attached verbatim as the resolved file's cover_letter block
                  (it is an ordinary top-level override; listed here only
                  because it is the common case).

Everything else is a plain override: a top-level delta key wins over base.
Nested mappings are NOT deep-merged (except via the explicit keys above);
this keeps the model mental: a delta key you write replaces the base key you
named. The one language rule: the resolved `language:` comes from the delta
when set, else the base, so per-person language policy is honoured upstream.
"""

import argparse
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.stderr.write(
        "merge_delta: PyYAML is required (pip install pyyaml). "
        "It is the only dependency.\n"
    )
    sys.exit(2)


def _norm(s: str) -> str:
    return " ".join(str(s).split()).strip().lower()


def _work_key(work: dict) -> str:
    return _norm(f"{work.get('structure', '')} | {work.get('title', '')}")


def _match_work(works: list, identifier: str):
    """Return the index of the base work matching `identifier`, or None.

    Matches on the full "structure | title" key first, then falls back to a
    unique match on title alone or structure alone. Ambiguity (more than one
    match on the fallback) is treated as no match, so the caller errors out
    rather than picking arbitrarily.
    """
    ident = _norm(identifier)
    # Exact "structure | title" key.
    for i, w in enumerate(works):
        if _work_key(w) == ident:
            return i
    # Unique title match.
    title_hits = [i for i, w in enumerate(works) if _norm(w.get("title", "")) == ident]
    if len(title_hits) == 1:
        return title_hits[0]
    # Unique structure match.
    struct_hits = [i for i, w in enumerate(works) if _norm(w.get("structure", "")) == ident]
    if len(struct_hits) == 1:
        return struct_hits[0]
    return None


def merge(base: dict, delta: dict) -> dict:
    if not isinstance(base, dict):
        raise ValueError("base profile must be a YAML mapping")
    delta = delta or {}
    if not isinstance(delta, dict):
        raise ValueError("delta must be a YAML mapping")

    resolved = dict(base)  # shallow copy; we rebuild the keys we touch
    special = {"works_select", "works_override", "skills_append", "skills_remove"}

    # 1. works_select: reorder + filter.
    base_works = list(base.get("works", []))
    if "works_select" in delta:
        selected = []
        for ident in delta["works_select"]:
            idx = _match_work(base_works, ident)
            if idx is None:
                raise ValueError(
                    f"works_select: no base work matches {ident!r} "
                    f"(available: {[_work_key(w) for w in base_works]})"
                )
            w = dict(base_works[idx])
            w.pop("hidden", None)  # selecting a work un-hides it
            selected.append(w)
        resolved_works = selected
    else:
        resolved_works = [dict(w) for w in base_works]

    # 2. works_override: shallow-merge per matched work.
    for ident, patch in (delta.get("works_override") or {}).items():
        idx = _match_work(resolved_works, ident)
        if idx is None:
            raise ValueError(
                f"works_override: no selected work matches {ident!r}"
            )
        resolved_works[idx] = {**resolved_works[idx], **(patch or {})}
    if "works" in base or "works_select" in delta or "works_override" in delta:
        resolved["works"] = resolved_works

    # 3. skills_append / skills_remove (skills:' replaces wholesale via step 4).
    if "skills_append" in delta or "skills_remove" in delta:
        skills = list(base.get("skills", []))
        remove = {_norm(s) for s in (delta.get("skills_remove") or [])}
        skills = [s for s in skills if _norm(s) not in remove]
        seen = {_norm(s) for s in skills}
        for s in delta.get("skills_append") or []:
            if _norm(s) not in seen:
                skills.append(s)
                seen.add(_norm(s))
        resolved["skills"] = skills

    # 4. Plain overrides: every non-special top-level delta key wins.
    for key, value in delta.items():
        if key in special:
            continue
        resolved[key] = value

    return resolved


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="merge_delta.py", description="Merge a base profile with an application delta."
    )
    parser.add_argument("--base", required=True, type=Path, help="base profile YAML (data/<person>.yaml)")
    parser.add_argument("--delta", required=True, type=Path, help="application delta YAML")
    parser.add_argument("--out", required=True, type=Path, help="resolved output YAML")
    args = parser.parse_args(argv)

    try:
        base = yaml.safe_load(args.base.read_text(encoding="utf-8"))
        delta = yaml.safe_load(args.delta.read_text(encoding="utf-8"))
    except OSError as exc:
        sys.stderr.write(f"merge_delta: cannot read input: {exc}\n")
        return 2
    except yaml.YAMLError as exc:
        sys.stderr.write(f"merge_delta: invalid YAML: {exc}\n")
        return 2

    try:
        resolved = merge(base, delta)
    except ValueError as exc:
        sys.stderr.write(f"merge_delta: {exc}\n")
        return 2

    args.out.parent.mkdir(parents=True, exist_ok=True)
    # allow_unicode keeps accented names readable; default_flow_style=False keeps
    # block style; sort_keys=False preserves the base's key order as much as
    # possible so the resolved file is diffable against the base.
    args.out.write_text(
        yaml.safe_dump(resolved, allow_unicode=True, default_flow_style=False, sort_keys=False, width=1000),
        encoding="utf-8",
    )
    sys.stderr.write(f"merge_delta: wrote {args.out}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
