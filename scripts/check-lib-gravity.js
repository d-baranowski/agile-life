#!/usr/bin/env node

/**
 * check-lib-gravity.js
 *
 * Enforces the AGENTS.md colocation rule for shared directories:
 *   src/lib/, src/components/, src/hooks/
 *
 * Code in these directories claims to be shared. If a module is only
 * imported by one feature (or zero), it should live next to its consumer.
 *
 * For every non-test, non-type module in the shared directories, counts
 * how many distinct top-level src/ directories (features, store, main, etc.)
 * import it. Fails if any module has fewer than 2 importers.
 *
 * Exit code 0 = all OK, 1 = violations found.
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const SRC_DIR = path.resolve(__dirname, '..', 'src')

// Shared directories that require 2+ importing features
const SHARED_DIRS = ['lib', 'components', 'hooks']

// Collect all non-test, non-type source files across shared dirs
const sharedFiles = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue
      walk(path.join(dir, entry.name))
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      // Skip type-only files — shared contracts are allowed to have any number of importers
      if (entry.name.endsWith('.types.ts')) continue
      // Skip test files
      if (/\.(test|spec)\.tsx?$/.test(entry.name)) continue
      sharedFiles.push(path.join(dir, entry.name))
    }
  }
}

for (const dirName of SHARED_DIRS) {
  const dirPath = path.resolve(SRC_DIR, dirName)
  if (fs.existsSync(dirPath)) {
    walk(dirPath)
  }
}

// For each shared file, find how many distinct top-level src/ directories import it
const violations = []

for (const sharedFile of sharedFiles) {
  const relFromSrc = path.relative(SRC_DIR, sharedFile)
  // Build basename without extension for import matching
  const baseName = path.basename(sharedFile).replace(/\.tsx?$/, '')
  const dirName = path.relative(SRC_DIR, path.dirname(sharedFile))

  // Possible import patterns:
  //   from '../../lib/format-age'
  //   from '../../components/Toast'
  //   from '../../hooks/useApi'
  // We search for the path fragment that uniquely identifies this file
  const importFragment = dirName + '/' + baseName

  let grepOutput = ''
  try {
    grepOutput = execSync(
      `grep -r --include='*.ts' --include='*.tsx' -l "${importFragment}" "${SRC_DIR}"`,
      { encoding: 'utf-8' }
    )
  } catch {
    // grep returns exit code 1 when no matches found
    grepOutput = ''
  }

  const importingFiles = grepOutput
    .trim()
    .split('\n')
    .filter(Boolean)
    // Exclude the shared file itself
    .filter((f) => path.resolve(f) !== sharedFile)
    // Exclude test files
    .filter((f) => !/__tests__/.test(f) && !/\.(test|spec)\.tsx?$/.test(f))

  // Extract the distinct top-level src/ directory for each importer
  // e.g. "features/kanban/hooks/useDragDrop.ts" -> "features/kanban"
  //      "main/index.ts" -> "main"
  //      "store/store.ts" -> "store"
  //      "App.tsx" -> "." (root)
  const importerRoots = new Set()
  for (const f of importingFiles) {
    const rel = path.relative(SRC_DIR, path.resolve(f))
    const parts = rel.split(path.sep)
    if (parts[0] === 'features' && parts.length >= 2) {
      importerRoots.add(`features/${parts[1]}`)
    } else if (SHARED_DIRS.includes(parts[0])) {
      // Another shared file importing this one — still counts if it's a different module
      importerRoots.add(
        `${parts[0]}/${parts.slice(1, -1).join('/') || parts[1]?.replace(/\.tsx?$/, '')}`
      )
    } else {
      importerRoots.add(parts[0].replace(/\.tsx?$/, ''))
    }
  }

  if (importerRoots.size < 2) {
    const importers =
      importerRoots.size === 0
        ? 'no importers (dead code)'
        : `1 importer: ${[...importerRoots][0]}`
    violations.push({ file: relFromSrc, importers, count: importerRoots.size })
  }
}

if (violations.length > 0) {
  console.error(
    `\n  Shared-dir gravity check: ${violations.length} module(s) have fewer than 2 importing features.\n`
  )
  console.error(
    '  Per AGENTS.md, shared directories (lib/, components/, hooks/) are for code\n' +
      '  shared across 2+ features. Move single-use modules next to their consumer.\n'
  )
  for (const v of violations) {
    console.error(`  ✗ src/${v.file}  (${v.importers})`)
  }
  console.error('')
  process.exit(1)
} else {
  const dirs = SHARED_DIRS.filter((d) => fs.existsSync(path.resolve(SRC_DIR, d))).join(', ')
  console.log(
    `  ✔ Shared-dir gravity check: all ${sharedFiles.length} modules in ${dirs} have 2+ importing features`
  )
  process.exit(0)
}
