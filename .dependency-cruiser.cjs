/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ── 1. No circular dependencies ────────────────────────────────────────
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make the code harder to reason about.',
      from: {},
      to: { circular: true }
    },

    // ── 2. lib/ must not import from features/ ─────────────────────────────
    {
      name: 'no-lib-to-features',
      severity: 'error',
      comment:
        'Shared lib/ utilities must not depend on feature modules. ' +
        'Move the shared type/code into lib/ or a shared/ directory instead.',
      from: { path: '^src/lib/' },
      to: { path: '^src/features/' }
    },

    // ── 3. No renderer code importing main-process modules ─────────────────
    {
      name: 'no-renderer-to-main',
      severity: 'error',
      comment: 'Renderer code must never import main-process modules directly.',
      from: {
        path: ['^src/renderer/', '^src/App\\.tsx$', '^src/store/', '^src/features/.+Slice\\.ts$']
      },
      to: { path: ['^src/database/', '^src/settings/', '^src/trello/client\\.ts$'] }
    },

    // ── 4. Features must not reach into other features internals ───────────
    //    Allowed cross-feature imports: api/, ipc/, analytics types,
    //    template types, settings types, board-switcher slice, toast, tickets page
    {
      name: 'no-cross-feature-internals',
      severity: 'warn',
      comment:
        'Features should not import internals of other features. ' +
        'Import only from the public API (slice, types, or explicitly shared modules).',
      from: { path: '^src/features/([^/]+)/' },
      to: {
        path: '^src/features/([^/]+)/',
        pathNot: [
          // Same feature (back-reference)
          '^src/features/$1/',
          // Shared infrastructure everyone may use
          '^src/features/api/',
          '^src/features/ipc/',
          // Type-only cross-feature imports
          '^src/features/analytics/analytics\\.types\\.ts$',
          '^src/features/templates/template\\.types\\.ts$',
          '^src/features/settings/settings\\.types\\.ts$',
          '^src/features/tickets/tickets\\.types\\.ts$',
          // Known valid cross-feature imports (slices + components)
          '^src/features/board-switcher/boardsSlice\\.ts$',
          '^src/features/toast/',
          '^src/features/tickets/TicketNumberingPage\\.tsx$',
          '^src/features/kanban/confetti/'
        ]
      }
    },

    // ── 5. No orphan modules (files not reachable from any entry) ──────────
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Modules that are not reachable from any entry point are dead code.',
      from: {
        orphan: true,
        pathNot: [
          // Test files are not entry points
          '\\.(test|spec)\\.ts$',
          '__tests__/',
          // Type declaration files
          '\\.d\\.ts$',
          // Styled files may be re-exported
          '\\.styled\\.ts$'
        ]
      },
      to: {}
    }
  ],

  options: {
    doNotFollow: {
      dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled']
    },

    tsPreCompilationDeps: true,

    tsConfig: { fileName: 'tsconfig.json' },

    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types']
    },

    reporterOptions: {
      text: { highlightFocused: true }
    }
  }
}
