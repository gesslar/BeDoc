const config = [
  // Base config for both JS and TS files
  {
    files: ["wip/**/*.[jt]s", "src/**/*.[jt]s"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      // Common style rules
      "quotes": ["error", "double"],
      "no-trailing-spaces": ["error"],
      "eol-last": ["error", "always"],
      "indent": ["error", 2],
      "space-before-function-paren": ["error", "never"],
      "brace-style": ["error", "1tbs"],
      "keyword-spacing": ["error", {
        "before": false,
        "after": true,
        "overrides": {
          "return": { "after": true },
          "if": { "after": false },
          "else": { "before": true, "after": true },
          "for": { "after": false },
          "while": { "after": false },
          "do": { "after": false },
          "switch": { "after": false },
          "case": { "after": false },
          "default": { "after": false },
          "throw": { "before": true, "after": false },

          // Exception handling
          "catch": { "before": true, "after": false },
          "finally": { "before": true, "after": true },
        }
      }]
    }
  },

  // TypeScript-specific config
  {
    files: ["wip/**/*.ts", "src/**/*.ts"],
    languageOptions: {
      parser: (await import("@typescript-eslint/parser")).default
    },
    plugins: {
      "@typescript-eslint": (await import("@typescript-eslint/eslint-plugin")).default
    },
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
] ;

export default config ;
