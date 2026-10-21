import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",

      // React rules
      "react-hooks/exhaustive-deps": "off",
      "react/no-unescaped-entities": "off",

      // Next.js rules (plain <img> is used for game asset webp icons)
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",

      // General JavaScript rules
      "prefer-const": "off",
      "no-console": "off",
      "no-empty": "off",
      "no-case-declarations": "off"
    }
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts"
    ]
  }
];

export default eslintConfig;
