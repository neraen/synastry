// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      '_disabled/*',
      'compat-v2/*',
      'example/*',
      'miroir-v2/*',
      'refonte-miroir/*',
      'screens/*',
      'theme-astral/*',
      'theme-natal-native/*',
    ],
  },
  {
    // Règles React Compiler activées par eslint-config-expo 57 : signalées en
    // warning le temps de migrer le code existant (le compilateur ignore
    // simplement les composants concernés, sans casse au runtime).
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
    },
  },
]);
