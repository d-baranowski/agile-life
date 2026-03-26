// @ts-check
module.exports = {
  extends: [
    '@electron-toolkit/eslint-config-ts',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    '@electron-toolkit/eslint-config-prettier'
  ],
  settings: {
    react: { version: 'detect' }
  },
  rules: {
    // Allow underscore-prefixed unused variables (common for _event, _e)
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // TypeScript handles prop validation
    'react/prop-types': 'off',
    // Return types are enforced by tsconfig; not needed at ESLint level
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off'
  }
}
