# Commit Message Format

**IMPORTANT**: The agent NEVER commits, pushes, or creates tags. The developer handles all git operations manually.

## Format

```
type(scope): :emoji_code: short description

Detailed explanation of what changed and why.
```

## Types

- `feat` — New feature (`:sparkles:`)
- `fix` — Bug fix (`:bug:`)
- `docs` — Documentation (`:memo:`)
- `chore` — Maintenance (`:wrench:`, `:arrow_up:`)
- `refactor` — Code refactoring (`:recycle:`)
- `ci` — CI/CD changes (`:construction_worker:`)
- `style` — Formatting (`:art:`)

## Scope

Use the theme name or component: `budapest`, `chiringuito`, `i18n`, `data`, `build`, `ci`.

## Gitmoji

**Always use text codes** (`:sparkles:`), **never actual emoji** (✨).

## Example

```
feat(budapest): :sparkles: add multi-page support

Extended the budapest theme to handle overflow content
across multiple pages with consistent header/footer.
```
