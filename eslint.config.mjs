import shopifyEslintPlugin from '@shopify/eslint-plugin';

const config = [
  ...shopifyEslintPlugin.configs.node,
  ...shopifyEslintPlugin.configs.typescript,
  ...shopifyEslintPlugin.configs.prettier,
  ...shopifyEslintPlugin.configs['typescript-type-checking'],
  {
    languageOptions: {
      parserOptions: {
        project: 'tsconfig.json',
      },
    },
    rules: {
      'no-console': 'off',
      'no-process-env': 'off',
      '@typescript-eslint/naming-convention': 'off',
      'line-comment-position': 'off',
      'import/no-cycle': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      'prettier/prettier': 'warn',
      'no-warning-comments': 'off',
    },
  },
];

export default config;
