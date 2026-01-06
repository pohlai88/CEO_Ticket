/**
 * ESLint Rule: canonical-purity
 * 
 * Constitutional Safeguard — Ensures canonical.ts remains pure data.
 * 
 * Violations:
 * - Import statements (except type-only imports)
 * - Function declarations or expressions
 * - Class declarations
 * - Conditional statements (if, switch, ternary)
 * - Loops (for, while, do-while)
 * - Try-catch blocks
 * - Dynamic property access
 * - Method calls (except `as const` type assertions)
 */

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce pure data-only exports in canonical.ts",
      category: "Constitutional Enforcement",
      recommended: true,
    },
    messages: {
      noImports: "canonical.ts must not contain imports (found: {{name}})",
      noFunctions: "canonical.ts must not contain functions",
      noClasses: "canonical.ts must not contain classes",
      noConditionals: "canonical.ts must not contain conditionals",
      noLoops: "canonical.ts must not contain loops",
      noTryCatch: "canonical.ts must not contain try-catch blocks",
      noDynamicAccess: "canonical.ts must not contain dynamic property access",
      noMethodCalls: "canonical.ts must not contain method calls (except type assertions)",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();
    
    // Only apply to canonical.ts
    if (!filename.endsWith("canonical.ts")) {
      return {};
    }

    return {
      // No imports (except type-only)
      ImportDeclaration(node) {
        if (node.importKind !== "type") {
          context.report({
            node,
            messageId: "noImports",
            data: { name: node.source.value },
          });
        }
      },

      // No function declarations
      FunctionDeclaration(node) {
        context.report({
          node,
          messageId: "noFunctions",
        });
      },

      // No arrow functions or function expressions
      ArrowFunctionExpression(node) {
        context.report({
          node,
          messageId: "noFunctions",
        });
      },

      FunctionExpression(node) {
        context.report({
          node,
          messageId: "noFunctions",
        });
      },

      // No classes
      ClassDeclaration(node) {
        context.report({
          node,
          messageId: "noClasses",
        });
      },

      ClassExpression(node) {
        context.report({
          node,
          messageId: "noClasses",
        });
      },

      // No conditionals
      IfStatement(node) {
        context.report({
          node,
          messageId: "noConditionals",
        });
      },

      SwitchStatement(node) {
        context.report({
          node,
          messageId: "noConditionals",
        });
      },

      ConditionalExpression(node) {
        context.report({
          node,
          messageId: "noConditionals",
        });
      },

      // No loops
      ForStatement(node) {
        context.report({
          node,
          messageId: "noLoops",
        });
      },

      ForInStatement(node) {
        context.report({
          node,
          messageId: "noLoops",
        });
      },

      ForOfStatement(node) {
        context.report({
          node,
          messageId: "noLoops",
        });
      },

      WhileStatement(node) {
        context.report({
          node,
          messageId: "noLoops",
        });
      },

      DoWhileStatement(node) {
        context.report({
          node,
          messageId: "noLoops",
        });
      },

      // No try-catch
      TryStatement(node) {
        context.report({
          node,
          messageId: "noTryCatch",
        });
      },

      // No dynamic property access (computed properties with variables)
      MemberExpression(node) {
        if (node.computed && node.property.type === "Identifier") {
          context.report({
            node,
            messageId: "noDynamicAccess",
          });
        }
      },

      // No method calls (except type assertions like `as const`)
      CallExpression(node) {
        // Allow `satisfies` helper pattern if needed
        const callee = node.callee;
        if (callee.type === "MemberExpression") {
          context.report({
            node,
            messageId: "noMethodCalls",
          });
        }
      },
    };
  },
};
