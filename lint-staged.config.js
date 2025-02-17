const config = {
  "*.{js,jsx,ts,tsx}": ["eslint --fix"],
  "*.{ts,tsx}": () => "tsc -p tsconfig.json --noEmit",
};

export default config;
