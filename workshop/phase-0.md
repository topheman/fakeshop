# Phase 0: Make the repo tell the truth

No Next.js feature work in this phase. It fixes the things that would make every later measurement unreliable: a build that skips type checking, a lint command that does not run, a commit hook that never lints, and an install that needs `--force`.

## The before state

Captured on the `workshop/phase-0` branch at `827243a`, clean tree, `.next` deleted first so the build is cold. Node 24.17.0, `next` 16.1.6, `react` 19.0.4.

### `npm run build` — passes

```
⚠ `eslint` configuration in next.config.mjs is no longer supported. See more info here: https://nextjs.org/docs/app/api-reference/cli/next#next-lint-options
⚠ Invalid next.config.mjs options detected:
⚠     Unrecognized key(s) in object: 'dynamicIO' at "experimental"
⚠     Unrecognized key(s) in object: 'eslint'
⚠ See more info here: https://nextjs.org/docs/messages/invalid-next-config
▲ Next.js 16.1.6 (Turbopack, Cache Components)
- Environments: .env
- Experiments (use with caution):
  ? dynamicIO (invalid experimental key)
  ✓ parallelServerBuildTraces
  ✓ parallelServerCompiles
  ✓ webpackBuildWorker

⚠ The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
  Creating an optimized production build ...
Turbopack build encountered 1 warnings:
./tailwind.config.js
Specified module format (EcmaScript Modules) is not matching the module format of the source code (CommonJs)
The EcmaScript module format was specified in the package.json that is affecting this source file or by using an special extension, but it looks like that CommonJs syntax is used in the source code.
Exports made by CommonJs syntax will lead to a runtime error, since the module is in EcmaScript mode. Either change the "type" field in the package.json or replace CommonJs syntax with EcmaScript import/export syntax in the source file.

✓ Compiled successfully in 1286.5ms
  Skipping validation of types
  Collecting page data using 13 workers ...
  Generating static pages using 13 workers (0/11) ...
* Home
  CategoryList
  > getCategories
  CustomQRCode
  > generateQRCode { url: 'https://thefakeshop.vercel.app/' }
* ProductGridLoading
* ProductGridLoading
  Generating static pages using 13 workers (2/11)
  Generating static pages using 13 workers (5/11)
* Home
  CategoryList
  > getCategories
  Generating static pages using 13 workers (8/11)
During prerendering, fetch() rejects when the prerender is complete. Typically these errors are handled by React but if you move fetch() to a different context by using `setTimeout`, `after`, or similar functions you may observe this error and you should handle it in that context. This occurred at route "/api/og".
* ProductGridLoading
* ProductGridLoading
✓ Generating static pages using 13 workers (11/11) in 400.2ms
  Finalizing page optimization ...

Route (app)           Revalidate  Expire
┌ ◐ /                        15m      1y
├ ◐ /_not-found
├ ◐ /account
├ ○ /api/hello/world
├ ƒ /api/og
├ ◐ /category/[slug]
│ └ /category/[slug]
├ ◐ /checkout
├ ◐ /login
├ ◐ /product/[slug]
│ └ /product/[slug]
└ ◐ /search


ƒ Proxy (Middleware)

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
ƒ  (Dynamic)            server-rendered on demand

npm run build  9.47s user 1.61s system 339% cpu 3.267 total
```

Cold wall-clock build: **3.267s**. Compile 1286.5ms, static generation of 11 pages 400.2ms across 13 workers.

### `npm run typecheck` — passes, 1.662s

No output. Note that this is `tsc` run by hand; the build itself printed `Skipping validation of types` and checked nothing.

### `npx vitest run` — passes

```
 ✓ src/utils/__tests__/cart.test.ts (5 tests) 2ms
 ✓ src/utils/__tests__/slugUtils.test.ts (6 tests) 1ms

 Test Files  2 passed (2)
      Tests  11 passed (11)
   Duration  469ms
```

### `npm run lint` — fails, and has since the Next 16 bump

```
> next lint
Invalid project directory provided, no such directory: /Users/tophe/projects/fakeshop/lint
```

`next lint` was removed in Next 16. The `lint` argument is now parsed as the directory to build, so the command does not fail because of a lint error, it fails because Next looked for a folder called `lint`. This is the finding that reshaped the phase, and it is covered under "Scope change" below.

## What the before state tells us

Six things the build output says that the written audit did not.

**The `eslint` key in `next.config.mjs` is already dead, not merely undesirable.** Next 16 prints `` `eslint` configuration in next.config.mjs is no longer supported `` and lists `eslint` among the unrecognized keys. So `ignoreDuringBuilds: true` is not what is suppressing lint during the build. Nothing suppresses it; there is simply no lint step in `next build` any more. Removing the key changes no behaviour, it only stops a warning.

**`typescript.ignoreBuildErrors` is the one escape hatch still doing real work.** `Skipping validation of types` is printed on every build because of it. `npm run typecheck` passing is what has been holding the line, and only because it is wired into a separate script.

**`experimental.dynamicIO` is rejected outright.** It shows as `? dynamicIO (invalid experimental key)`. The canary-era flag has been gone for a while; the app has been running on the top-level `cacheComponents: true` alone. The header confirms it: `Next.js 16.1.6 (Turbopack, Cache Components)`.

**The three webpack flags are still accepted and still pointless.** `webpackBuildWorker`, `parallelServerBuildTraces` and `parallelServerCompiles` all print with a `✓`, which reads as if they are doing something, but the same header line says Turbopack. They tune a bundler this build does not use.

**`tailwind.config.js` produces a Turbopack warning.** `package.json` has `"type": "module"`, so a `.js` file is ESM, but the config is written with `module.exports`. Turbopack is explicit that CommonJS exports in an ESM-typed file lead to a runtime error. It has not bitten yet because the config is read by PostCSS at build time rather than bundled, but it is a real mismatch and a one-line fix.

**The middleware deprecation warning is already printing.** `The "middleware" file convention is deprecated. Please use "proxy" instead.` That is phase 3, recorded here so the diff is visible when it goes away.

## Scope change: ESLint moves from phase 2 into phase 0

The plan put the ESLint flat-config migration in phase 2 and the CI workflow in phase 0. That ordering does not survive contact with the build output above.

Phase 0's job is to make the repo's own signals trustworthy, and CI is how that gets enforced. But a CI workflow that runs `npm run lint` today would fail on a missing directory, and a workflow that quietly omits the lint step would be a lie of exactly the kind this phase exists to remove. The `eslint` config key being unsupported in Next 16 seals it: there is no version of "turn off `ignoreDuringBuilds` and see what falls out" that produces lint output, because `next build` no longer lints at all.

So the flat config lands here, with the CI workflow that depends on it. Phase 2 keeps TypeScript 7, the Turbopack bundle analyzer and the open Tailwind 4 question.

## Task list

- [x] Record the before state
- [ ] ESLint 8 with `.eslintrc.json` to ESLint 9 flat config, `next lint` to `eslint`
- [ ] `.nvmrc` from Node 22 to 24.20.0
- [ ] Fix the duplicate key in `lint-staged.config.js`
- [ ] `lucide-react` 0.344.0 to 1.39.0, drop `--force` from the README
- [ ] Remove `eslint` and `typescript` escape hatches from `next.config.mjs`
- [ ] Add the CI workflow
