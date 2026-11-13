# linkedin-cli

CLI for searching jobs on LinkedIn's public job listings, for **any country/region**
(and remote), across any sector.

**Data source**: LinkedIn `jobs-guest` endpoints (`seeMoreJobPostings/search` and `jobPosting/<id>`).
**Authentication**: None required.
**Runtime**: Node (>= 22.6) with native TypeScript type stripping — no build step.
**Dependencies**: None at runtime (plain `node` + global `fetch`). `npm install` is optional and only pulls dev type defs.

> **Personal use only.** This uses LinkedIn's public job pages; automated access is against
> LinkedIn's Terms of Service. Keep volume low, don't use it commercially or for bulk data
> collection, and run it on your own responsibility.

## Installation

```bash
cd engine/portals/linkedin-search/cli
npm install   # optional — only installs TypeScript dev types
```

The CLI runs without any install because it has zero runtime dependencies.

## Commands

| Command | Description |
|---------|-------------|
| `search` | Search for job listings (`--location` required) |
| `detail` | Fetch full detail for a single job listing |

`search` accepts `--format json|table|plain` (default `json`); `detail` accepts `--format json|plain`.
All errors are written to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## Quick examples

```bash
# Software roles in Hyderabad, last 7 days
node src/cli.ts search -q "backend engineer" -l "Hyderabad, Telangana, India" --jobage 7 --format table

# Design roles in London
node src/cli.ts search -q "product designer" -l "London, United Kingdom" --format table

# Fully remote
node src/cli.ts search -q "technical writer" -l "Remote" --remote remote --format table

# Full detail for one job
node src/cli.ts detail 4426311357 --format plain
```

See `../README.md` for the manual/on-demand note and the Terms-of-Service caveat, and `../url-reference.md` for the endpoint details.

## Search flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--location` | `-l` | **Required.** Place string, e.g. `"Mumbai, Maharashtra, India"`, `"Berlin, Germany"`, `"Remote"`. |
| `--query` | `-q` | Keywords (title / skill / role). Recommended. |
| `--jobage` | | Posted within N days: `1`, `7`, `14`, `30`. |
| `--remote` | | `remote` \| `hybrid` \| `onsite`. |
| `--page` | | 1-indexed page (10 results/page). |
| `--limit` | `-n` | Cap results emitted. |
| `--format` | | `json` \| `table` \| `plain`. |
