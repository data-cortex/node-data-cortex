module.exports = {
  "env": {
    "node": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    ecmaVersion: 6,
  },
  "rules": {
    "indent": 0,
    "linebreak-style": [
      "error",
      "unix"
    ],
    "semi": [
      "error",
      "always"
    ],
    "no-console": 0,
    "no-unused-expressions": ["error",{ allowShortCircuit: true }],
    "no-unused-vars": "warn"
  }
};
