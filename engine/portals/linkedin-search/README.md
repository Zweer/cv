# linkedin-search portal

A country-agnostic CLI for searching LinkedIn's public `jobs-guest` job board
and fetching a single posting's detail. Ported from the open-source
`ai-job-search` framework (MIT; see `engine/LICENSE.ai-job-search`). The CLI
source and full flag reference live in `cli/` and `url-reference.md`.

## This portal is MANUAL and on-demand

The engine does not run this on a schedule and does not crawl. A person triggers
it when they want to look for postings in a specific location. For a person in
`active` mode (see `engine/config/persons.yaml`) the engine may *propose*
running a search, but it still runs only on the person's go-ahead, and it never
applies to or contacts anything — it only reads public listings.

## ⚠️ LinkedIn Terms of Service

Automated access to LinkedIn, including its public `jobs-guest` pages, is
**against LinkedIn's Terms of Service**. Consequences of ignoring this:

- **Keep volume low.** A few targeted searches, not bulk scraping. No
  commercial use, no dataset building.
- **The guest endpoint may block you.** LinkedIn rate-limits and may stop
  serving the guest pages entirely; the CLI retries 429/5xx with backoff, but a
  hard block is a hard block.
- **Run it on your own responsibility.** This is a convenience for a personal
  job search, nothing more.

## The flow must also work from a pasted posting

Because the portal can be blocked at any time (and because many postings never
appear on LinkedIn), the tailoring flow (`engine/prompts/00-flow.md`) is
designed to start from a **pasted posting** just as well as from a portal
result. The portal is an optional discovery convenience; it is never a
dependency of the engine. If the CLI returns nothing or errors, paste the
posting text and run the flow from there.

## Usage

```bash
cd engine/portals/linkedin-search/cli
bun install          # optional: only dev type defs; the CLI has zero runtime deps

# Search (location is always explicit; the CLI is country-agnostic)
bun run src/cli.ts search -q "head of delivery" -l "Milan, Lombardy, Italy" --jobage 7 --format table

# Full detail for one posting id from the search results
bun run src/cli.ts detail 4426311357 --format plain
```

Always run a fetched posting through `engine/tools/posting_guard.py` before
reading it for content (step 1 of the flow): portal output is third-party,
untrusted text.
