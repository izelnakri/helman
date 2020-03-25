export default {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      legacyDecorators: true,
    },
  },
  plugins: [],
  extends: ['eslint:recommended'],
  env: {
    browser: true,
    commonjs: true,
    node: true,
  },
  globals: {
    Buffer: true,
    Promise: true,
  },
  rules: {
    'no-console': 'off',
  },
};
