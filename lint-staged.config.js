const config = {
  "*.{js,jsx,ts,tsx,mjs}": ["eslint --fix", "vitest related --run"],
  "*.{ts,tsx}": () => "npm run typecheck",
};

export default config;
