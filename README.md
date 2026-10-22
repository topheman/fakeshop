# FakeShop

FakeShop is a demo e-commerce website built with Next.js 16 and React 19, where I test the latest features of the framework, like React Server Components, server actions, streaming, progressive enhancement, Cache Components, partial prefetching and view transitions.

[👀 Checkout the live demo](https://thefakeshop.vercel.app).

[👨‍💻 Read the article I wrote on dev.to for more details about the project](https://dev.to/topheman/react-server-components-in-practice-building-a-fake-e-commerce-site-with-nextjs-15-latest-features-73p) — it describes the Next.js 15 version of the app, tagged [`v1.0.1`](https://github.com/topheman/fakeshop/releases/tag/v1.0.1). The upgrade to Next.js 16 is documented phase by phase in [`workshop/`](./workshop/README.md).

## Installation

```bash
npm install
npm run test:e2e:install # downloads Chromium and WebKit, once, for the end-to-end tests
```

## Running

- dev mode: `npm run dev`
- production mode: `npm run build && npm run start`

Go to [http://localhost:3000](http://localhost:3000) to see the app running.

## Testing

- unit tests: `npm run test`
- end-to-end tests: `npm run test:e2e`, or `npm run test:e2e:ui` for the Playwright UI

The end-to-end suite builds the app and serves it on a port between 3030 and 3129 derived from the checkout path (`E2E_PORT` overrides it), so it never collides with a dev server on 3000 — and it has to, because a dev server does not prefetch and the suite asserts on prefetched UI.

## Notes

- [T3 Code](https://t3.codes) worktrees run `scripts/setup-worktree.sh` from `t3.json` on creation: it installs dependencies and links the main checkout's `.env.local` when there is one.

- If you are using VSCode, the project is already configured to format the code on save using Eslint and Prettier.
- Precommit hooks are configured to run linting, formatting, tests and typechecking on the modified files.
