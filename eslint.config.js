import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'
import security from 'eslint-plugin-security'
import sonarjs from 'eslint-plugin-sonarjs'
import noSecrets from 'eslint-plugin-no-secrets'

export default [
  {
    ignores: ['dist', 'artifacts', 'cache', 'node_modules', '**/.*'],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  js.configs.recommended,
  security.configs.recommended,
  sonarjs.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'no-secrets': noSecrets,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/prop-types': 'off',
      'no-secrets/no-secrets': 'off',
      'security/detect-object-injection': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/no-unused-vars': 'off',
      'sonarjs/no-dead-store': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-nested-functions': 'off',
      'sonarjs/no-ignored-exceptions': 'off',
      'sonarjs/no-useless-catch': 'off',
      'sonarjs/unused-import': 'off',
      'sonarjs/pseudo-random': 'off',
      'react/no-unescaped-entities': 'off',
      'no-useless-assignment': 'off',
      'no-unused-vars': 'off',
      'no-console': 'off',
      ...prettier.rules,
    },
  },
  {
    files: [
      'test/**/*.{js,cjs}',
      'scripts/**/*.{js,cjs}',
      'contracts/**/*.{js,cjs}',
    ],
    languageOptions: {
      globals: {
        ...globals.mocha,
        ...globals.node,
        ethers: 'readonly',
        expect: 'readonly',
        artifacts: 'readonly',
        contract: 'readonly',
        context: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
  },
]
