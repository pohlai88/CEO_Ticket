import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "*.config.js",
      "*.config.mjs",
      "public/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": typescriptEslint,
      import: importPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // TypeScript - Strict Type Safety
      "@typescript-eslint/no-explicit-any": "off", // Allow any for flexibility
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off", // Too strict for React components
      "@typescript-eslint/no-non-null-assertion": "off", // Allow non-null assertions when needed
      "@typescript-eslint/prefer-nullish-coalescing": "off", // Don't enforce ?? over ||
      "@typescript-eslint/prefer-optional-chain": "off", // Don't enforce optional chaining
      "@typescript-eslint/consistent-type-imports": "off", // Don't enforce type imports separation

      // TypeScript - Async/Promise Best Practices
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            attributes: false, // Allow async handlers in JSX
          },
        },
      ],
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "off", // Don't warn about async without await
      "@typescript-eslint/promise-function-async": "off", // Don't enforce async keyword

      // Import Organization
      "import/order": "off", // Don't enforce import ordering
      "import/no-duplicates": "off",
      "import/newline-after-import": "off",

      // General Code Quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "warn",
      "no-var": "error",
    },
  },
  {
    // Specific rules for Next.js App Router
    files: ["app/**/*.ts", "app/**/*.tsx"],
    rules: {
      // Server Components don't need explicit return types
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
];
