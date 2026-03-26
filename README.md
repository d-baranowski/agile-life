# Agile Life

A local Electron desktop app that connects to your Trello boards, syncs card data into a local SQLite database, and displays live per-column card counts — with JIRA-style ticket numbering planned for a future milestone.

## Prerequisites

| Tool | Version |
|---|---|
| [asdf](https://asdf-vm.com) | v0.14 or later |
| Node.js | 24.14.0 (managed via asdf) |
| pnpm | 10.11.0 (managed via asdf) |

You will also need a **Trello API key and token** to connect the app to your boards.  
Generate them at <https://trello.com/power-ups/admin> (create a Power-Up, then expose its API key and generate a token with read/write scope).

## Getting started

### 1. Install asdf and required plugins

Run the provided setup script to install asdf and the nodejs/pnpm plugins:

```bash
bash scripts/setup-asdf.sh
```

Then activate asdf in your shell (add to `~/.bashrc` or `~/.zshrc`):

```bash
source "$HOME/.asdf/asdf.sh"
```

### 2. Install the correct tool versions

asdf reads the exact versions from `.tool-versions` and installs them:

```bash
asdf install
```

### 3. Install dependencies and start the app

```bash
pnpm install
pnpm run dev
```

The Electron window opens automatically. On first launch the app asks you to register a Trello board using your API key and token.

## Available scripts

| Script | Description |
|---|---|
| `pnpm run dev` | Start in development mode with hot-reload |
| `pnpm run build` | Compile TypeScript and bundle with Vite into `out/` |
| `pnpm start` | Preview the last production build (requires `pnpm run build` first) |
| `pnpm run typecheck` | Run TypeScript type-checking without emitting files |
| `pnpm run lint` | Lint all `.ts` / `.tsx` source files (zero warnings allowed) |
| `pnpm run lint:fix` | Lint and auto-fix fixable issues |
| `pnpm run format` | Format all files with Prettier |
| `pnpm run format:check` | Check formatting without writing changes |
| `pnpm test` | Run the Jest test suite |

## Project structure

```
.tool-versions          # Pinned nodejs and pnpm versions for asdf
scripts/
  setup-asdf.sh         # One-time asdf + plugin installation script
src/
  main/           # Electron main process
    database/     # SQLite setup, schema, and query helpers
      sql/        # All SQL in .sql files, imported via Vite ?raw
    ipc/          # IPC handlers (board CRUD, Trello sync, analytics)
    trello/       # Trello REST API client (axios)
  preload/        # Context bridge — exposes safe IPC wrappers to the renderer
  renderer/       # React frontend (Vite + TypeScript)
    src/
      pages/      # Dashboard, Settings, Analytics, Ticket Numbering
      components/ # Board registration & switcher
      hooks/      # useApi — typed wrappers around window.api IPC calls
  shared/         # Types shared between main and renderer
docs/
  analytics/      # REQUIREMENTS.md — planned analytics features
  tickets/        # REQUIREMENTS.md — planned ticket numbering feature
```

## Architecture highlights

- **SQLite deduplication** — Every Trello card and list is stored with Trello's own globally-unique ID as the primary key. Upserts (`ON CONFLICT … DO UPDATE`) make repeated syncs fully idempotent, and card moves between columns are captured automatically because `list_id` is updated on every sync.
- **SQL in `.sql` files** — All queries live under `src/main/database/sql/` and are loaded via Vite's `?raw` import. No SQL strings are embedded in TypeScript.
- **IPC surface** — The renderer communicates with the main process exclusively through typed IPC channels defined in `src/shared/ipc.types.ts`.

## Building a distributable

```bash
# 1. Compile the app
pnpm run build

# 2. Package for your current platform
pnpm exec electron-builder
```

Output installers are written to the `dist/` folder.  
Supported targets: `.dmg` (macOS), `.exe` NSIS installer (Windows), `.AppImage` / `.deb` / `.snap` (Linux).

