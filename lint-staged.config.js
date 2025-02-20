const config = {
  "*.{js,jsx,ts,tsx}": ["eslint --fix"],
  "*.{js,jsx,ts,tsx}": ["vitest related --run"],
  "*.{ts,tsx}": () => "tsc -p tsconfig.json --noEmit",
};

export default config;
