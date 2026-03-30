/// <reference types="electron-vite/node" />

// Vite `?raw` imports for *.sql files used by the main process.
// This lets us keep SQL in proper .sql files while Vite inlines them as
// strings at build time — no runtime file-system access required.
declare module '*.sql?raw' {
  const sql: string
  export default sql
}
