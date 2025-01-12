import stylisticJs from "@stylistic/eslint-plugin-js"

export default [
  {
    files: ["**/*.js"],
    ignores: ["docs/**/*.js", "_docs/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    plugins: {
      "@stylistic/js": stylisticJs
    },
    rules: {
      "@stylistic/js/quotes": ["error", "double", { "avoidEscape": true, "allowTemplateLiterals": true }],
      "@stylistic/js/no-trailing-spaces": ["error"], // Prevent trailing spaces
      "@stylistic/js/eol-last": ["error", "always"], // Ensure a newline at the end of files
      "@stylistic/js/indent": ["error", 2],          // Enforce consistent indentation (e.g., 2 spaces)
      "@stylistic/js/semi": ["error", "never"],
      "@stylistic/js/array-bracket-spacing": ["error", "never"],
      "no-unexpected-multiline": "error",
      "constructor-super": "error",

      // No space before function parentheses
      "@stylistic/js/space-before-function-paren": ["error", "never"],

      // Enforce one true brace style
      "@stylistic/js/brace-style": ["error", "1tbs"],

      // Control keyword spacing
      "@stylistic/js/keyword-spacing": ["error", {
        "before": false, // No space before keywords
        "after": true,  // No space after keywords globally
        "overrides": {
          // Control statements
          "return":  { "after": true },
          "if":      { "after": false },
          "else":    { "before": true, "after": true },
          "for":     { "after": false },
          "while":   { "after": false },
          "do":      { "after": false },
          "switch":  { "after": false },
          "case":    { "before": true, "after": true },
          "throw":   { "before": true, "after": false } ,

          // Keywords
          "as":      { "before": true, "after": true },
          "of":      { "before": true, "after": true },
          "from":    { "before": true, "after": true },
          "async":   { "before": true, "after": true },
          "await":   { "before": true, "after": false },
          "class":   { "before": true, "after": true },
          "const":   { "before": true, "after": true },
          "let":     { "before": true, "after": true },
          "var":     { "before": true, "after": true },

          // Exception handling
          "catch":   { "before": true, "after": false },
          "finally": { "before": true, "after": true },
        }
      }]
    }
  }
]
