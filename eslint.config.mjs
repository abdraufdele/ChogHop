import tseslint from 'typescript-eslint';

export default [
  { ignores: ['node_modules/**', '.npm-cache/**', 'coverage/**', '.next/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'] },
  ...tseslint.configs.recommended,
];
