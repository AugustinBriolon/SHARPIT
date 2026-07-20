import { fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

const eslintConfig = [
  {
    ignores: [
      '**/node_modules',
      '**/.next',
      '**/.vercel',
      './next-env.d.ts',
      // Service worker bundle généré par Serwist (src/sw.ts → public/sw.js)
      'public/sw.js',
      // Config and tooling files (not app code; avoids React plugin + ESLint 10 API issues)
      '.prettierrc.js',
      'eslint.config.mjs',
      'next.config.*',
      'postcss.config.*',
      'tailwind.config.*',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // React
        React: 'readonly',
        JSX: 'readonly',

        // Node.js
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        NodeJS: 'readonly',

        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        performance: 'readonly',

        // DOM types
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLSpanElement: 'readonly',
        HTMLUListElement: 'readonly',
        HTMLVideoElement: 'readonly',
        HTMLAnchorElement: 'readonly',
        SVGSVGElement: 'readonly',
        Node: 'readonly',
        NodeListOf: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        DOMRect: 'readonly',

        // Browser APIs
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        requestIdleCallback: 'readonly',
        cancelIdleCallback: 'readonly',
        DeviceOrientationEvent: 'readonly',

        // Events
        MouseEvent: 'readonly',
        TouchEvent: 'readonly',
        MediaQueryListEvent: 'readonly',

        // Other
        MutationObserver: 'readonly',
        PerformanceNavigationTiming: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      react: fixupPluginRules(reactPlugin),
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...typescriptPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...prettierConfig.rules,

      // En projet TypeScript, `no-undef` (issu de js.configs.recommended) fait
      // doublon avec le compilateur et lève des faux positifs sur les globals
      // standard (URL, fetch, Response, crypto…). On le désactive comme le
      // recommande typescript-eslint ; TS reste la source de vérité.
      'no-undef': 'off',

      'prettier/prettier': 'warn',

      '@typescript-eslint/no-explicit-any': 'warn',

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/ban-tslint-comment': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'no-nested-ternary': 'warn',

      'no-console': [
        'warn',
        {
          allow: ['warn', 'error', 'assert', 'info', 'table'],
        },
      ],

      'react/jsx-curly-brace-presence': [
        'warn',
        {
          props: 'never',
          children: 'never',
        },
      ],

      'react/jsx-sort-props': [
        'warn',
        {
          callbacksLast: true,
          shorthandLast: true,
          multiline: 'last',
          ignoreCase: true,
          noSortAlphabetically: false,
          reservedFirst: true,
          locale: 'auto',
        },
      ],

      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'enum',
          format: ['UPPER_CASE'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
        },
      ],

      '@next/next/no-img-element': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      'react/prop-types': 'off',
      'prefer-destructuring': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['next-env.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
];

export default eslintConfig;
