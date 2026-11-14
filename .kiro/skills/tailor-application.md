# Tailor an application (CV + optional cover letter)

Entry point: **`engine/prompts/00-flow.md`**. Read it and follow it step by step
(step 0 first setup, then guard, fit/language gate, draft, fresh-context review,
delta, build, hand over). The numbered prompts `01`-`04` in `engine/prompts/` are
referenced from there. Do not copy their content here.

You need from the user: the job posting (URL or pasted text), the person
(`nic` or `ro`), and optionally a theme / language override.

Quick reference:

- Overview and status: `engine/README.md`
- Per-person policy, defaults and base profiles (`bases`): `engine/config/persons.yaml`; the engine picks and reports the base (step 2 of the flow)
- Worked delta example: `data/applications/nic-example.yaml`
- Setup: Node >= 22.18, `make install` (Typst), `cd engine && npm ci`
- Build: `node engine/tools/merge_delta.ts --base data/<base>.yaml --delta data/applications/<person>-<company>.yaml --out data/<person>-<company>.resolved.yaml`, then `make one PERSON=<person>-<company>.resolved THEME=<theme>`
- Never invent career goals or facts; ask the person.
