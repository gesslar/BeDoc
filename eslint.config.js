export default[
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      "quotes": ["error", "double", { "avoidEscape": true, "allowTemplateLiterals": true }],
      "no-trailing-spaces": ["error"], // Prevent trailing spaces
      "eol-last": ["error", "always"], // Ensure a newline at the end of files
      "indent": ["error", 2],          // Enforce consistent indentation (e.g., 2 spaces)

      // No space before function parentheses
      "space-before-function-paren": ["error", "never"],

      // Enforce one true brace style
      "brace-style": ["error", "1tbs"],

      // Control keyword spacing
      "keyword-spacing": ["error", {
        "before": false, // No space before keywords
        "after": true,  // No space after keywords globally
        "overrides": {
          // Control statements
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
          "catch": { "before" : true, "after": false },
          "finally": { "before" : true, "after": true },
        }
      }]
    }
  }
];
