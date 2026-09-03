import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import tailwindcss from "eslint-plugin-tailwindcss";

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: ["coverage/**", ".husky/**"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  ...tailwindcss.configs["flat/recommended"],
  // Must stay last: it turns off every core rule that fights Prettier.
  prettierRecommended,
  {
    rules: {
      "tailwindcss/no-custom-classname": "off",
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          pathGroups: [
            { pattern: "react", group: "external", position: "before" },
            { pattern: "@/**", group: "internal" },
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "react/no-unescaped-entities": [
        "error",
        {
          forbid: [
            { char: ">", alternatives: ["&gt;"] },
            { char: "<", alternatives: ["&lt;"] },
            { char: "}", alternatives: ["&#125;"] },
            { char: "{", alternatives: ["&#123;"] },
          ],
        },
      ],
    },
  },
];

export default config;
