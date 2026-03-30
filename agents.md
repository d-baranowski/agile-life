# Agent Rules

Rules that all agents must follow when contributing to this repository.

## Code Quality

- All code must pass ESLint with zero warnings: `pnpm lint`
- All code must pass Prettier formatting: `pnpm format:check`
- Fix lint errors with `pnpm lint:fix` and formatting with `pnpm format` before committing
- Do not disable ESLint rules unless absolutely necessary; prefer fixing the underlying issue
- Keep functions small and single-purpose; extract helpers rather than growing complex bodies
- Avoid deeply nested conditionals; use early returns to keep the happy path at the top level
- Prefer explicit types over `any`; only use `any` when interoperating with untyped third-party code

## File Size Limits

- **No `.tsx` file may exceed 600 lines** (blank lines and comments excluded). This is enforced by the ESLint `max-lines` rule.
- When a component grows beyond this limit, refactor by:
  1. Extracting reusable **utility functions** into `src/renderer/src/lib/`
  2. Extracting **custom hooks** into a `hooks/` directory next to the page
  3. Extracting **sub-components** into a feature directory next to the page (e.g. `pages/kanban/DraggableCard.tsx`)

## File Structure

Organise files by the feature they support. Keep code close to where it is used.

```
src/renderer/src/
├── lib/                  # Shared utilities used across many features
│   ├── label-colors.ts   # Trello label colour mapping
│   ├── fuzzy-match.ts    # Fuzzy string matching
│   ├── format-utils.ts   # Date/number formatting helpers
│   ├── card-utils.ts     # Card reorder/move/story-point helpers
│   ├── confetti.ts       # Done-card celebration effects
│   ├── gamification.ts   # Level & XP threshold helpers
│   └── placeholders.ts   # Template placeholder expansion
├── components/           # Shared UI components (Toast, StrictModeDroppable, …)
├── hooks/                # Shared hooks (useApi, …)
├── pages/
│   ├── KanbanPage.tsx    # Page-level orchestrator (≤ 600 lines)
│   ├── kanban/           # Feature directory — components & hooks for KanbanPage
│   │   ├── DraggableCard.tsx
│   │   ├── CardContextMenu.tsx
│   │   ├── BulkActionBar.tsx
│   │   ├── hooks/
│   │   │   ├── useAddCardQueue.ts
│   │   │   ├── useBulkActions.ts
│   │   │   └── useDragDrop.ts
│   │   └── kanban.types.ts
│   ├── SettingsPage.tsx
│   ├── settings/         # Feature directory — extracted SettingsPage sections
│   │   ├── ArchiveDoneCards.tsx
│   │   └── StoryPointsEditor.tsx
│   ├── Dashboard.tsx
│   └── AnalyticsPage.tsx
```

**Rules:**
- If a function, hook, or component is used by **one page only**, keep it in that page's feature directory (e.g. `pages/kanban/hooks/useDragDrop.ts`).
- If it is used by **two or more pages**, move it to `src/renderer/src/lib/` (for utilities) or `src/renderer/src/components/` (for UI components).
- Never duplicate utilities across files — import from the shared `lib/` directory instead.

## Formatting Conventions

The project enforces the following Prettier settings (`.prettierrc`):

- No semicolons (`"semi": false`)
- Single quotes (`"singleQuote": true`)
- 2-space indentation (`"tabWidth": 2`)
- Max line length 100 characters (`"printWidth": 100`)
- No trailing commas (`"trailingComma": "none"`)

Always run `pnpm format` after editing files to stay consistent with these settings.

## Testing and Coverage

- Unit tests live in `src/**/__tests__/**/*.test.ts` and run with `pnpm test`
- Coverage is measured with `pnpm test:coverage`; renderer code is excluded from coverage collection
- **Target: 50 % statement coverage** across `src/main` and `src/shared`
- Every new module or utility must have a corresponding `__tests__/*.test.ts` file
- Write tests that cover both the happy path and meaningful error/edge cases
- Do not delete or weaken existing tests to make coverage numbers look better

## Commit and PR Standards

- Run `pnpm lint`, `pnpm format:check`, and `pnpm test` locally before opening a PR
- Keep commits focused; one logical change per commit
- The following CI jobs **must** be green before merging:
  - **CI / ESLint** — `pnpm lint`
  - **CI / Prettier** — `pnpm format:check`
  - **CI / Unit Tests** — `pnpm test:coverage`
  - **CI / pnpm audit** — `pnpm audit --audit-level high`

## Git Workflow

- Always rebase onto `main` before opening a PR to keep a linear, readable history — never merge `main` into a feature branch
- Confirm there are no conflicts with `main` before opening a PR:
  ```bash
  git fetch origin main
  git rebase origin/main
  ```
- Resolve any conflicts that arise during rebase before pushing
- Prefer `git rebase -i` to squash fixup commits into logical units before marking a PR ready for review
