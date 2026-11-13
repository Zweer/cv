# 03 — Anti-mirroring reviewer checklist

This file is both a **drafting constraint** (the drafter keeps it in mind) and
the **reviewer's checklist** (two of the five mechanisms: anti-mirroring, and
drafter→reviewer separation).

## Run it in fresh context

The reviewer must NOT have seen the drafting conversation. If it did, it would
rationalise the drafter's choices instead of testing them. In Kiro Crew,
dispatch the review as a separate subagent (or reset the context) and give it
only three things:

1. the cleaned job posting,
2. the base profile `data/<person>.yaml`,
3. the draft (tailored abstract, works_select/override, skill edits, cover
   letter).

The reviewer does not know how any choice was argued for. It judges the artifact.

## The checklist

For each item: PASS, or FAIL with the specific offending text and a fix.

### Anti-mirroring

1. **No literal echo.** Does any sentence repeat a distinctive phrase from the
   posting verbatim or near-verbatim? A tailored CV that quotes the job ad back
   reads as mirroring. FAIL any lifted phrase; rewrite in the candidate's words.
2. **Alignment ceiling.** Does the CV claim to match *every* requirement? Real
   candidates have gaps. If the draft aligns on everything, it is suspicious —
   leave the honest gaps visible rather than manufacturing coverage.
3. **The "only for this posting" test.** Is there a bullet or claim that could
   ONLY exist because of this specific posting (i.e. it is reverse-engineered
   from the ad, not drawn from the candidate's real history)? FAIL it. Every
   claim must be something the candidate would say regardless of which job they
   were applying to.
4. **Backbone intact.** Is the candidate's own career still the spine of the
   document, with emphasis tuned, rather than a résumé reshaped to the ad's
   outline? FAIL a reorder that distorts the real trajectory.

### Evidence grounding (grounding audit)

5. **Every fact traces to the base YAML.** Pick each number, title, date,
   employer, and claim in the draft and point to its source line in
   `data/<person>.yaml`. Anything with no source is fabricated — FAIL and remove.
6. **No inflated levels.** Language levels, seniority, scope, and credentials
   match the base data exactly (see also the language gate in `01`).
7. **Gaps stay gaps.** A requirement the candidate does not meet is not
   smoothed over with vague language. It is simply absent or honestly stated.

### Voice and style (from `02`)

8. **No em-dashes** anywhere.
9. **No clichés / filler / keyword stuffing** (see the banned list in `02`).
10. **One voice.** New text is indistinguishable in register from the untouched
    base text. Point to any sentence that reads as AI-generated.

### Cover letter (if present)

11. **Opens on the candidate, not the company's mission statement.** It leads
    with what the candidate brings, grounded in evidence.
12. **Same voice, same rules** (1st person for nic, formal-administrative
    Italian for ro, no em-dashes, no clichés).

## Output

A table of the 12 items with PASS/FAIL and, for each FAIL, the exact text and
the fix. The drafter applies the fixes; re-review only the items that failed. Do
not pass the draft to `04` until every item is PASS.
