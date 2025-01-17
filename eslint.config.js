import js from "@eslint/js"
// https://www.npmjs.com/package/eslint-plugin-jsdoc
import jsdoc from "eslint-plugin-jsdoc";
import stylisticJs from "@stylistic/eslint-plugin-js"

export default [
  js.configs.recommended,
  jsdoc.configs['flat/recommended'],
  {
    name: "gesslar/bedoc/ignores",
    ignores: ["docs/", "_docs/", "TODO/"],
  },
  {
    name: "gesslar/bedoc/languageOptions",
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        fetch: "readonly",
        Headers: "readonly",
      },
    },
  },
  {
    name: "gesslar/bedoc/lints",
    files: ["src/**/*.js", "examples/**/*.js"],
    plugins: {
      "@stylistic/js": stylisticJs,
      "jsdoc": jsdoc
    },
    rules: {
      "@stylistic/js/arrow-spacing": ["error", { before: true, after: true }],
      "@stylistic/js/brace-style": ["error", "1tbs"],
      "@stylistic/js/eol-last": ["error", "always"],
      "@stylistic/js/indent": ["error", 2, {
        SwitchCase: 1 // Indents `case` statements one level deeper than `switch`
      }],
      "@stylistic/js/key-spacing": ["error", { beforeColon: false, afterColon: true }],
      "@stylistic/js/keyword-spacing": ["error", {
        before: false,
        after: true,
        "overrides": {
          // Control statements
          "return":  { before: true, after: true },
          "if":      { after: false },
          "else":    { before: true, after: true },
          "for":     { after: false },
          "while":   { after: false },
          "do":      { after: false },
          "switch":  { after: false },
          "case":    { before: true, after: true },
          "throw":   { before: true, after: false } ,

          // Keywords
          "as":      { before: true, after: true },
          "of":      { before: true, after: true },
          "from":    { before: true, after: true },
          "async":   { before: true, after: true },
          "await":   { before: true, after: false },
          "class":   { before: true, after: true },
          "const":   { before: true, after: true },
          "let":     { before: true, after: true },
          "var":     { before: true, after: true },

          // Exception handling
          "catch":   { before: true, after: false },
          "finally": { before: true, after: true },
        }
      }],
      "@stylistic/js/max-len": ["warn", {
        code: 80,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        tabWidth: 2
      }],
      "@stylistic/js/no-tabs": "error",
      "@stylistic/js/no-trailing-spaces": ["error"],
      "@stylistic/js/quotes": ["error", "double", {
        avoidEscape: true, allowTemplateLiterals: true
      }],
      "@stylistic/js/semi": ["error", "never"],
      "@stylistic/js/space-before-function-paren": ["error", "never"],
      "@stylistic/js/yield-star-spacing": ["error", { before: true, after: false }],
      "constructor-super": "error",
      "no-unexpected-multiline": "error",
      "no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_+", "destructuredArrayIgnorePattern": "^_+", "varsIgnorePattern": "^_+"
      }],
      "no-useless-assignment": "error",

      // JSDoc
      "jsdoc/require-description": "warn"
    }
  }
]
