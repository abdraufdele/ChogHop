import tseslint from 'typescript-eslint';

export default [
  { ignores: ['node_modules/**', '.npm-cache/**', 'coverage/**'] },
  ...tseslint.configs.recommended,
];
