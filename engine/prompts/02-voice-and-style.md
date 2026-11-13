# 02 — Voice anchoring and style

Two of the five mechanisms live here: **voice anchoring** and the **style
rules**. Together they are the drafting constraint that keeps the output reading
as the candidate's own writing, not as generic AI prose.

## Voice anchoring

Before drafting a single sentence, extract the candidate's real register from
their own words. The richest source is the `description:` and `abstract:` fields
in `data/<person>.yaml` — these are written in the person's voice. Read them and
name the register explicitly, then draft inside it.

### nic (English)

Observed from his own abstract and work descriptions:

- **First person, direct.** "I personally hired the entire team", "I own every
  technical and organizational decision", "I handled underperformance directly".
- **Hard numbers, stated flatly.** "~€10M annual budget", "20+ direct reports",
  "99.99% uptime", "the 3rd member of the ICT department". Numbers carry the
  weight; no adjectives pile on top of them.
- **Understatement over hype.** "I never stopped building", "I'd rather make an
  unpopular right call than a comfortable wrong one". Confidence shown through
  specifics, not superlatives.
- **Dry wit, sparingly.** "whose retirement plan is a chiringuito in Mallorca."
  One such touch per document, not a running bit.
- **NO em-dashes.** This is a hard rule. Use a period, a comma, or a colon. The
  base data uses none; the output uses none.

### ro (Italian)

Observed from her own data:

- **Italian, formal-administrative register.** The vocabulary of public-sector
  administration: "interlocuzione con i servizi interni", "verbalizzazione degli
  incontri", "documentazione riservata e sensibile con garanzia di
  riservatezza".
- **Precise, procedural, impersonal-leaning.** Tasks described by their
  function and the systems used (PEC, NSO, protocollo aziendale), not by
  self-promotion.
- **Measured competence**, not salesmanship. Credentials stated plainly ("110 e
  lode").
- **NO em-dashes**, same hard rule, in Italian too.

## Style rules (both languages)

- **No em-dashes.** (Repeated because it is the easiest tell to slip.)
- **No clichés / filler.** Ban "results-driven", "passionate about", "proven
  track record", "dynamic", "synergy", "leverage" (as a verb for "use"),
  "spearheaded", "wear many hats", and their Italian equivalents ("dinamico/a",
  "orientato/a ai risultati", "con comprovata esperienza"). If a phrase could
  appear unchanged on a thousand other CVs, cut it.
- **No keyword stuffing.** Do not repeat the posting's skill nouns to raise a
  match count. A skill appears because the candidate has it, once.
- **Concrete over abstract.** Prefer the specific thing done (with its number)
  to the quality it supposedly demonstrates.
- **Keep the candidate's sentence rhythm.** Match the length and cadence of the
  base descriptions; do not smooth everything into uniform AI cadence.
- **One voice.** The tailored abstract and any new description text must sit
  seamlessly next to the untouched base text. If a reader could point to the new
  sentence as "the AI one", rewrite it.

The output of this step is a set of drafting constraints the drafter holds while
writing, and the first thing the reviewer (`03`) checks.
