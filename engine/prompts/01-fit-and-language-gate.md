# 01 — Fit scoring, Eligibility gate, Language gate

Run this before any drafting. Its job is to decide whether this posting is worth
tailoring for at all, and to catch the two hard blockers (eligibility, language)
that no amount of good writing can paper over.

## Fit score

Score the candidate's **actual** fit, using only `data/<person>.yaml` and
`engine/config/persons.yaml` (career_goals / energizers / drains). Do not inflate
to make a weak match look strong — a low score is a useful answer.

Rate each, then give an overall read (strong / plausible / weak):

1. **Core requirements met by real evidence.** For each must-have in the
   posting, point to the base YAML line that satisfies it. Count how many are
   met, partially met, or missing. A requirement with no evidence is missing —
   not "transferable" by assertion.
2. **Seniority / scope alignment.** Does the role's level match the candidate's
   trajectory (not just title keywords)?
3. **Direction fit.** Does it move the person toward `career_goals`, into
   `energizers`, away from `drains`? (If those are empty — not yet set up — say
   so and skip this axis rather than guessing.)

Output: the per-requirement evidence map, the count of met/partial/missing, and
one honest sentence on whether to proceed.

## Eligibility gate (hard)

Some requirements are pass/fail and cannot be tailored around:

- **Work authorization / location / on-site mandate** the candidate cannot meet.
- **A hard credential** (licence, clearance, specific degree) the candidate
  lacks and the posting states as required, not preferred.

If a hard eligibility requirement fails, **STOP**. Report it plainly: this
posting is not a fit for a reason writing cannot fix. Do not draft a CV that
implies otherwise.

## Language gate (hard, parameterised from the data)

The CV and cover letter must be in a language the posting accepts AND that the
candidate can credibly operate in. Read the candidate's real languages from
`data/<person>.yaml` `languages:` (name + level), e.g.:

- nic: Italian (mother tongue), English (C1).
- ro: Italian (mother tongue), English (B2), French (B1).

Rules:

1. Determine the posting's required working language(s).
2. Cross-check against the candidate's `languages:` levels. A posting requiring
   fluent/native use of a language the candidate holds only at a low level
   (e.g. B1) is a **hard fail** — report it; do not produce a CV in that
   language that overstates the level.
3. Choose the output language: the person's `cv_language` default from
   `engine/config/persons.yaml`, unless the posting requires another language
   the candidate genuinely has at a sufficient level, or the person explicitly
   asked for a specific language. nic defaults to English always; ro defaults to
   Italian unless explicitly asked otherwise.
4. The chosen language sets the resolved file's `language:` key (which selects
   the i18n file) and the cover letter's greeting/closing wording.

If the language gate fails, STOP and report — same as eligibility.
