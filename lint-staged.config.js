const config = {
  "*.{js,jsx,ts,tsx,mjs}": ["eslint --fix", "vitest related --run"],
  "*.{ts,tsx}": () => "tsc -p tsconfig.json --noEmit",
};

export default config;
